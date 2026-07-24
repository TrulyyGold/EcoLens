"""Generate simple EcoLens PNG placeholders using only the Python standard library."""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).parent


def write_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    rows = bytearray()
    stride = width * 4
    for y in range(height):
        rows.append(0)
        rows.extend(pixels[y * stride : (y + 1) * stride])
    payload = b"\x89PNG\r\n\x1a\n"
    payload += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    payload += chunk(b"IDAT", zlib.compress(bytes(rows), 9))
    payload += chunk(b"IEND", b"")
    path.write_bytes(payload)


def canvas(width: int, height: int, color: tuple[int, int, int, int]) -> bytearray:
    return bytearray(color * (width * height))


def paint_ellipse(
    pixels: bytearray,
    width: int,
    height: int,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    angle: float,
    color: tuple[int, int, int, int],
) -> None:
    cosine, sine = math.cos(angle), math.sin(angle)
    for y in range(max(0, int(cy - rx - ry)), min(height, int(cy + rx + ry) + 1)):
        for x in range(max(0, int(cx - rx - ry)), min(width, int(cx + rx + ry) + 1)):
            dx, dy = x - cx, y - cy
            local_x = dx * cosine + dy * sine
            local_y = -dx * sine + dy * cosine
            if (local_x / rx) ** 2 + (local_y / ry) ** 2 <= 1:
                index = (y * width + x) * 4
                pixels[index : index + 4] = bytes(color)


def make_mark(size: int, background: tuple[int, int, int, int]) -> bytearray:
    pixels = canvas(size, size, background)
    paint_ellipse(pixels, size, size, size * 0.5, size * 0.5, size * 0.34, size * 0.34, 0, (242, 245, 233, 255))
    paint_ellipse(pixels, size, size, size * 0.42, size * 0.48, size * 0.09, size * 0.22, -0.58, (104, 151, 86, 255))
    paint_ellipse(pixels, size, size, size * 0.58, size * 0.50, size * 0.08, size * 0.19, 0.64, (226, 181, 74, 255))
    paint_ellipse(pixels, size, size, size * 0.50, size * 0.64, size * 0.026, size * 0.19, 0, (22, 59, 46, 255))
    return pixels


write_png(ROOT / "icon.png", 1024, 1024, make_mark(1024, (22, 59, 46, 255)))
write_png(ROOT / "adaptive-icon.png", 1024, 1024, make_mark(1024, (22, 59, 46, 0)))

splash_width, splash_height = 1242, 2436
splash = canvas(splash_width, splash_height, (242, 245, 233, 255))
mark = make_mark(520, (22, 59, 46, 255))
left, top = (splash_width - 520) // 2, (splash_height - 520) // 2 - 100
for row in range(520):
    start = ((top + row) * splash_width + left) * 4
    splash[start : start + 520 * 4] = mark[row * 520 * 4 : (row + 1) * 520 * 4]
write_png(ROOT / "splash.png", splash_width, splash_height, splash)
