FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ingestion script
COPY make_model_ingestion.py .

CMD ["python", "make_model_ingestion.py"]
