from __future__ import annotations

from datetime import datetime
from pathlib import Path

from app.schemas import ModelInfo, ModelsListResponse
from app.storage import get_checkpoints_dir


def list_models() -> ModelsListResponse:
    checkpoint_dir = get_checkpoints_dir()
    models = [
        build_model_info(path)
        for path in sorted(checkpoint_dir.glob("*.pt"), reverse=True)
        if path.is_file()
    ]
    return ModelsListResponse(models=models)


def get_model_path(model_id: str) -> Path:
    model_path = get_checkpoints_dir() / model_id
    if not model_path.exists() or not model_path.is_file():
        raise FileNotFoundError(f"Model '{model_id}' does not exist.")
    return model_path


def delete_model(model_id: str) -> dict[str, bool | str]:
    model_path = get_model_path(model_id)
    model_path.unlink()
    return {"deleted": True, "model_id": model_id}


def build_model_info(path: Path) -> ModelInfo:
    stat = path.stat()
    return ModelInfo(
        id=path.name,
        name=path.name,
        arch=path.stem.split("_", 1)[0] if "_" in path.stem else "unknown",
        num_classes=0,
        classes=[],
        accuracy=parse_accuracy(path.stem),
        created_at=datetime.fromtimestamp(stat.st_mtime),
        file_size=stat.st_size,
    )


def parse_accuracy(stem: str) -> float | None:
    parts = stem.rsplit("_", 1)
    if len(parts) != 2:
        return None
    try:
        return float(parts[1])
    except ValueError:
        return None
