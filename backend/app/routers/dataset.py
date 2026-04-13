from fastapi import APIRouter, UploadFile

from app.schemas import DatasetStatsResponse
from app.services.dataset_manager import get_dataset_stats

router = APIRouter()


@router.post("/upload")
async def dataset_upload(class_name: str, files: list[UploadFile]) -> dict[str, int | str]:
    return {"class_name": class_name, "count": len(files)}


@router.get("/stats", response_model=DatasetStatsResponse)
async def dataset_stats() -> DatasetStatsResponse:
    return get_dataset_stats()


@router.get("/preview/{class_name}")
async def dataset_preview(class_name: str, limit: int = 20) -> dict[str, object]:
    return {"images": [], "class_name": class_name, "limit": limit}


@router.delete("/{class_name}")
async def dataset_delete_class(class_name: str) -> dict[str, bool | str]:
    return {"deleted": True, "class_name": class_name}


@router.delete("/{class_name}/{filename}")
async def dataset_delete_file(class_name: str, filename: str) -> dict[str, bool | str]:
    return {"deleted": True, "class_name": class_name, "filename": filename}
