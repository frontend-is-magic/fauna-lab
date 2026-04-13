from app.schemas import ModelsListResponse


def list_models() -> ModelsListResponse:
    return ModelsListResponse(models=[])
