from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.models.user import User
from app.schemas.job_application import ApplicationResponse, ApplicationStatusUpdate
from app.services.application_service import ApplicationService

router = APIRouter(tags=["Job Applications"])


class PipelineUpdateRequest(BaseModel):
    status: str
    note: str | None = None
    status_date: datetime | None = None
    interview_date: datetime | str | None = None
    offer_date: datetime | None = None
    remarks: str | None = None
    is_replacement: bool | None = None


@router.get(
    "/pipeline",
    response_model=dict[str, list[ApplicationResponse]],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_pipeline(
    job_role_id: int | None = Query(default=None),
    company_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, list[ApplicationResponse]]:
    print(f"[DEBUG] get_pipeline called with job_role_id={job_role_id}, company_id={company_id}")
    rows = ApplicationService.get_all(db, job_role_id=job_role_id, company_id=company_id)
    grouped: dict[str, list[ApplicationResponse]] = defaultdict(list)
    for row in rows:
        grouped[row.status].append(ApplicationResponse.model_validate(row))
    return dict(grouped)


@router.put(
    "/pipeline/{application_id}/mark-sent",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
)
def mark_pipeline_resume_sent(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> ApplicationResponse:
    # Security check: Ensure application belongs to the current user's company
    ApplicationService.get_by_id_for_company(db, application_id, current_user.company_id)
    
    application = ApplicationService.mark_resume_sent(db, application_id)
    return ApplicationResponse.model_validate(application)


@router.put(
    "/pipeline/{application_id}",
    response_model=ApplicationResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def update_pipeline_status(
    application_id: int,
    payload: PipelineUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "hr")),
) -> ApplicationResponse:
    # Security check: Ensure application belongs to the current user's company
    ApplicationService.get_by_id_for_company(db, application_id, current_user.company_id)
    
    application = ApplicationService.update_status(
        db,
        application_id,
        ApplicationStatusUpdate(
            status=payload.status, 
            note=payload.note,
            status_date=payload.status_date,
            interview_date=payload.interview_date,
            offer_date=payload.offer_date,
            remarks=payload.remarks,
            is_replacement=payload.is_replacement
        ),
        changed_by=current_user.id,
    )
    return ApplicationResponse.model_validate(application)
