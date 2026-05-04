from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.security import get_current_user, require_role
from app.database.session import get_db
from app.schemas.candidate import (
    CandidateDetailResponse,
    CandidateResponse,
    CandidateStatsResponse,
    CandidateUpdate,
)
from app.services.candidate_service import CandidateService
from app.storage.local_storage import storage_service

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.get(
    "",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def list_candidates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=1000),
    search: str | None = Query(default=None),
    company_id: int | None = Query(default=None),
    job_role_id: int | None = Query(default=None),
    min_experience: float | None = Query(default=None),
    max_experience: float | None = Query(default=None),
    vendor_id: int | None = Query(default=None),
    unassigned_only: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> dict:
    items, total = CandidateService.get_all(
        db, 
        page=page, 
        page_size=page_size, 
        search=search, 
        company_id=company_id,
        job_role_id=job_role_id,
        min_experience=min_experience,
        max_experience=max_experience,
        vendor_id=vendor_id,
        unassigned_only=unassigned_only
    )
    return {
        "items": [CandidateResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get(
    "/stats",
    response_model=CandidateStatsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def candidate_stats(db: Session = Depends(get_db)) -> CandidateStatsResponse:
    stats = CandidateService.get_stats(db)
    return CandidateStatsResponse.model_validate(stats)


@router.get(
    "/{candidate_id}",
    response_model=CandidateDetailResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)) -> CandidateDetailResponse:
    candidate = CandidateService.get_by_id(db, candidate_id)
    return CandidateDetailResponse.model_validate(candidate)


@router.patch(
    "/{candidate_id}",
    response_model=CandidateResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    db: Session = Depends(get_db),
) -> CandidateResponse:
    candidate = CandidateService.update(db, candidate_id, payload)
    return CandidateResponse.model_validate(candidate)


@router.delete(
    "/{candidate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role("admin", "hr"))],
)
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)) -> Response:
    CandidateService.delete(db, candidate_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{candidate_id}/file",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_candidate_file(candidate_id: int, db: Session = Depends(get_db)) -> FileResponse:
    candidate = CandidateService.get_by_id(db, candidate_id)
    file_path = storage_service.get_candidate_file_path(candidate_id)
    if not file_path.exists():
        raise NotFoundException(message="Candidate resume file not found")
    ext = file_path.suffix.lower()
    mime_type = (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if ext == ".docx"
        else "application/pdf"
    )
    return FileResponse(path=file_path, filename=candidate.original_filename, media_type=mime_type)


@router.get(
    "/{candidate_id}/text",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def get_candidate_text(candidate_id: int, db: Session = Depends(get_db)) -> dict:
    candidate = CandidateService.get_by_id(db, candidate_id)
    return {
        "candidate_id": candidate.id,
        "raw_text": candidate.raw_text or "",
    }
