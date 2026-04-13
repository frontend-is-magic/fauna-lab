from fastapi import APIRouter

from app.schemas import TrainHistoryResponse, TrainRequest, TrainStatusResponse
from app.services.trainer import get_training_history, get_training_status, start_training, stop_training

router = APIRouter()


@router.post("/start")
async def train_start(payload: TrainRequest) -> dict[str, str]:
    return start_training(payload)


@router.get("/status", response_model=TrainStatusResponse)
async def train_status() -> TrainStatusResponse:
    return get_training_status()


@router.get("/history", response_model=TrainHistoryResponse)
async def train_history() -> TrainHistoryResponse:
    return get_training_history()


@router.post("/stop")
async def train_stop() -> dict[str, bool]:
    return stop_training()
