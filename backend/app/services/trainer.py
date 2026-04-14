from __future__ import annotations

import logging
import random
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from threading import Event, Lock, Thread
from typing import Any
from uuid import uuid4

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import models as tv_models
from torchvision.datasets import ImageFolder
from torchvision.transforms import Compose, Normalize, RandomHorizontalFlip, Resize, ToTensor

from app.schemas import EpochMetrics, TrainHistoryResponse, TrainRequest, TrainStatusResponse
from app.storage import get_checkpoints_dir, get_datasets_dir

logger = logging.getLogger(__name__)

TRAINING_MODEL_ARCH = "vit_b_16"
IMAGE_NET_MEAN = (0.485, 0.456, 0.406)
IMAGE_NET_STD = (0.229, 0.224, 0.225)
SUPPORTED_INPUT_ARCHITECTURES = {
    "vit_b_16",
    "simple_vit",
    "simple_vit_b16",
    "simple_vit_base",
    "simple_vit_small",
    "simple_vit_tiny",
    "simplevitb16",
    TRAINING_MODEL_ARCH,
}


class TrainingInProgressError(RuntimeError):
    pass


class TrainingDataError(RuntimeError):
    pass


class TrainingConfigError(RuntimeError):
    pass


@dataclass
class TrainingConfig:
    task_id: str
    arch: str
    epochs: int
    lr: float
    batch_size: int
    img_size: int
    train_split: float
    dataset_root: Path
    class_names: list[str]
    num_classes: int
    model: nn.Module
    device: torch.device
    freeze_backbone: bool = False
    weights_loaded: bool = False


@dataclass
class TrainingState:
    running: bool = False
    task_id: str | None = None
    current_epoch: int = 0
    total_epochs: int = 0
    train_loss: float | None = None
    train_acc: float | None = None
    val_loss: float | None = None
    val_acc: float | None = None
    elapsed_seconds: float = 0.0
    eta_seconds: float | None = None
    history: list[EpochMetrics] = field(default_factory=list)
    started_at_monotonic: float | None = None
    finished_at_monotonic: float | None = None
    stop_event: Event = field(default_factory=Event)
    worker: Thread | None = None
    last_error: str | None = None
    arch: str | None = None
    model_path: str | None = None
    class_names: list[str] = field(default_factory=list)
    best_val_acc: float | None = None


train_state = TrainingState()
train_lock = Lock()


def start_training(payload: TrainRequest) -> dict[str, str]:
    with train_lock:
        if train_state.running or (train_state.worker is not None and train_state.worker.is_alive()):
            raise TrainingInProgressError("Another training job is already running.")

        config = build_training_config(payload)

        train_state.running = True
        train_state.task_id = config.task_id
        train_state.current_epoch = 0
        train_state.total_epochs = config.epochs
        train_state.train_loss = None
        train_state.train_acc = None
        train_state.val_loss = None
        train_state.val_acc = None
        train_state.elapsed_seconds = 0.0
        train_state.eta_seconds = None
        train_state.history = []
        train_state.started_at_monotonic = time.monotonic()
        train_state.finished_at_monotonic = None
        train_state.stop_event = Event()
        train_state.worker = Thread(target=run_training_job, args=(config,), daemon=True)
        train_state.last_error = None
        train_state.arch = config.arch
        train_state.model_path = None
        train_state.class_names = list(config.class_names)
        train_state.best_val_acc = None
        train_state.worker.start()

        return {
            "task_id": config.task_id,
            "message": "Training job started.",
        }


def stop_training() -> dict[str, bool]:
    with train_lock:
        if not train_state.running and (train_state.worker is None or not train_state.worker.is_alive()):
            return {"stopped": False}

        train_state.stop_event.set()

    return {"stopped": True}


def get_training_status() -> TrainStatusResponse:
    with train_lock:
        elapsed_seconds = compute_elapsed_seconds(train_state.started_at_monotonic, train_state.finished_at_monotonic)
        eta_seconds = compute_eta_seconds(train_state.history, train_state.total_epochs, train_state.running, elapsed_seconds)

        train_state.elapsed_seconds = elapsed_seconds
        train_state.eta_seconds = eta_seconds

        return TrainStatusResponse(
            running=train_state.running,
            task_id=train_state.task_id,
            current_epoch=train_state.current_epoch,
            total_epochs=train_state.total_epochs,
            train_loss=train_state.train_loss,
            train_acc=train_state.train_acc,
            val_loss=train_state.val_loss,
            val_acc=train_state.val_acc,
            elapsed_seconds=elapsed_seconds,
            eta_seconds=eta_seconds,
        )


def get_training_history() -> TrainHistoryResponse:
    with train_lock:
        return TrainHistoryResponse(epochs=list(train_state.history))


def build_training_config(payload: TrainRequest) -> TrainingConfig:
    arch = normalize_architecture(payload.model_arch)
    dataset_root = get_datasets_dir()
    try:
        dataset = ImageFolder(root=str(dataset_root))
    except FileNotFoundError as exc:
        raise TrainingDataError("No usable image classes were found in the dataset directory.") from exc

    if len(dataset.classes) < 2:
        raise TrainingDataError("At least two classes are required for training.")

    class_counts = count_class_samples(dataset.targets)
    if any(count < 2 for count in class_counts.values()):
        raise TrainingDataError("Each class must contain at least two images to create train and validation splits.")

    model, device, freeze_backbone, weights_loaded = build_model(len(dataset.classes), payload.img_size)

    return TrainingConfig(
        task_id=str(uuid4()),
        arch=arch,
        epochs=payload.epochs,
        lr=payload.lr,
        batch_size=payload.batch_size,
        img_size=payload.img_size,
        train_split=payload.train_split,
        dataset_root=dataset_root,
        class_names=list(dataset.classes),
        num_classes=len(dataset.classes),
        model=model,
        device=device,
        freeze_backbone=freeze_backbone,
        weights_loaded=weights_loaded,
    )


def run_training_job(config: TrainingConfig) -> None:
    try:
        train_dataset, val_dataset = build_datasets(config)
        train_indices, val_indices = stratified_split_indices(train_dataset, config.train_split)

        train_loader = DataLoader(
            Subset(train_dataset, train_indices),
            batch_size=config.batch_size,
            shuffle=True,
            num_workers=0,
        )
        val_loader = DataLoader(
            Subset(val_dataset, val_indices),
            batch_size=config.batch_size,
            shuffle=False,
            num_workers=0,
        )

        optimizer = torch.optim.Adam(filter(lambda parameter: parameter.requires_grad, config.model.parameters()), lr=config.lr)
        criterion = nn.CrossEntropyLoss()

        best_val_acc = float("-inf")
        best_model_path: Path | None = None

        for epoch in range(1, config.epochs + 1):
            if train_state.stop_event.is_set():
                break

            epoch_started = time.monotonic()
            train_loss, train_acc = run_single_epoch(
                model=config.model,
                loader=train_loader,
                criterion=criterion,
                optimizer=optimizer,
                device=config.device,
                training=True,
            )
            if train_state.stop_event.is_set():
                break
            val_loss, val_acc = run_single_epoch(
                model=config.model,
                loader=val_loader,
                criterion=criterion,
                optimizer=None,
                device=config.device,
                training=False,
            )
            epoch_elapsed = time.monotonic() - epoch_started

            with train_lock:
                train_state.current_epoch = epoch
                train_state.train_loss = train_loss
                train_state.train_acc = train_acc
                train_state.val_loss = val_loss
                train_state.val_acc = val_acc
                train_state.history.append(
                    EpochMetrics(
                        epoch=epoch,
                        train_loss=train_loss,
                        train_acc=train_acc,
                        val_loss=val_loss,
                        val_acc=val_acc,
                    )
                )
                train_state.elapsed_seconds = compute_elapsed_seconds(
                    train_state.started_at_monotonic,
                    None,
                )
                train_state.eta_seconds = compute_eta_seconds(
                    train_state.history,
                    config.epochs,
                    True,
                    train_state.elapsed_seconds,
                )

            if val_acc >= best_val_acc:
                previous_best_path = best_model_path
                best_val_acc = val_acc
                best_model_path = save_checkpoint(
                    config=config,
                    epoch=epoch,
                    train_loss=train_loss,
                    train_acc=train_acc,
                    val_loss=val_loss,
                    val_acc=val_acc,
                    history=list(train_state.history),
                )
                if previous_best_path is not None and previous_best_path != best_model_path:
                    previous_best_path.unlink(missing_ok=True)
                with train_lock:
                    train_state.model_path = str(best_model_path)
                    train_state.best_val_acc = val_acc

            logger.info(
                "Training epoch %s/%s finished in %.2fs (train_loss=%.4f, train_acc=%.4f, val_loss=%.4f, val_acc=%.4f)",
                epoch,
                config.epochs,
                epoch_elapsed,
                train_loss,
                train_acc,
                val_loss,
                val_acc,
            )

        with train_lock:
            train_state.running = False
            train_state.finished_at_monotonic = time.monotonic()
            train_state.elapsed_seconds = compute_elapsed_seconds(
                train_state.started_at_monotonic,
                train_state.finished_at_monotonic,
            )
            train_state.eta_seconds = 0.0
            train_state.worker = None
            if train_state.current_epoch >= train_state.total_epochs and train_state.total_epochs > 0:
                train_state.current_epoch = train_state.total_epochs
            if best_model_path is not None:
                train_state.model_path = str(best_model_path)
            if train_state.stop_event.is_set():
                logger.info("Training job %s stopped by request.", config.task_id)
            else:
                logger.info("Training job %s completed.", config.task_id)
    except Exception as exc:
        logger.exception("Training job %s failed.", config.task_id)
        with train_lock:
            train_state.running = False
            train_state.finished_at_monotonic = time.monotonic()
            train_state.elapsed_seconds = compute_elapsed_seconds(
                train_state.started_at_monotonic,
                train_state.finished_at_monotonic,
            )
            train_state.eta_seconds = 0.0
            train_state.worker = None
            train_state.last_error = str(exc)
            if not train_state.history:
                train_state.current_epoch = 0


def build_datasets(config: TrainingConfig) -> tuple[ImageFolder, ImageFolder]:
    train_transform = Compose(
        [
            Resize((config.img_size, config.img_size)),
            RandomHorizontalFlip(),
            ToTensor(),
            Normalize(mean=IMAGE_NET_MEAN, std=IMAGE_NET_STD),
        ]
    )
    val_transform = Compose(
        [
            Resize((config.img_size, config.img_size)),
            ToTensor(),
            Normalize(mean=IMAGE_NET_MEAN, std=IMAGE_NET_STD),
        ]
    )

    train_dataset = ImageFolder(root=str(config.dataset_root), transform=train_transform)
    val_dataset = ImageFolder(root=str(config.dataset_root), transform=val_transform)
    return train_dataset, val_dataset


def stratified_split_indices(dataset: ImageFolder, train_split: float) -> tuple[list[int], list[int]]:
    class_to_indices: dict[int, list[int]] = defaultdict(list)
    for index, label in enumerate(dataset.targets):
        class_to_indices[int(label)].append(index)

    rng = random.Random(42)
    train_indices: list[int] = []
    val_indices: list[int] = []

    for indices in class_to_indices.values():
        shuffled = list(indices)
        rng.shuffle(shuffled)

        train_count = int(round(len(shuffled) * train_split))
        train_count = max(1, min(train_count, len(shuffled) - 1))
        val_count = len(shuffled) - train_count
        if val_count <= 0:
            val_count = 1
            train_count = len(shuffled) - 1

        train_indices.extend(shuffled[:train_count])
        val_indices.extend(shuffled[train_count:train_count + val_count])

    if not train_indices or not val_indices:
        raise TrainingDataError("Unable to create non-empty train and validation splits from the dataset.")

    rng.shuffle(train_indices)
    rng.shuffle(val_indices)
    return train_indices, val_indices


def run_single_epoch(
    *,
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    training: bool,
) -> tuple[float, float]:
    if training:
        model.train()
    else:
        model.eval()

    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        if train_state.stop_event.is_set():
            break

        images = images.to(device)
        labels = labels.to(device)

        if training:
            assert optimizer is not None
            optimizer.zero_grad(set_to_none=True)
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
        else:
            with torch.no_grad():
                outputs = model(images)
                loss = criterion(outputs, labels)

        batch_size = labels.size(0)
        total_loss += loss.item() * batch_size
        predictions = outputs.argmax(dim=1)
        correct += (predictions == labels).sum().item()
        total += batch_size

    if total == 0:
        if train_state.stop_event.is_set():
            return 0.0, 0.0
        raise TrainingDataError("Dataset split produced an empty batch set.")

    return total_loss / total, correct / total


def build_model(num_classes: int, image_size: int) -> tuple[nn.Module, torch.device, bool, bool]:
    device = detect_device()
    if image_size != 224:
        raise TrainingConfigError("torchvision vit_b_16 currently requires img_size=224.")

    weights = tv_models.ViT_B_16_Weights.DEFAULT
    checkpoint_name = Path(weights.url).name
    checkpoint_path = Path(torch.hub.get_dir()) / "checkpoints" / checkpoint_name

    weights_loaded = checkpoint_path.exists()
    if weights_loaded:
        model = tv_models.vit_b_16(weights=tv_models.ViT_B_16_Weights.DEFAULT)
    else:
        logger.info("No cached vit_b_16 weights found, using torchvision ViT with random initialization.")
        model = tv_models.vit_b_16(weights=None)

    hidden_dim = model.heads.head.in_features
    model.heads.head = nn.Linear(hidden_dim, num_classes)

    freeze_backbone = weights_loaded
    if freeze_backbone:
        for name, parameter in model.named_parameters():
            if not name.startswith("heads."):
                parameter.requires_grad = False

    model.to(device)
    return model, device, freeze_backbone, weights_loaded


def save_checkpoint(
    *,
    config: TrainingConfig,
    epoch: int,
    train_loss: float,
    train_acc: float,
    val_loss: float,
    val_acc: float,
    history: list[EpochMetrics],
) -> Path:
    checkpoint_dir = get_checkpoints_dir()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{config.arch}_{timestamp}_{val_acc:.2f}.pt"
    target_path = checkpoint_dir / filename
    temp_path = checkpoint_dir / f".{filename}.tmp"

    payload: dict[str, Any] = {
        "task_id": config.task_id,
        "arch": config.arch,
        "epoch": epoch,
        "num_classes": config.num_classes,
        "class_names": config.class_names,
        "image_size": config.img_size,
        "train_split": config.train_split,
        "lr": config.lr,
        "batch_size": config.batch_size,
        "weights_loaded": config.weights_loaded,
        "freeze_backbone": config.freeze_backbone,
        "train_loss": train_loss,
        "train_acc": train_acc,
        "val_loss": val_loss,
        "val_acc": val_acc,
        "history": [metrics.model_dump() for metrics in history],
        "state_dict": config.model.state_dict(),
        "trained_at": datetime.utcnow().isoformat() + "Z",
    }

    try:
        torch.save(payload, temp_path, _use_new_zipfile_serialization=False)
        temp_path.replace(target_path)
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)

    return target_path


def normalize_architecture(arch: str) -> str:
    normalized = arch.strip().lower()
    if normalized in SUPPORTED_INPUT_ARCHITECTURES or normalized == "simple-vit":
        return TRAINING_MODEL_ARCH
    raise TrainingConfigError(f"Unsupported architecture: {arch}")


def count_class_samples(targets: list[int]) -> dict[int, int]:
    counts: dict[int, int] = defaultdict(int)
    for target in targets:
        counts[int(target)] += 1
    return counts


def detect_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")

    mps_backend = getattr(torch.backends, "mps", None)
    if mps_backend is not None and mps_backend.is_available():
        return torch.device("mps")

    return torch.device("cpu")


def compute_elapsed_seconds(started_at_monotonic: float | None, finished_at_monotonic: float | None) -> float:
    if started_at_monotonic is None:
        return 0.0
    end_time = finished_at_monotonic if finished_at_monotonic is not None else time.monotonic()
    return max(0.0, end_time - started_at_monotonic)


def compute_eta_seconds(
    history: list[EpochMetrics],
    total_epochs: int,
    running: bool,
    elapsed_seconds: float,
) -> float | None:
    if not running:
        return 0.0 if total_epochs > 0 else None
    if not history:
        return None

    average_epoch_seconds = max(0.1, elapsed_seconds / len(history))
    remaining_epochs = max(0, total_epochs - len(history))
    return average_epoch_seconds * remaining_epochs
