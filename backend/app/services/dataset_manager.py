from __future__ import annotations

import base64
import imghdr
import re
import shutil
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.schemas import (
    ClassStats,
    DatasetPreviewResponse,
    DatasetStatsResponse,
    DatasetUploadResponse,
    DeleteClassResponse,
    DeleteFileResponse,
    PreviewImage,
    UploadedImage,
)
from app.storage import get_datasets_dir

INVALID_PATH_CHARS = re.compile(r"[\\/:\x00-\x1f]")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}


def ensure_data_dir() -> None:
    get_datasets_dir().mkdir(parents=True, exist_ok=True)


def get_dataset_stats() -> DatasetStatsResponse:
    ensure_data_dir()

    classes: list[ClassStats] = []
    total = 0
    data_dir = get_datasets_dir()

    for class_dir in sorted(path for path in data_dir.iterdir() if path.is_dir()):
        count = sum(1 for file in class_dir.iterdir() if file.is_file() and is_image_file(file))
        classes.append(ClassStats(name=class_dir.name, count=count))
        total += count

    return DatasetStatsResponse(classes=classes, total=total)


async def save_uploaded_files(class_name: str, files: list[UploadFile]) -> DatasetUploadResponse:
    ensure_data_dir()
    validate_path_segment(class_name, "class_name")

    if not files:
        raise ValueError("At least one file is required.")

    class_dir = get_datasets_dir() / class_name
    class_dir.mkdir(parents=True, exist_ok=True)

    uploaded: list[UploadedImage] = []

    for upload in files:
        original_name = Path(upload.filename or "").name
        if not original_name:
            raise ValueError("Uploaded file must have a filename.")

        validate_path_segment(original_name, "filename")
        extension = Path(original_name).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported image type for '{original_name}'.")

        content = await upload.read()
        if not content:
            raise ValueError(f"Uploaded file '{original_name}' is empty.")

        if imghdr.what(None, h=content) is None:
            raise ValueError(f"Uploaded file '{original_name}' is not a valid image.")

        target_path = build_unique_path(class_dir, original_name)
        target_path.write_bytes(content)
        uploaded.append(UploadedImage(filename=target_path.name, size_bytes=len(content)))
        await upload.close()

    return DatasetUploadResponse(
        class_name=class_name,
        uploaded=uploaded,
        saved_count=len(uploaded),
    )


def get_class_preview(class_name: str, limit: int) -> DatasetPreviewResponse:
    ensure_data_dir()
    validate_path_segment(class_name, "class_name")

    class_dir = get_datasets_dir() / class_name
    if not class_dir.exists() or not class_dir.is_dir():
        raise FileNotFoundError(f"Class '{class_name}' does not exist.")

    image_files = sorted(path for path in class_dir.iterdir() if path.is_file() and is_image_file(path))
    preview_items = [build_preview_image(path) for path in image_files[:limit]]

    return DatasetPreviewResponse(
        class_name=class_name,
        total=len(image_files),
        images=preview_items,
    )


def delete_class(class_name: str) -> DeleteClassResponse:
    ensure_data_dir()
    validate_path_segment(class_name, "class_name")

    class_dir = get_datasets_dir() / class_name
    if not class_dir.exists() or not class_dir.is_dir():
        raise FileNotFoundError(f"Class '{class_name}' does not exist.")

    removed_count = sum(1 for path in class_dir.rglob("*") if path.is_file())
    shutil.rmtree(class_dir)

    return DeleteClassResponse(
        deleted=True,
        class_name=class_name,
        removed_count=removed_count,
    )


def delete_image(class_name: str, filename: str) -> DeleteFileResponse:
    ensure_data_dir()
    validate_path_segment(class_name, "class_name")
    validate_path_segment(filename, "filename")

    file_path = get_datasets_dir() / class_name / filename
    if not file_path.exists() or not file_path.is_file():
        raise FileNotFoundError(f"Image '{filename}' does not exist in class '{class_name}'.")

    file_path.unlink()

    return DeleteFileResponse(
        deleted=True,
        class_name=class_name,
        filename=filename,
    )


def validate_path_segment(value: str, field_name: str) -> None:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field_name} cannot be empty.")
    if normalized in {".", ".."} or INVALID_PATH_CHARS.search(normalized):
        raise ValueError(f"{field_name} contains invalid path characters.")


def is_image_file(path: Path) -> bool:
    return path.name != ".gitkeep" and path.suffix.lower() in ALLOWED_EXTENSIONS


def build_unique_path(directory: Path, filename: str) -> Path:
    candidate = directory / filename
    if not candidate.exists():
        return candidate

    stem = Path(filename).stem
    suffix = Path(filename).suffix
    return directory / f"{stem}_{uuid4().hex[:8]}{suffix}"


def build_preview_image(path: Path) -> PreviewImage:
    size_bytes = path.stat().st_size

    try:
        with Image.open(path) as image:
            preview_image = ImageOps.exif_transpose(image)
            preview_image.thumbnail((256, 256))
            buffer = BytesIO()
            preview_image.save(buffer, format="PNG")
    except UnidentifiedImageError as exc:
        raise ValueError(f"Image '{path.name}' could not be decoded.") from exc

    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return PreviewImage(
        filename=path.name,
        size_bytes=size_bytes,
        preview_data_url=f"data:image/png;base64,{encoded}",
    )
