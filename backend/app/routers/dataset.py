from fastapi import APIRouter, HTTPException, Query, UploadFile

from app.schemas import (
    DatasetPreviewResponse,
    DatasetStatsResponse,
    DatasetUploadResponse,
    DeleteClassResponse,
    DeleteFileResponse,
)
from app.services.dataset_manager import (
    delete_class,
    delete_image,
    get_class_preview,
    get_dataset_stats,
    save_uploaded_files,
)

router = APIRouter()


@router.post("/upload", response_model=DatasetUploadResponse)
async def dataset_upload(class_name: str, files: list[UploadFile]) -> DatasetUploadResponse:
    try:
        return await save_uploaded_files(class_name, files)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/stats", response_model=DatasetStatsResponse)
async def dataset_stats() -> DatasetStatsResponse:
    return get_dataset_stats()


@router.get("/preview/{class_name}", response_model=DatasetPreviewResponse)
async def dataset_preview(
    class_name: str,
    limit: int = Query(default=20, ge=1, le=50),
) -> DatasetPreviewResponse:
    try:
        return get_class_preview(class_name, limit)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{class_name}", response_model=DeleteClassResponse)
async def dataset_delete_class(class_name: str) -> DeleteClassResponse:
    try:
        return delete_class(class_name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{class_name}/{filename}", response_model=DeleteFileResponse)
async def dataset_delete_file(class_name: str, filename: str) -> DeleteFileResponse:
    try:
        return delete_image(class_name, filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
