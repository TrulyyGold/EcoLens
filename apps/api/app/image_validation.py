from __future__ import annotations

from io import BytesIO

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.errors import EcoLensError

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}
MAX_IMAGE_PIXELS = 25_000_000
READ_CHUNK_BYTES = 64 * 1024


async def read_and_validate_image(upload: UploadFile, max_bytes: int) -> tuple[bytes, str]:
    declared_type = (upload.content_type or "").lower().split(";", 1)[0].strip()
    if declared_type not in ALLOWED_CONTENT_TYPES:
        raise EcoLensError(
            "unsupported_image_type",
            "Only JPEG, PNG, and WebP images are accepted.",
            status_code=415,
            details={"allowed_content_types": sorted(ALLOWED_CONTENT_TYPES)},
        )

    data = bytearray()
    try:
        while chunk := await upload.read(READ_CHUNK_BYTES):
            data.extend(chunk)
            if len(data) > max_bytes:
                raise EcoLensError(
                    "image_too_large",
                    f"Image exceeds the {max_bytes}-byte upload limit.",
                    status_code=413,
                    details={"max_bytes": max_bytes},
                )
    finally:
        await upload.close()

    if not data:
        raise EcoLensError("invalid_image", "The uploaded image is empty.", status_code=422)

    try:
        with Image.open(BytesIO(data)) as opened:
            detected_format = (opened.format or "").upper()
            width, height = opened.size
            opened.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise EcoLensError(
            "invalid_image",
            "The file is not a valid, decodable image.",
            status_code=422,
        ) from exc

    expected_format = ALLOWED_CONTENT_TYPES[declared_type]
    if detected_format != expected_format:
        raise EcoLensError(
            "image_type_mismatch",
            "The uploaded bytes do not match the declared image content type.",
            status_code=415,
            details={"declared": declared_type, "detected_format": detected_format},
        )

    if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
        raise EcoLensError(
            "invalid_image_dimensions",
            "Image dimensions are invalid or exceed the 25-megapixel safety limit.",
            status_code=422,
            details={"width": width, "height": height, "max_pixels": MAX_IMAGE_PIXELS},
        )

    return bytes(
        data
    ), "image/jpeg" if detected_format == "JPEG" else f"image/{detected_format.lower()}"
