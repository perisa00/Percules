"""Resize generated source images into small, versioned browser assets.

Original RGBA inputs are preserved separately for a guarded RunPod job.
This script performs format/size conversion, not image synthesis.
"""
from pathlib import Path
import hashlib
import json
import shutil
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
inputs = root / "outputs/galaxy-inputs"
assets = root / "public/assets/galaxy"
inputs.mkdir(parents=True, exist_ok=True)
assets.mkdir(parents=True, exist_ok=True)
names = {
    "face-on": "exec-cb8b235f-588a-4c86-82fb-c5531d0958b9.png",
    "oblique-runpod": "exec-a3a39091-fdf4-4bae-af7e-741a77e85177.png",
    "dust-detail": "exec-e0ba5d20-1ef2-4046-bd8b-b83cad4ff5ba.png",
}
report = {"generator": "OpenAI built-in image_gen", "runpod_submitted": False, "inputs": {}, "web": {}}
for name, file in names.items():
    data = (source / file).read_bytes()
    target = inputs / (name + ".png")
    shutil.copyfile(source / file, target)
    with Image.open(target) as image:
        alpha = image.convert("RGBA").getchannel("A")
        histogram = alpha.histogram()
        report["inputs"][name] = {"sha256": hashlib.sha256(data).hexdigest(), "width": image.width,
            "height": image.height, "transparent_fraction": sum(histogram[:16]) / (image.width * image.height),
            "solid_fraction": sum(histogram[240:]) / (image.width * image.height)}
for name, size, quality, source_name in [("face-on-v3", 1280, 76, "face-on"),
        ("face-on-mobile-v3", 768, 70, "face-on"), ("dust-detail-v1", 512, 73, "dust-detail")]:
    with Image.open(inputs / (source_name + ".png")) as image:
        image = image.resize((size, size), Image.Resampling.LANCZOS)
        target = assets / (name + ".webp")
        image.save(target, "WEBP", quality=quality, method=6)
    report["web"][target.name] = {"size": size, "bytes": target.stat().st_size}
(inputs / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
