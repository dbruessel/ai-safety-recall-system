# Navigate to the worker directory
Set-Location "C:\dev\clean-repo\backend\ingestion_jobs\recall_worker"

# Build the container image
gcloud builds submit --tag gcr.io/ai-safety-recall-system/recall-worker

# Deploy the image to Cloud Run Jobs
gcloud run jobs update recall-worker --image gcr.io/ai-safety-recall-system/recall-worker --region us-central1

# Execute the job
gcloud run jobs execute recall-worker --region us-central1

# Tail logs to verify output
gcloud logs tail --project ai-safety-recall-system --region us-central1 --service recall-worker
