FROM python:3.12-slim
WORKDIR /app

# Non-root user
RUN groupadd -r flask && useradd --no-log-init -r -g flask flask

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER flask
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "30", "app:app"]
