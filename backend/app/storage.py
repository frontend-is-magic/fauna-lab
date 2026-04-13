from __future__ import annotations

import json
import os
import platform
from functools import lru_cache
from pathlib import Path

from app.schemas import StorageSettingsResponse


APP_NAME = "FaunaLab"
SETTINGS_FILENAME = "settings.json"
REPO_ROOT = Path(__file__).resolve().parents[2]


@lru_cache(maxsize=1)
def get_app_config_dir() -> Path:
    configured_root = os.getenv("FAUNA_LAB_CONFIG_DIR")
    if configured_root:
        root = Path(configured_root).expanduser().resolve()
        root.mkdir(parents=True, exist_ok=True)
        return root

    system = platform.system()
    home = Path.home()

    if system == "Darwin":
        root = home / "Library" / "Application Support" / APP_NAME
    elif system == "Windows":
        appdata = os.getenv("APPDATA")
        root = Path(appdata) / APP_NAME if appdata else home / "AppData" / "Roaming" / APP_NAME
    else:
        root = home / ".local" / "share" / "fauna-lab"

    root.mkdir(parents=True, exist_ok=True)
    return root


def get_default_storage_root() -> Path:
    path = get_app_config_dir() / "storage"
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_settings_path() -> Path:
    return get_app_config_dir() / SETTINGS_FILENAME


def get_storage_settings() -> StorageSettingsResponse:
    env_override = os.getenv("FAUNA_LAB_STORAGE_DIR")
    if env_override:
        root = validate_storage_root(Path(env_override).expanduser())
        return StorageSettingsResponse(
            storage_root=str(root),
            source="env",
            env_override=True,
        )

    persisted = load_persisted_storage_root()
    if persisted is not None:
        return StorageSettingsResponse(
            storage_root=str(persisted),
            source="saved",
            env_override=False,
        )

    root = get_default_storage_root()
    return StorageSettingsResponse(
        storage_root=str(root),
        source="default",
        env_override=False,
    )


def get_storage_root() -> Path:
    return Path(get_storage_settings().storage_root)


def set_storage_root(storage_root: str) -> StorageSettingsResponse:
    root = validate_storage_root(Path(storage_root).expanduser())
    root.mkdir(parents=True, exist_ok=True)

    payload = {"storage_root": str(root)}
    get_settings_path().write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
    return get_storage_settings()


def get_datasets_dir() -> Path:
    path = get_storage_root() / "datasets"
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_checkpoints_dir() -> Path:
    path = get_storage_root() / "checkpoints"
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_metadata_dir() -> Path:
    path = get_storage_root() / "metadata"
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_persisted_storage_root() -> Path | None:
    settings_path = get_settings_path()
    if not settings_path.exists():
        return None

    payload = json.loads(settings_path.read_text(encoding="utf-8"))
    storage_root = payload.get("storage_root")
    if not storage_root:
        return None

    return validate_storage_root(Path(storage_root).expanduser())


def validate_storage_root(path: Path) -> Path:
    resolved = path.resolve()

    if is_relative_to(resolved, REPO_ROOT):
        raise ValueError("Storage directory must be outside the repository workspace.")

    return resolved


def is_relative_to(path: Path, other: Path) -> bool:
    try:
        path.relative_to(other)
        return True
    except ValueError:
        return False
