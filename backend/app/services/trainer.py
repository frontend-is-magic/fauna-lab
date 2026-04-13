from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from uuid import uuid4

from app.schemas import EpochMetrics, TrainHistoryResponse, TrainRequest, TrainStatusResponse


@dataclass
class TrainingState:
    running: bool = False
    task_id: str | None = None
    current_epoch: int = 0
    total_epochs: int = 0
    history: list[EpochMetrics] = field(default_factory=list)


train_state = TrainingState()
train_lock = Lock()


def start_training(payload: TrainRequest) -> dict[str, str]:
    with train_lock:
        train_state.running = True
        train_state.task_id = str(uuid4())
        train_state.current_epoch = 0
        train_state.total_epochs = payload.epochs
        train_state.history = []

    return {
        "task_id": train_state.task_id or "",
        "message": "Training skeleton initialized. Background worker to be implemented."
    }


def stop_training() -> dict[str, bool]:
    with train_lock:
        train_state.running = False

    return {"stopped": True}


def get_training_status() -> TrainStatusResponse:
    with train_lock:
        return TrainStatusResponse(
            running=train_state.running,
            task_id=train_state.task_id,
            current_epoch=train_state.current_epoch,
            total_epochs=train_state.total_epochs,
        )


def get_training_history() -> TrainHistoryResponse:
    with train_lock:
        return TrainHistoryResponse(epochs=list(train_state.history))
