# 🛠 Troubleshooting Guide

This document lists common issues and how to fix them for both the backend and frontend.

---

# 🔥 Backend Issues

---

## ❌ Firestore Permission Denied

**Cause:** Service account missing Firestore roles.

**Fix:**

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:<service-account-email>" \
  --role="roles/datastore.user"
```

---

## ❌ Vertex AI Authentication Error

**Fix:**

Ensure:

```
GOOGLE_APPLICATION_CREDENTIALS=service-account.json
```

And the service account has:

- `roles/aiplatform.user`

---

## ❌ CORS Errors

Add this to FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ❌ Embeddings Not Generating

Check:

- Model name: `text-embedding-004`
- Google Cloud region matches your project
- Service account has Vertex AI permissions

---

# 🎨 Frontend Issues

---

## ❌ API URL Not Working

Check `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Or production:

```
NEXT_PUBLIC_API_URL=https://<cloud-run-url>
```

Restart dev server after changes.

---

## ❌ 404 on API Routes

Make sure frontend is calling:

```
/recall/add
/recall/search
```

Not:

```
/api/recall/add
```

---

# 🐳 Docker Issues

---

## ❌ Docker Build Fails

Try:

```bash
docker system prune -af
```

Then rebuild.

---

## ❌ Cloud Run Cold Starts

Enable minimum instances:

```
Cloud Run → Service → Autoscaling → Min Instances = 1
```

---

# 🎉 You're Good to Go

If you hit an issue not listed here, open an issue or ask for help.

