WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY tresse_backend/. .

ENV PYTHONUNBUFFERED=1
CMD gunicorn tresse.wsgi:application --bind 0.0.0.0:$PORT