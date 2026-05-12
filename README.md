# 🛡️ AI Safety Recall System

An intelligent recall management platform that leverages AI to detect, classify, and coordinate safety recalls — helping teams move faster from signal to response.

---

## 📁 Project Structure

```
ai-safety-recall-system/
├── .github/            # GitHub Actions workflows & templates
├── backend/            # Python/FastAPI backend service
├── ai-recall-frontend/ # React/Next.js frontend application
├── docs/               # Architecture docs, ADRs, API specs
├── tests/              # Integration & E2E test suites
├── .env.example        # Environment variable reference
└── docker-compose.yml  # Local development orchestration
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ & npm / pnpm
- Docker & Docker Compose (recommended for local dev)

---

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp ../.env.example .env

# Run the development server
uvicorn app.main:app --reload --port 8000
```

API docs will be available at `http://localhost:8000/docs`.

---

### Frontend Setup

```bash
cd ai-recall-frontend

# Install dependencies
npm install

# Copy and configure environment variables
cp ../.env.example .env.local

# Run the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` (backend) and `.env.local` (frontend) and fill in your values.

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `OPENAI_API_KEY` | Backend | OpenAI API key for AI recall analysis |
| `SECRET_KEY` | Backend | JWT signing secret |
| `CORS_ORIGINS` | Backend | Comma-separated list of allowed frontend origins |
| `NEXT_PUBLIC_API_URL` | Frontend | Base URL of the backend API |
| `NEXT_PUBLIC_APP_ENV` | Frontend | `development`, `staging`, or `production` |

---

## 🧪 Running Tests

```bash
# Backend unit tests
cd backend && pytest

# Frontend unit tests
cd ai-recall-frontend && npm run test

# Integration / E2E tests (from root)
cd tests && pytest
```

---

## 🔄 Development Workflow

1. **Branch** off `main` using `feature/`, `fix/`, or `chore/` prefixes.
2. **Develop** backend and frontend independently — they communicate via REST API.
3. **Test** locally with Docker Compose: `docker compose up --build`
4. **Open a PR** against `main` — CI will run lint, type checks, and tests automatically.
5. **Merge** after review; staging deploys automatically via GitHub Actions.

### Useful Commands

```bash
# Start all services locally
docker compose up --build

# Stop and clean up
docker compose down -v

# Format backend code
cd backend && ruff format .

# Lint frontend
cd ai-recall-frontend && npm run lint
```

---

## 🚢 Deployment

### Docker

Both services include a `Dockerfile`. Build and push images to your container registry:

```bash
docker build -t your-registry/recall-backend:latest ./backend
docker build -t your-registry/recall-frontend:latest ./ai-recall-frontend
```

### Environment-Specific Configuration

| Environment | Backend URL | Frontend URL | Branch |
|---|---|---|---|
| Development | localhost:8000 | localhost:3000 | `feature/*` |
| Staging | api.staging.yourapp.com | staging.yourapp.com | `main` |
| Production | api.yourapp.com | yourapp.com | `release/*` |

### GitHub Actions

CI/CD pipelines are defined in `.github/workflows/`. On merge to `main`, the pipeline:
1. Runs all tests
2. Builds Docker images
3. Pushes to the container registry
4. Deploys to the staging environment

---

## 📚 Documentation

Extended documentation lives in `/docs`:

- `docs/architecture.md` — System design & component diagram
- `docs/api-reference.md` — Full REST API reference
- `docs/adr/` — Architecture Decision Records

---

## 🤝 Contributing

1. Fork the repo and create your feature branch.
2. Follow the coding standards (Ruff for Python, ESLint/Prettier for TypeScript).
3. Write tests for new functionality.
4. Submit a PR with a clear description of the change.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.
