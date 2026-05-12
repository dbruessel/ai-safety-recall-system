# 🔌 API Reference — FastAPI Backend

This document describes all backend API endpoints, request/response formats, and environment variables.

---

## 📍 Base URL

### **Local**
```
http://localhost:8000
```

### **Production (Cloud Run)**
```
https://<your-cloud-run-url>
```

---

# 📚 Endpoints

---

## ➕ Create Recall  
**POST** `/recall/add`

### Request
```json
{
  "text": "Remember to review the safety checklist."
}
```

### Response
```json
{
  "id": "abc123",
  "status": "active"
}
```

---

## 🔍 Semantic Search  
**POST** `/recall/search`

### Request
```json
{
  "query": "safety checklist"
}
```

### Response
```json
[
  {
    "id": "abc123",
    "text": "Remember to review the safety checklist.",
    "score": 0.92
  }
]
```

---

## 📄 Get All Recalls  
**GET** `/recall/all`

### Response
```json
[
  {
    "id": "abc123",
    "text": "...",
    "status": "active"
  }
]
```

---

## 🔄 Update Recall Status  
**PATCH** `/recall/update/{id}`

### Request
```json
{
  "status": "completed"
}
```

### Response
```json
{
  "id": "abc123",
  "status": "completed"
}
```

---

## ❌ Delete Recall  
**DELETE** `/recall/delete/{id}`

### Response
```json
{
  "deleted": true
}
```

---

# ⚙️ Environment Variables

Create `.env`:

```
GOOGLE_PROJECT_ID=your-project
GOOGLE_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=service-account.json
FIRESTORE_COLLECTION=recalls
EMBEDDING_MODEL=text-embedding-004
```

---

# 🧪 Error Format

All errors follow this structure:

```json
{
  "detail": "Error message here"
}
```

---

# 🧭 Notes

- All endpoints return JSON  
- All write operations require valid Google Cloud credentials  
- Embeddings are generated using Vertex AI  

