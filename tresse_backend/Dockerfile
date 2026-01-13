FROM python:3.12-slim

WORKDIR /app

ARG CACHE_BUST=1

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

ARG CACHEBUST=20260112_01

COPY . /app
RUN python3 manage.py collectstatic --noinput

CMD ["sh", "-c", "python3 manage.py collectstatic --noinput && gunicorn tresse.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120"]