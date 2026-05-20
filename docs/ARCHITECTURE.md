# Architecture — AI Interview Coach

## Overview

AI Interview Coach helps candidates practice interviews by generating tailored questions from a CV and job description, recording answers (voice or text), and scoring responses with an LLM.

```
┌─────────────┐     HTTPS      ┌──────────────────┐
│  React SPA  │ ─────────────► │  FastAPI (API)   │
│  (Vercel)   │                │  (Render)        │
└──────┬──────┘                └────────┬─────────┘
       │ Web Speech API                 │
       │ (demo mode)                    │ SQLite
       ▼                                ▼
  transcript text              ┌─────────────────┐
                               │ sessions,       │
                               │ questions,      │
                               │ answers, scores │
                               └─────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              PDF parser          LLM providers      faster-whisper
              (pypdf)         (Groq/OpenAI/Anthropic)  (optional local)
```

## Design principles

1. **Layered backend** — Routes → Services → Models. Routes stay thin; business logic lives in `services/`.
2. **Swappable providers** — LLM access goes through `LLMProvider` protocol; env var selects implementation.
3. **Single evaluation path** — Whether the transcript comes from Whisper, Web Speech API, or typed text, the same `EvaluationService` runs.
4. **Session-scoped cache** — Generated questions are stored on the session row so refresh does not re-call the LLM.
5. **Deterministic filler count** — Regex counts filler words before the LLM call; scores use the real count, not an estimate.

## Repository layout

```
ai-interview-coach/
├── docs/                 # Architecture, API reference, sprint plan
├── backend/
│   └── app/
│       ├── api/routes/   # HTTP handlers (no business logic)
│       ├── models/       # SQLAlchemy ORM
│       ├── schemas/      # Pydantic request/response DTOs
│       ├── services/     # Domain logic
│       │   ├── llm/      # Provider abstraction + adapters
│       │   ├── pdf/
│       │   ├── questions/
│       │   ├── transcription/
│       │   └── evaluation/
│       ├── config.py     # Settings from environment
│       ├── database.py   # Engine + session factory
│       └── main.py       # App factory + middleware
└── frontend/
    └── src/              # React UI (Vite)
```

## Data model

| Entity    | Purpose |
|-----------|---------|
| `Session` | One practice run: CV text, JD text, optional company name, cached questions JSON |
| `Question`| Generated question linked to a session and category |
| `Answer`  | User response (transcript + source: whisper / web_speech / text) |
| `Score`   | Evaluation result for one answer |

Relationships: `Session` 1—N `Question` 1—N `Answer` 1—1 `Score`.

## Request flows

### 1. Start session

`POST /api/v1/sessions` — multipart: CV PDF (optional if `cv_text` provided), `jd_text`, optional `company_name`.

### 2. Generate questions (once per session)

`POST /api/v1/sessions/{id}/questions/generate` — LLM returns structured JSON; persisted to DB and `questions_cache` on session. Subsequent `GET` returns cache.

### 3. Submit answer

`POST /api/v1/sessions/{id}/questions/{question_id}/answers` — body: `transcript`, `transcript_source`.

Optional: `POST /api/v1/transcribe` — upload audio → transcript (local Whisper).

### 4. Evaluate

`POST /api/v1/answers/{answer_id}/evaluate` — regex filler count → LLM JSON scores → save `Score`.

## Configuration

All settings load from environment (see `backend/.env.example`). Key variables:

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `groq` \| `openai` \| `anthropic` |
| `DATABASE_URL` | SQLite path (default `sqlite:///./interview_coach.db`) |
| `CORS_ORIGINS` | Comma-separated frontend URLs |
| `WHISPER_MODEL_SIZE` | faster-whisper model (e.g. `base`) |

## Extending the system

| Change | Where to edit |
|--------|----------------|
| New LLM provider | `services/llm/providers.py` + `config.py` enum |
| New question category | `schemas/questions.py`, prompt in `services/questions/prompts.py` |
| New score dimension | `models/score.py`, `schemas/evaluation.py`, evaluation prompt |
| New transcript source | `schemas/answer.py` enum only; evaluation unchanged |

## Deployment

- **API**: Render — `backend/` root, `uvicorn app.main:app`
- **Frontend**: Vercel — `frontend/`, `VITE_API_URL` pointing to Render

See [SPRINTS.md](./SPRINTS.md) for delivery timeline and [API.md](./API.md) for endpoint reference.
