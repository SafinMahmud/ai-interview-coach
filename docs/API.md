# API reference

Base URL: `http://localhost:8000` (dev) or your Render URL.

All JSON routes use prefix **`/api/v1`**.

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |

## CV

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/cv/parse` | Upload PDF (`file`), returns `{ "text": "..." }` |

## Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sessions` | Create session (multipart or JSON) |
| GET | `/api/v1/sessions` | List sessions (newest first) |
| GET | `/api/v1/sessions/{session_id}` | Session detail + questions |
| GET | `/api/v1/sessions/{session_id}/history` | Session with answers and scores |

## Questions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sessions/{session_id}/questions/generate` | Generate (or return cache) |
| GET | `/api/v1/sessions/{session_id}/questions` | List cached questions |

## Answers & evaluation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sessions/{session_id}/questions/{question_id}/answers` | Submit transcript |
| POST | `/api/v1/answers/{answer_id}/evaluate` | Run evaluation, return scores |

## Transcription

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/transcribe` | Upload audio (`file`), returns `{ "transcript": "..." }` |

### Create session (multipart)

```
POST /api/v1/sessions
Content-Type: multipart/form-data

jd_text: string (required)
company_name: string (optional)
cv_file: PDF (optional if cv_text set)
cv_text: string (optional)
```

### Submit answer

```json
{
  "transcript": "I led a team of five...",
  "transcript_source": "web_speech"
}
```

`transcript_source`: `local_whisper` | `web_speech` | `text`

### Evaluation response

```json
{
  "relevance": 8.5,
  "clarity": 7.0,
  "star_method": 6.5,
  "confidence": 7.5,
  "filler_word_count": 12,
  "feedback": { "summary": "...", "strengths": [], "improvements": [] }
}
```
