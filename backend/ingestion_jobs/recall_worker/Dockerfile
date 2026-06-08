FROM python:3.11-slim

WORKDIR /app

# Copy worker code
COPY . .

# Copy shared normalization logic from repo root
COPY ../../app ./app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Run the worker
CMD ["python", "recall_worker.py"]
