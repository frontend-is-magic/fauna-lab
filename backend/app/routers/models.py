from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.schemas import ModelsListResponse
from app.services.model_registry import list_models

router = APIRouter()


@router.get("/list", response_model=ModelsListResponse)
async def models_list() -> ModelsListResponse:
    return list_models()


@router.get("/{model_id}/download")
async def models_download(model_id: str) -> FileResponse:
    raise HTTPException(status_code=501, detail=f"Model download placeholder for {model_id}")


@router.delete("/{model_id}")
async def models_delete(model_id: str) -> dict[str, bool | str]:
    return {"deleted": True, "model_id": model_id}
