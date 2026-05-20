# Sprint plan

| Sprint | Scope | Status |
|--------|--------|--------|
| 1 | FastAPI skeleton, config, PDF parse, SQLite models | Done |
| 2 | Question generation prompt + session cache | Done |
| 3 | faster-whisper endpoint + shared answer/eval path | Done |
| 4 | Evaluation JSON scores + regex filler words | Done |
| 5 | React: upload, questions, recorder, results, history | Scaffolded |
| 6 | Render/Vercel env, CORS, README | Done |

## Sprint 1 — Backend skeleton

- [x] FastAPI app with versioned router prefix `/api/v1`
- [x] `Settings` via `pydantic-settings` with `LLM_PROVIDER` switching
- [x] `POST /api/v1/cv/parse` — PDF → text
- [x] SQLAlchemy models: Session, Question, Answer, Score

## Sprint 2 — Question generation

- [x] Prompt: CV + JD (+ company) → JSON buckets
- [x] Persist questions; `questions_cache` on session
- [x] `GET` returns cache without regenerating

## Sprint 3 — Transcription

- [x] `POST /api/v1/transcribe` — faster-whisper (optional dependency)
- [x] Client Web Speech → send text to same answer endpoint
- [x] `transcript_source` enum on answers

## Sprint 4 — Evaluation

- [x] Structured LLM JSON: relevance, clarity, star, confidence
- [x] Filler words via regex before LLM
- [x] Persist `Score` row

## Sprint 5 — Frontend

- [x] Vite + React + TypeScript scaffold
- [ ] Wire all pages to API (incremental)
- [ ] Voice recorder + Web Speech fallback

## Sprint 6 — Deployment

- [x] `render.yaml`, `vercel.json` examples
- [x] CORS from `CORS_ORIGINS`
- [x] Root README with setup
