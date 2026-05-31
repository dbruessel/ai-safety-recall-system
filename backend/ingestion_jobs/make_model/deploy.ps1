$IMAGE="us-central1-docker.pkg.dev/ai-safety-recall-system/recall/make-model-job"

gcloud run jobs deploy make-model-job `
  --image=$IMAGE `
  --region=us-central1
