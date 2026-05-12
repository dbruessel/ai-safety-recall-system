🚀 AI Safety Recall System
A clean, modern monorepo for storing, searching, and recalling important information using embeddings + semantic search.

This project is a full‑stack AI-powered recall system built with:

FastAPI (backend API + embeddings + Firestore)

Next.js 14 (frontend UI)

Google Cloud (Vertex AI, Firestore, Cloud Run)

Docker (local + production)

Modern monorepo structure (backend + frontend + docs + tests)

It’s designed to be simple, fast, and scalable — perfect for personal knowledge recall, safety workflows, or as a foundation for more advanced AI systems.

📁 Monorepo Structure
Code
ai-safety-recall-system/
│
├── backend/               # FastAPI backend (embeddings, CRUD, semantic search)
├── frontend/              # Next.js 14 frontend (UI + API integration)
├── docs/                  # Architecture, API reference, deployment notes
├── tests/                 # Backend + frontend tests
├── .github/               # GitHub Actions CI/CD workflows
└── README.md              # You're reading it :)
🧠 What This System Does
✔ Store recalls
Each recall is saved with:

text

embedding vector

metadata (timestamp, status, tags)

✔ Query recalls using semantic search
The backend uses:

Vertex AI embeddings

Firestore vector queries

cosine similarity filtering

✔ Update recall status
Mark items as:

active

archived

completed

✔ Clean, modern UI
The frontend provides:

a fast search bar

instant results

clean minimal design

responsive layout

🛠 Backend (FastAPI)
🔧 Features
CRUD endpoints for recalls

Embedding generation via Vertex AI

Firestore vector storage

Semantic search endpoint

Logging + environment variable support

Dockerized for Cloud Run

▶ Running locally
bash
cd backend
uvicorn app.main:app --reload
▶ Environment variables
Create .env:

Code
GOOGLE_PROJECT_ID=your-project
GOOGLE_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=service-account.json
FIRESTORE_COLLECTION=recalls
EMBEDDING_MODEL=text-embedding-004
🎨 Frontend (Next.js 14 + Tailwind)
🔧 Features
Modern UI for adding + searching recalls

API integration with FastAPI backend

Clean minimalist design

Server Actions + App Router

▶ Running locally
bash
cd frontend
npm install
npm run dev
▶ Environment variables
Create .env.local:

Code
NEXT_PUBLIC_API_URL=http://localhost:8000
🧱 Architecture Overview
Code
User → Next.js UI → FastAPI API → Vertex AI Embeddings
                                   ↓
                               Firestore
                           (vector + metadata)
Frontend sends text → backend

Backend generates embedding

Firestore stores vector + metadata

Search queries use vector similarity

Results return instantly to UI

🧪 Tests
Code
tests/
├── backend/
└── frontend/
Run backend tests:

bash
cd tests/backend
pytest
Run frontend tests:

bash
cd tests/frontend
npm test
🚢 Deployment
Backend → Cloud Run
bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/recall-backend
gcloud run deploy recall-backend \
  --image gcr.io/$PROJECT_ID/recall-backend \
  --platform managed \
  --region us-central1
Frontend → Vercel or Cloud Run
Both work — Vercel is the simplest.

📌 Roadmap
[ ] Add user authentication

[ ] Add categories + tags

[ ] Add recall summaries

[ ] Add batch imports

[ ] Add vector re‑indexing

[ ] Add mobile‑friendly UI

[ ] Add analytics dashboard

🤝 Contributing
Pull requests welcome.
If you break something, that’s part of the fun.

🧑‍💻 Author
Dennis — building clean, modern, AI‑powered systems one repo at a time.

🎉 Final Notes
This project is intentionally simple, clean, and scalable.
It’s the perfect foundation for:

personal knowledge recall

AI safety workflows

memory systems

agent tooling

semantic search apps
