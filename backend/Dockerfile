FROM python:3.11-slim AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    docker-cli \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
WORKDIR /app
COPY src/ /app/src/
COPY alembic.ini /app/
COPY alembic/ /app/alembic/

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app/src

# Run as root to access /var/run/docker.sock for forensic execution orchestration

EXPOSE 8000
CMD ["uvicorn", "src.api.main:asgi_app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
