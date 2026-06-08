FROM python:3.11-slim

WORKDIR /app

# Copy everything from backend into container so app/ is included
COPY ../../backend ./backend

# Set PYTHONPATH so imports from app/ work
ENV PYTHONPATH="/app/backend"

# Install dependencies
RUN pip install --no-cache-dir -r backend/ingestion_jobs/recall_worker/requirements.txt

# Run the worker
CMD ["python", "backend/ingestion_jobs/recall_worker/recall_worker.py"]
