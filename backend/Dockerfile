FROM python:3.11-slim

WORKDIR /app

# Copy the entire backend folder (includes app and ingestion_jobs)
COPY . .

# Install dependencies for the worker
RUN pip install --no-cache-dir -r ingestion_jobs/recall_worker/requirements.txt

# Set Python path so imports from app/ work
ENV PYTHONPATH="/app"

# Run the worker
CMD ["python", "ingestion_jobs/recall_worker/recall_worker.py"]
