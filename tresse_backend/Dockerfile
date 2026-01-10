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

# requirements.txt лежит в tresse_backend/
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# копируем весь backend (контекст = tresse_backend)
COPY . .

CMD ["sh", "-c", "gunicorn tresse.wsgi:application --bind 0.0.0.0:${PORT:-8080}"]