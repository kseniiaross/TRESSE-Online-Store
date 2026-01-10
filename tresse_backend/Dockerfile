FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# requirements.txt УЖЕ в этой папке
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# копируем ВЕСЬ backend
COPY . .

CMD ["sh", "-c", "gunicorn tresse.wsgi:application --bind 0.0.0.0:${PORT:-8080}"]