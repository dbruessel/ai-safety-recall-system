AI Safety Recall System
A cloud‑native ingestion and intelligence engine for NHTSA vehicle recall data.

📌 Overview
The AI Safety Recall System is a production‑grade ingestion pipeline that collects, normalizes, and stores vehicle recall data from the National Highway Traffic Safety Administration (NHTSA). It powers downstream applications such as:

Fleet recall intelligence

VIN‑level recall monitoring

Daily recall deltas

Recall campaign analytics

The system is built on Google Cloud Run Jobs, Firestore, and Python ingestion workers, with a focus on reliability, fault tolerance, and clean data modeling.

🚀 Recent Enhancements
1. Full Make/Model Ingestion Pipeline
The ingestion engine now processes all VPIC makes and models across model years 2000–2024, with:

Iterative make/model/year traversal

Automatic checkpointing

Fault‑tolerant execution

Firestore persistence

Cloud Run Jobs orchestration

This enables large‑scale recall ingestion without manual intervention.

2. Advanced Input Sanitization
VPIC returns inconsistent make/model names (e.g., #1 ALPINE CUSTOMS, 12 A & J, A/B CUSTOMS).
The ingestion job now includes a robust sanitization layer that:

Removes leading #, spaces, and digits

Removes illegal characters (#, &, /)

Collapses duplicate whitespace

URL‑encodes for API safety

Example:

Code
#1 ALPINE CUSTOMS → ALPINE CUSTOMS → ALPINE%20CUSTOMS
This prevents malformed API calls and eliminates 400‑level errors caused by VPIC formatting inconsistencies.

3. Fault‑Tolerant Recall Fetching
The ingestion job now gracefully handles:

400 Bad Request

404 Not Found

500 Server Error

Unexpected exceptions

Instead of terminating, the job:

Logs the failure

Saves the checkpoint

Continues to the next make/model/year

This ensures the ingestion pipeline completes even when VPIC and NHTSA datasets don’t align.

4. Cloud Run Jobs Integration
The ingestion engine is deployed as a Cloud Run Job, providing:

Automatic retries

Parallel execution

Containerized isolation

Clean logs in Cloud Logging

Easy redeployments via Cloud Build

Deployment command:

bash
gcloud run jobs deploy make-model-job \
  --image us-central1-docker.pkg.dev/ai-safety-recall-system/recall/make-model-job \
  --region us-central1
5. Firestore Checkpointing
Progress is stored in:

Code
ingestion_checkpoints/make_model
Fields include:

last_make

last_model

last_year

updated_at

This allows the ingestion job to resume exactly where it left off after:

Failures

Redeployments

Cloud Run restarts

Manual resets

Reset command:

bash
gcloud run jobs execute make-model-job --region us-central1 --args="--reset"
6. Clean Firestore Schema
The ingestion pipeline writes to:

Code
recall_campaigns/
ingestion_checkpoints/
Collections are automatically created by the job — no manual setup required.

7. Deployment Workflow
The full deployment flow is now:

bash
# Build
gcloud builds submit . --config backend/ingestion_jobs/docker/cloudbuild.make_model.yaml

# Deploy
gcloud run jobs deploy make-model-job \
  --image us-central1-docker.pkg.dev/ai-safety-recall-system/recall/make-model-job \
  --region us-central1

# Reset checkpoint
gcloud run jobs execute make-model-job --region us-central1 --args="--reset"

# Run ingestion
gcloud run jobs execute make-model-job --region us-central1
🧱 Architecture
High‑Level System Diagram
Code
┌──────────────────────────┐
│        Cloud Run         │
│        (Jobs)            │
│  make-model-ingestion    │
└─────────────┬────────────┘
              │
              ▼
     Calls VPIC + NHTSA APIs
              │
              ▼
┌──────────────────────────┐
│        Sanitization      │
│  (#, digits, &, /, etc.) │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│        Firestore         │
│ recall_campaigns         │
│ ingestion_checkpoints    │
└──────────────────────────┘
📂 Firestore Schema
recall_campaigns
Stores raw recall campaign documents from NHTSA.

Example fields:

NHTSACampaignNumber

ReportReceivedDate

Component

Summary

Make

Model

ModelYear

ingestion_checkpoints/make_model
Tracks ingestion progress.

Code
{
  last_make: "HONDA",
  last_model: "ACCORD",
  last_year: 2018,
  updated_at: <timestamp>
}
⚙️ Local Development
Install dependencies
bash
pip install -r requirements.txt
Run ingestion locally
bash
python backend/ingestion_jobs/make_model_ingestion.py --reset
Environment variables
Ensure you have:

Code
GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account>
🧪 Testing
Unit tests
bash
pytest
Manual API test
bash
curl "https://api.nhtsa.gov/recalls/recallsByVehicle?make=HONDA&model=ACCORD&modelYear=2018"
📈 Roadmap
VIN‑level recall ingestion

Daily recall delta ingestion

Fleet recall intelligence dashboard

Recall severity scoring

Automated notifications for fleet operators

🤝 Contributing
Pull requests are welcome.
Please open an issue first to discuss major changes.

📄 License
MIT License.
