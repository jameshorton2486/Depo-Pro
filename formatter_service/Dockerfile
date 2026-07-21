FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

RUN apt-get update \
    && apt-get install --yes --no-install-recommends libreoffice-writer fonts-liberation fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY formatter_service/requirements.txt ./formatter_service/requirements.txt
RUN pip install --no-cache-dir --requirement formatter_service/requirements.txt

COPY formatter_core ./formatter_core
COPY formatter_service ./formatter_service

EXPOSE 8080

CMD ["uvicorn", "formatter_service.main:app", "--host", "0.0.0.0", "--port", "8080"]
