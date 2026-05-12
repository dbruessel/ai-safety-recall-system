# 🚀 AI Safety Recall System  
*A clean, modern monorepo for storing, searching, and recalling important information using embeddings + semantic search.*

This project is a full‑stack AI-powered recall system built with:

- **FastAPI** (backend API + embeddings + Firestore)  
- **Next.js 14** (frontend UI)  
- **Google Cloud** (Vertex AI, Firestore, Cloud Run)  
- **Docker** (local + production)  
- **Modern monorepo structure** (backend + frontend + docs + tests)

It’s designed to be simple, fast, and scalable — perfect for personal knowledge recall, safety workflows, or as a foundation for more advanced AI systems.

---

## 📁 Monorepo Structure

```
ai-safety-recall-system/
│
├── backend/               # FastAPI backend (embeddings, CRUD, semantic search)
├── frontend/              # Next.js 14 frontend (UI + API integration)
├── docs/                  # Architecture, API reference, deployment notes
├── tests/                 # Backend + frontend tests
├── .github/               # GitHub Actions CI/CD workflows
└── README.md              # You're reading it :)
```

---

## 🧠 What This System Does

### ✔ Store recalls  
Each recall is saved with:
- text  
- embedding vector  
- metadata (timestamp, status, tags)

### ✔ Query recalls using semantic search  
The backend uses:
- Vertex AI embeddings  
- Firestore vector queries  
- cosine similarity filtering  

### ✔ Update recall status  
Mark items as:
- active  
- archived  
- completed  

### ✔ Clean, modern UI  
The frontend provides:
- a fast search bar  
- instant results  
- clean minimal design  
- responsive layout  

---

## 🛠 Backend (FastAPI)

### 🔧 Features
- CRUD endpoints for recalls
