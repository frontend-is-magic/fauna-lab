from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ClassStats(BaseModel):
    name: str
    count: int


class DatasetStatsResponse(BaseModel):
    classes: list[ClassStats]
    total: int


class UploadedImage(BaseModel):
    filename: str
    size_bytes: int


class DatasetUploadResponse(BaseModel):
    class_name: str
    uploaded: list[UploadedImage]
    saved_count: int


class PreviewImage(BaseModel):
    filename: str
    size_bytes: int
    preview_data_url: str


class DatasetPreviewResponse(BaseModel):
    class_name: str
    total: int
    images: list[PreviewImage]


class DeleteClassResponse(BaseModel):
    deleted: bool
    class_name: str
    removed_count: int


class DeleteFileResponse(BaseModel):
    deleted: bool
    class_name: str
    filename: str


class StorageSettingsResponse(BaseModel):
    storage_root: str
    source: str
    env_override: bool


class StorageSettingsUpdateRequest(BaseModel):
    storage_root: str


class TrainRequest(BaseModel):
    model_arch: str = Field(default="vit_b_16")
    epochs: int = Field(default=10, ge=1)
    lr: float = Field(default=1e-3, gt=0)
    batch_size: int = Field(default=16, ge=1)
    img_size: int = Field(default=224, ge=224, le=224)
    train_split: float = Field(default=0.8, gt=0, lt=1)


class TrainStatusResponse(BaseModel):
    running: bool
    task_id: str | None = None
    current_epoch: int = 0
    total_epochs: int = 0
    train_loss: float | None = None
    train_acc: float | None = None
    val_loss: float | None = None
    val_acc: float | None = None
    elapsed_seconds: float = 0
    eta_seconds: float | None = None


class EpochMetrics(BaseModel):
    epoch: int
    train_loss: float
    train_acc: float
    val_loss: float
    val_acc: float


class TrainHistoryResponse(BaseModel):
    epochs: list[EpochMetrics]


class PredictionResult(BaseModel):
    class_name: str
    confidence: float


class PredictResponse(BaseModel):
    predictions: list[PredictionResult]
    inference_time_ms: float


class ModelInfo(BaseModel):
    id: str
    name: str
    arch: str
    num_classes: int
    classes: list[str]
    accuracy: float | None = None
    created_at: datetime
    file_size: int


class ModelsListResponse(BaseModel):
    models: list[ModelInfo]
