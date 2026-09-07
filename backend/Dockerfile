# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install CPU-only PyTorch first (saves ~1.5GB vs full CUDA build)
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY app/ ./app/
COPY data/ ./data/

# Render uses PORT env var (defaults to 10000)
ENV PORT=10000
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

EXPOSE ${PORT}

# Start uvicorn – bind to 0.0.0.0 on $PORT as Render expects
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1
