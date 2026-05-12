# 🚀 Deployment Guide

This document explains how to deploy the backend (FastAPI) and frontend (Next.js) to production using Cloud Run and Vercel.

---

# ☁️ Backend Deployment — Cloud Run

## 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project <your-project-id>
```

---

## 2. Build Docker Image

```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/recall-backend
```

---

## 3. Deploy to Cloud Run

```bash
gcloud run deploy recall-backend \
  --image gcr.io/$PROJECT_ID/recall-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 4. Set Environment Variables

In Cloud Run console:

```
GOOGLE_PROJECT_ID
GOOGLE_LOCATION
GOOGLE_APPLICATION_CREDENTIALS
FIRESTORE_COLLECTION
EMBEDDING_MODEL
```

---

# 🎨 Frontend Deployment — Vercel

## 1. Install Vercel CLI (optional)

```bash
npm i -g vercel
```

---

## 2. Deploy

```bash
cd frontend
vercel
```

---

## 3. Set Environment Variables

In Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://<cloud-run-backend-url>
```

---

# 🧪 Testing Production

### Backend health check:
```
GET https://<cloud-run-url>/docs
```

### Frontend:
Open your Vercel URL.

---

# 🧭 Alternative: Deploy Frontend to Cloud Run

You can also containerize the frontend:

```bash
docker build -t recall-frontend .
gcloud builds submit --tag gcr.io/$PROJECT_ID/recall-frontend
gcloud run deploy recall-frontend ...
```

---

# 🎉 Deployment Complete

Your system is now fully cloud‑hosted and scalable.

