from fastapi import APIRouter, HTTPException

from app.schemas import StorageSettingsResponse, StorageSettingsUpdateRequest
from app.storage import get_storage_settings, set_storage_root

router = APIRouter()


@router.get("/storage", response_model=StorageSettingsResponse)
async def settings_storage() -> StorageSettingsResponse:
    return get_storage_settings()


@router.put("/storage", response_model=StorageSettingsResponse)
async def settings_storage_update(payload: StorageSettingsUpdateRequest) -> StorageSettingsResponse:
    try:
        return set_storage_root(payload.storage_root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
