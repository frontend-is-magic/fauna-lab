from dataclasses import dataclass


@dataclass
class ModelBlueprint:
    arch: str
    num_classes: int


SUPPORTED_ARCHITECTURES = ("resnet18", "resnet50", "mobilenet_v2")
