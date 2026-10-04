"""
Frilägg en person i en video: en mask per bild med Robust Video Matting (RVM) på grafikkortet.

Exporten av en inspelning (src/lib/recording/export.server.ts) kör skriptet med ComfyUI:s Python,
som har torch med CUDA. Masken skrivs förlustfritt (FFV1, gråskala) och har exakt samma bilder
som videon in, så att filmen kan sätta ihop kamera och mask bild för bild.

    python frilagg-video.py --in kamera.mp4 --out mask.mkv [--ffmpeg ffmpeg] [--bilder 27000]
                            [--mitt mask.json] [--modell sökväg] [--nedskalning 0.25] [--klump 8]

Med --mitt skrivs också var personen står (medianen av maskens tyngdpunkt och ytterkanter, i
bildpunkter), så att filmen kan placera den frilagda bilden med personen mitt i talarens yta eller hörnet.

Modellen (rvm_resnet50_fp16.torchscript, 54 MB, GPL-3.0, Peter Lin m.fl.) hämtas första gången till
modeller/rvm/ i datamappen (~/.presenter, eller PRESENTER_DATA) från projektets GitHub-släpp. Skriptet skriver "FRAMSTEG <bild> <av>" medan
det arbetar. Se docs/INSPELNING.md.
"""

import argparse
import json
import os
import statistics
import pathlib
import subprocess
import sys
import time
import urllib.request

import torch

MODEL_URL = "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_resnet50_fp16.torchscript"
def _model_default() -> pathlib.Path:
    """Datamappen (~/.presenter eller PRESENTER_DATA). En modell som redan finns i den äldre mappen på
    upphovspersonens datorer används i stället för att hämtas igen."""
    name = pathlib.Path("modeller") / "rvm" / "rvm_resnet50_fp16.torchscript"
    data = os.environ.get("PRESENTER_DATA")
    fresh = (pathlib.Path(data) if data else pathlib.Path.home() / ".presenter") / name
    legacy = pathlib.Path.home() / ".joelsai" / name
    return legacy if not data and not fresh.exists() and legacy.exists() else fresh


MODEL_DEFAULT = _model_default()


def ensure_model(path: pathlib.Path) -> pathlib.Path:
    if path.exists() and path.stat().st_size > 1_000_000:
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_suffix(".part")
    print("MODELL hämtar Robust Video Matting (54 MB)", flush=True)
    urllib.request.urlretrieve(MODEL_URL, part)
    part.replace(path)
    return path


def probe(ffmpeg: str, file: str) -> tuple[int, int, str]:
    ffprobe = str(pathlib.Path(ffmpeg).with_name("ffprobe" + pathlib.Path(ffmpeg).suffix))
    out = subprocess.run(
        [ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", file],
        capture_output=True, text=True, check=True,
    )
    stream = json.loads(out.stdout)["streams"][0]
    return int(stream["width"]), int(stream["height"]), stream["r_frame_rate"]


def read_exact(stream, view: memoryview) -> int:
    """Läs tills bufferten är full eller strömmen tar slut. Svarar med antal lästa byte."""
    got = 0
    while got < len(view):
        n = stream.readinto(view[got:])
        if not n:
            break
        got += n
    return got


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="source", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--bilder", type=int, default=0, help="antal bilder (för framstegen)")
    parser.add_argument("--modell", default=str(MODEL_DEFAULT))
    parser.add_argument("--nedskalning", type=float, default=0.0, help="RVM:s downsample_ratio; 0 = välj efter storleken")
    parser.add_argument("--klump", type=int, default=8, help="bilder per läsning ur ffmpeg")
    parser.add_argument("--mitt", default="", help="JSON-fil för var personen står")
    args = parser.parse_args()

    if not torch.cuda.is_available():
        print("Torch hittar inget grafikkort med CUDA.", file=sys.stderr)
        return 3
    model = torch.jit.load(str(ensure_model(pathlib.Path(args.modell))), map_location="cuda").eval()
    model = torch.jit.freeze(model)

    width, height, rate = probe(args.ffmpeg, args.source)
    # RVM:s rekommendation: 0,25 för 1080p, 0,4 för 720p, mer för små bilder.
    ratio = args.nedskalning or (0.25 if max(width, height) >= 1600 else 0.4 if max(width, height) >= 1000 else 0.6)

    decoder = subprocess.Popen(
        [args.ffmpeg, "-v", "error", "-i", args.source, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE, bufsize=0,
    )
    encoder = subprocess.Popen(
        [args.ffmpeg, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{width}x{height}", "-r", rate, "-i", "-",
         "-c:v", "ffv1", "-level", "3", "-slices", "16", "-slicecrc", "0", "-pix_fmt", "gray", args.out],
        stdin=subprocess.PIPE,
    )

    frame_bytes = width * height * 3
    chunk = max(1, args.klump)
    buffer = bytearray(frame_bytes * chunk)
    view = memoryview(buffer)
    recurrent = [None] * 4
    columns = torch.arange(width, device="cuda", dtype=torch.float32)
    centers, tops, bottoms, lefts, rights = [], [], [], [], []
    done = 0
    last_report = 0.0
    finished = False
    try:
        with torch.inference_mode():
            while True:
                got = read_exact(decoder.stdout, view)
                count = got // frame_bytes
                if count == 0:
                    break
                frames = torch.frombuffer(buffer, dtype=torch.uint8, count=count * frame_bytes)
                frames = frames.to("cuda", non_blocking=True).view(count, height, width, 3).permute(0, 3, 1, 2)
                # En bild i taget genom modellen: den bär minnet (recurrent) från bild till bild.
                # (Den sparade modellen klarar inte flera bilder på tidsaxeln i ett anrop.)
                masks = []
                for frame in frames:
                    _foreground, alpha, *recurrent = model(frame.unsqueeze(0).half().div_(255), *recurrent, ratio)
                    masks.append(alpha[0, 0])
                    # Var personen står, i var femte bild: tyngdpunkten i sidled och raderna med person i.
                    if (done + len(masks)) % 5 == 1:
                        plane = alpha[0, 0].float()
                        weight = plane.sum()
                        if weight > width * height * 0.01:
                            centers.append(float((plane.sum(dim=0) * columns).sum() / weight))
                            rows = torch.nonzero(plane.amax(dim=1) > 0.5).flatten()
                            if rows.numel():
                                tops.append(int(rows[0]))
                                bottoms.append(int(rows[-1]))
                            cols = torch.nonzero(plane.amax(dim=0) > 0.5).flatten()
                            if cols.numel():
                                lefts.append(int(cols[0]))
                                rights.append(int(cols[-1]))
                mask = torch.stack(masks).mul(255).round_().clamp_(0, 255).to(torch.uint8).cpu().numpy()
                encoder.stdin.write(mask.tobytes())
                done += count
                if time.monotonic() - last_report > 0.5:
                    last_report = time.monotonic()
                    print(f"FRAMSTEG {done} {args.bilder or done}", flush=True)
                if got < len(buffer):
                    break
        finished = True
    finally:
        # Vid ett fel står avkodaren och väntar på att få skriva: stäng den, annars låser sig allt.
        if not finished:
            decoder.kill()
        if encoder.stdin:
            encoder.stdin.close()
        decoder.wait()
        encoder.wait()
    print(f"FRAMSTEG {done} {args.bilder or done}", flush=True)
    if args.mitt:
        summary = {
            "width": width, "height": height, "frames": done,
            "center": round(statistics.median(centers)) if centers else width // 2,
            "top": round(statistics.median(tops)) if tops else 0,
            "bottom": round(statistics.median(bottoms)) if bottoms else height - 1,
            "left": round(statistics.median(lefts)) if lefts else 0,
            "right": round(statistics.median(rights)) if rights else width - 1,
        }
        pathlib.Path(args.mitt).write_text(json.dumps(summary), encoding="utf-8")
    if decoder.returncode != 0 or encoder.returncode != 0:
        print("ffmpeg kunde inte läsa videon eller skriva masken.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
