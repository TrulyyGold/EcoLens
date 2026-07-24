FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

RUN addgroup --system ecolens && adduser --system --ingroup ecolens ecolens

WORKDIR /app
COPY apps/api/pyproject.toml ./
COPY apps/api/app ./app
RUN python -m pip install --upgrade pip && python -m pip install .

USER ecolens
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'"]
