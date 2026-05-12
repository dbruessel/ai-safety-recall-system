# 🏗️ Architecture Overview

This document explains how the AI Safety Recall System works end‑to‑end — from the frontend UI to the backend API, embeddings pipeline, and Firestore vector search.

---

## 🔭 High-Level System Diagram

```
User → Next.js UI → FastAPI API → Vertex AI Embeddings
                                   ↓
                               Firestore
                           (vector + metadata)
```

---

## 🧱 Components

### **1. Frontend (Next.js 14 + Tailwind)**
- Provides UI for adding + searching recalls  
- Sends requests to FastAPI backend  
- Displays semantic search results  
- Uses App Router + Server Actions  
- Environment variables stored in `.env.local`

### **2. Backend (FastAPI)**
- Handles CRUD operations  
- Generates embeddings via Vertex AI  
- Stores vectors + metadata in Firestore  
- Performs semantic search using vector queries  
- Exposes REST API endpoints  
- Dockerized for Cloud Run deployment  

### **3. Vertex AI Embeddings**
- Model: `text-embedding-004`  
- Converts text → 768‑dimensional vector  
- Used for semantic similarity search  

### **4. Firestore (Vector Store)**
Stores each recall as:

```json
{
  "id": "...",
  "text": "...",
  "embedding": [ ... ],
  "status": "active",
  "created_at": "...",
  "updated_at": "..."
}
```

Supports:
- vector similarity queries  
- metadata filtering  
- fast retrieval  

---

## 🔄 Data Flow

### **1. Add Recall**
1. User enters text in frontend  
2. Frontend sends POST → `/recall/add`  
3. Backend generates embedding  
4. Backend stores document in Firestore  
5. Returns success response  

### **2. Search Recalls**
1. User enters search query  
2. Frontend sends POST → `/recall/search`  
3. Backend embeds query text  
4. Firestore performs vector similarity search  
5. Backend returns ranked results  
6. Frontend displays them instantly  

---

## 🧩 Why This Architecture Works Well

- **Simple**: Only a few moving parts  
- **Scalable**: Cloud Run + Firestore scale automatically  
- **Fast**: Vector search is near‑instant  
- **Flexible**: Easy to add tags, categories, summaries  
- **Modern**: Uses the latest Next.js + FastAPI patterns  

---

## 🚀 Future Enhancements

- Add user authentication  
- Add multi‑tenant support  
- Add recall summaries  
- Add batch imports  
- Add analytics dashboard  

