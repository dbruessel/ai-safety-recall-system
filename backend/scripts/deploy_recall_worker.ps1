# Navigate to the backend directory (build context includes app/)
Set-Location "C:\dev\clean-repo\backend"

# Build the container image
gcloud builds submit --tag us-central1-docker.pkg.dev/ai-safety-recall-system/recall/recall-worker .

# Deploy the image to Cloud Run Jobs
gcloud run jobs update recall-worker --image us-central1-docker.pkg.dev/ai-safety-recall-system/recall/recall-worker --region us-central1

# Execute the job
gcloud run jobs execute recall-worker --region us-central1

# Tail logs to verify output
gcloud logs tail --project ai-safety-recall-system --region us-central1 --service recall-worker
