FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    default-libmysqlclient-dev \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["sh", "-c", "cd /app || exit 1; if [ -d tresse ]; then echo 'Run from /app'; elif [ -d tresse_backend ]; then cd tresse_backend; echo 'Run from /app/tresse_backend'; else echo 'ERROR: no tresse/ or tresse_backend/ found in /app'; ls -la; exit 1; fi; gunicorn tresse.wsgi:application --bind 0.0.0.0:${PORT:-8080}"]