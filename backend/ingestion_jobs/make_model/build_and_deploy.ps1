$IMAGE="us-central1-docker.pkg.dev/ai-safety-recall-system/recall/make-model-job"

Write-Host "=== BUILDING IMAGE ==="
gcloud --% builds submit . `
  --tag=$IMAGE `
  --timeout=1200s

Write-Host "=== DEPLOYING JOB ==="
gcloud run jobs deploy make-model-job `
  --image=$IMAGE `
  --region=us-central1
