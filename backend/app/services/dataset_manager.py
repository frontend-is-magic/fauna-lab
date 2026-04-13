from pathlib import Path

from app.schemas import ClassStats, DatasetStatsResponse

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def get_dataset_stats() -> DatasetStatsResponse:
    classes: list[ClassStats] = []
    total = 0

    for class_dir in sorted(path for path in DATA_DIR.iterdir() if path.is_dir()):
        count = sum(1 for file in class_dir.iterdir() if file.is_file())
        classes.append(ClassStats(name=class_dir.name, count=count))
        total += count

    return DatasetStatsResponse(classes=classes, total=total)
