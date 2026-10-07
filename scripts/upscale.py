"""Upscale generated stills 2x with Real-ESRGAN (spandrel loader, Apple MPS)."""

from pathlib import Path

import numpy as np
import torch
from PIL import Image
from spandrel import ModelLoader

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "video/public/img"
DST = ROOT / "video/public/img2x"
DST.mkdir(exist_ok=True)

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
model = ModelLoader().load_from_file(str(ROOT / "data/models/RealESRGAN_x2.pth")).eval().to(device)


def run(img: Image.Image) -> Image.Image:
    x = torch.from_numpy(np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0).permute(2, 0, 1)[None].to(device)
    tile, pad = 384, 16
    _, _, h, w = x.shape
    out = torch.zeros((1, 3, h * 2, w * 2), device=device)
    with torch.no_grad():
        for y0 in range(0, h, tile):
            for x0 in range(0, w, tile):
                ya, yb = max(0, y0 - pad), min(h, y0 + tile + pad)
                xa, xb = max(0, x0 - pad), min(w, x0 + tile + pad)
                o = model(x[:, :, ya:yb, xa:xb])
                cy, cx = (y0 - ya) * 2, (x0 - xa) * 2
                th, tw = (min(h, y0 + tile) - y0) * 2, (min(w, x0 + tile) - x0) * 2
                out[:, :, y0 * 2:y0 * 2 + th, x0 * 2:x0 * 2 + tw] = o[:, :, cy:cy + th, cx:cx + tw]
    arr = (out[0].clamp(0, 1).permute(1, 2, 0).cpu().numpy() * 255.0 + 0.5).astype(np.uint8)
    return Image.fromarray(arr)


for f in sorted(SRC.glob("*.jpg")):
    dst = DST / f.name
    if dst.exists():
        continue
    src = Image.open(f)
    up = run(src)
    # Blend a little of the Lanczos result back in to keep painterly texture from looking plasticky.
    lz = src.convert("RGB").resize(up.size, Image.LANCZOS)
    Image.blend(up, lz, 0.18).save(dst, quality=93, subsampling=0)
    print(f.name, up.size, flush=True)
