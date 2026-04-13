from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import dataset, inference, models, settings, train

app = FastAPI(
    title="Fauna Lab API",
    version="0.1.0",
    description="Local image classification backend for dataset management, training, and inference.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dataset.router, prefix="/api/dataset", tags=["dataset"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(train.router, prefix="/api/train", tags=["train"])
app.include_router(inference.router, prefix="/api/inference", tags=["inference"])
app.include_router(models.router, prefix="/api/models", tags=["models"])


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
