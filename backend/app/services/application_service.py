from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException, NotFoundException
from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.job_application import JobApplication
from app.models.job_role import JobRole
from app.schemas.job_application import ApplicationCreate, ApplicationStatusUpdate


class ApplicationService:
    ALL_STATUSES = {"pending", "shortlisted", "interview_scheduled", "interviewed", "selected", "rejected", "on_hold", "dropped", "not_joined"}
    VALID_TRANSITIONS: dict[str, set[str]] = {
        "pending": ALL_STATUSES,
        "shortlisted": ALL_STATUSES,
        "interview_scheduled": ALL_STATUSES,
        "interviewed": ALL_STATUSES,
        "selected": ALL_STATUSES,
        "rejected": ALL_STATUSES,
        "on_hold": ALL_STATUSES,
        "dropped": ALL_STATUSES,
        "not_joined": ALL_STATUSES,
    }

    VALID_SOURCES = {"direct", "referral", "consultancy", "linkedin", "indeed", "internshala"}

    @staticmethod
    def create(db: Session, payload: ApplicationCreate, submitted_by: int | None) -> JobApplication:
        candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
        if candidate is None:
            raise NotFoundException(message="Candidate not found")

        role = db.query(JobRole).filter(JobRole.id == payload.job_role_id).first()
        if role is None:
            raise NotFoundException(message="Job role not found")

        source = payload.source.strip().lower()
        if source not in ApplicationService.VALID_SOURCES:
            raise AppException(
                message="Invalid source",
                detail="Allowed values are: direct, referral, consultancy",
                status_code=422,
            )

        application = JobApplication(
            candidate_id=payload.candidate_id,
            job_role_id=payload.job_role_id,
            submitted_by=submitted_by,
            source=source,
            consultancy_name=payload.consultancy_name if source == "consultancy" else None,
            remarks=payload.remarks,
            status="pending",
            resume_sent=False,
            is_replacement=False,
        )
        db.add(application)
        db.commit()
        db.refresh(application)
        return application

    @staticmethod
    def get_by_id(db: Session, application_id: int) -> JobApplication:
        application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
        if application is None:
            raise NotFoundException(message="Application not found")
        return application

    @staticmethod
    def get_all(
        db: Session,
        status: str | None = None,
        job_role_id: int | None = None,
        candidate_id: int | None = None,
        company_id: int | None = None,
    ) -> list[JobApplication]:
        query = db.query(JobApplication).options(
            joinedload(JobApplication.candidate).joinedload(Candidate.uploader_vendor)
        )
        
        # Additive filtering for strict isolation
        if company_id is not None:
            query = query.join(JobRole, JobApplication.job_role_id == JobRole.id)
            query = query.filter(JobRole.company_id == company_id)
            
        if job_role_id is not None:
            query = query.filter(JobApplication.job_role_id == job_role_id)
            
        if status:
            query = query.filter(JobApplication.status == status.strip().lower())
        
        if job_role_id is not None:
            query = query.filter(JobApplication.job_role_id == job_role_id)
            
        if candidate_id is not None:
            query = query.filter(JobApplication.candidate_id == candidate_id)
            
        return query.order_by(JobApplication.created_at.desc()).all()

    @staticmethod
    def get_by_id_for_company(db: Session, application_id: int, company_id: int | None) -> JobApplication:
        query = (
            db.query(JobApplication)
            .join(JobRole, JobApplication.job_role_id == JobRole.id)
            .filter(JobApplication.id == application_id)
        )
        
        if company_id is not None:
            query = query.filter(JobRole.company_id == company_id)
            
        application = query.first()
        if application is None:
            raise NotFoundException(message="Application not found or access denied")
        return application

    @staticmethod
    def update_status(
        db: Session,
        application_id: int,
        payload: ApplicationStatusUpdate,
        changed_by: int | None,
    ) -> JobApplication:
        application = ApplicationService.get_by_id(db, application_id)
        role = application.job_role
        current_status = application.status
        next_status = payload.status.strip().lower()

        # Determine valid statuses for this role
        base_valid_statuses = {"dropped", "not_joined", "rejected", "selected", "shortlisted", "pending"}
        
        valid_statuses = set(ApplicationService.VALID_TRANSITIONS.keys())
        if role and role.pipeline_stages:
            valid_statuses = {s["id"].lower() for s in role.pipeline_stages if isinstance(s, dict) and "id" in s}
            valid_statuses.update(base_valid_statuses)
        
        if next_status not in valid_statuses:
            allowed_list = ", ".join(sorted(list(valid_statuses)))
            raise AppException(
                message="Invalid status for this job role",
                detail=f"Allowed values are: {allowed_list}",
                status_code=422,
            )

        # Allow any move if valid. Enforce only for standard pipeline if role has no stages.
        if not (role and role.pipeline_stages):
            allowed_next = ApplicationService.VALID_TRANSITIONS.get(current_status, set())
            if next_status != current_status and next_status not in allowed_next:
                raise AppException(
                    message="Invalid status transition",
                    detail=f"Cannot move from {current_status} to {next_status}",
                    status_code=422,
                )

        # Replacement candidate detection
        if payload.is_replacement is not None:
            application.is_replacement = payload.is_replacement
        elif next_status == "selected" and current_status != "selected":
            # Count candidates who were selected but then lost (dropped, rejected, etc.)
            other_selected_filled_then_lost = (
                db.query(ActivityLog.application_id)
                .join(JobApplication, ActivityLog.application_id == JobApplication.id)
                .filter(
                    JobApplication.job_role_id == application.job_role_id,
                    JobApplication.id != application.id,
                    ActivityLog.new_status == "selected",
                    JobApplication.status != "selected" 
                )
                .distinct()
                .count()
            )
            
            # Count candidates who were already marked as replacements for this role
            already_replacements_count = (
                db.query(JobApplication)
                .filter(
                    JobApplication.job_role_id == application.job_role_id,
                    JobApplication.id != application.id,
                    JobApplication.is_replacement == True
                )
                .count()
            )
            
            # Only auto-mark as replacement if there are open "replacement slots"
            if other_selected_filled_then_lost > already_replacements_count:
                application.is_replacement = True

        application.status = next_status
        application.status_date = payload.status_date or datetime.now(timezone.utc)
        
        if payload.interview_date is not None:
            if payload.interview_date == "clear":
                application.interview_date = None
            else:
                application.interview_date = payload.interview_date
        if payload.offer_date is not None:
            application.offer_date = payload.offer_date
        if payload.remarks is not None:
            application.remarks = payload.remarks

        log = ActivityLog(
            application_id=application.id,
            changed_by=changed_by,
            old_status=current_status,
            new_status=next_status,
            note=payload.note,
            scheduled_date=application.status_date, # Use the synchronized status_date we just set
        )
        db.add(log)
        db.commit()
        db.refresh(application)
        return application

    @staticmethod
    def mark_resume_sent(db: Session, application_id: int) -> JobApplication:
        application = ApplicationService.get_by_id(db, application_id)
        application.resume_sent = True
        application.resume_sent_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(application)
        return application

    @staticmethod
    def get_timeline(db: Session, application_id: int) -> list[ActivityLog]:
        _ = ApplicationService.get_by_id(db, application_id)
        timeline = (
            db.query(ActivityLog)
            .filter(ActivityLog.application_id == application_id)
            .order_by(ActivityLog.created_at.asc())
            .all()
        )
        return timeline
