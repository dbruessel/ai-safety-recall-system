$IMAGE_BASE="us-central1-docker.pkg.dev/ai-safety-recall-system/recall/make-model-job"
$VERSION=(Get-Date -Format "yyyyMMdd-HHmmss")

gcloud --% builds submit . `
  --tag="$IMAGE_BASE:latest" `
  --tag="$IMAGE_BASE:$VERSION" `
  --timeout=1200s
