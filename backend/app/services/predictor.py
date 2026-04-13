from app.schemas import PredictResponse, PredictionResult


def predict_placeholder(filename: str, model_id: str, top_k: int) -> PredictResponse:
    return PredictResponse(
        predictions=[
            PredictionResult(
                class_name=f"placeholder:{filename}:{model_id}:{top_k}",
                confidence=0.0,
            )
        ],
        inference_time_ms=0.0,
    )
