# AI Interview Coach

Practice technical and behavioral interviews with AI-generated questions from your CV and job description, voice or text answers, and structured scoring.

## Features

- **CV + JD → tailored questions** (technical, behavioral, CV-specific, why-this-company)
- **Swappable LLM providers** via `LLM_PROVIDER` (Groq, OpenAI, Anthropic)
- **Transcription**: Web Speech API (browser demo) or local [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- **Evaluation**: relevance, clarity, STAR, confidence + regex-based filler word count
- **Session history** with score comparison

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, extension guide |
| [docs/API.md](docs/API.md) | REST endpoint reference |
| [docs/SPRINTS.md](docs/SPRINTS.md) | Sprint delivery checklist |

## Quick start (local)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # add your API key
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

### Optional: local Whisper

```bash
pip install -r requirements-local.txt
```

Set `ENABLE_LOCAL_WHISPER=true` and `WHISPER_MODEL_SIZE=base` in `.env`.

**Render free tier:** keep `ENABLE_LOCAL_WHISPER=false` and do not install `faster-whisper` (it exceeds ~512MB RAM). Use **Web Speech** or **type answer** on the hosted app.

## Environment variables

### Backend (`backend/.env`)

| Variable | Example | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `groq` | `groq` \| `openai` \| `anthropic` |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Model id for the chosen provider |
| `GROQ_API_KEY` | `gsk_...` | Required when provider is groq |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated frontend URLs |
| `DATABASE_URL` | `sqlite:///./interview_coach.db` | SQLite path |
| `ENABLE_LOCAL_WHISPER` | `false` on Render | Server-side Whisper; `false` in production |

### Frontend (`frontend/.env`)

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `http://localhost:8000` |

## Deployment

### API on Render

1. New **Web Service** → connect repo, set **Root Directory** to `backend`.
2. Build: `pip install -r requirements.txt`
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add env vars from `.env.example`; set `CORS_ORIGINS` to your Vercel URL.

See [render.yaml](render.yaml) for a blueprint example.

### Frontend on Vercel

1. Import repo, set **Root Directory** to `frontend`.
2. Add `VITE_API_URL=https://your-api.onrender.com`
3. Deploy.

See [frontend/vercel.json](frontend/vercel.json).

> **Note:** Render free tier uses ephemeral disk — SQLite resets on redeploy. For production, switch `DATABASE_URL` to PostgreSQL.

## Project structure

```
ai-interview-coach/
├── backend/app/     # FastAPI — routes, services, models
├── frontend/src/    # React + Vite
└── docs/            # Architecture & API docs
```

## License

MIT
