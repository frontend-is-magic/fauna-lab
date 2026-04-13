from fastapi import APIRouter, File, Form, UploadFile

from app.schemas import PredictResponse
from app.services.predictor import predict_placeholder

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
async def inference_predict(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    top_k: int = Form(3),
) -> PredictResponse:
    return predict_placeholder(filename=file.filename or "unknown", model_id=model_id, top_k=top_k)
