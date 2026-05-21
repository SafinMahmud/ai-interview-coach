const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  parseCv: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ text: string }>("/api/v1/cv/parse", {
      method: "POST",
      body: form,
    });
  },

  createSession: async (params: {
    jd_text: string;
    company_name?: string;
    cv_text?: string;
    cv_file?: File;
  }) => {
    const form = new FormData();
    form.append("jd_text", params.jd_text);
    if (params.company_name) form.append("company_name", params.company_name);
    if (params.cv_text) form.append("cv_text", params.cv_text);
    if (params.cv_file) form.append("cv_file", params.cv_file);
    return request<import("@/types").SessionDetail>("/api/v1/sessions", {
      method: "POST",
      body: form,
    });
  },

  generateQuestions: (sessionId: string) =>
    request<{ session_id: string; cached: boolean; questions: import("@/types").Question[] }>(
      `/api/v1/sessions/${sessionId}/questions/generate`,
      { method: "POST" }
    ),

  listQuestions: (sessionId: string) =>
    request<import("@/types").Question[]>(`/api/v1/sessions/${sessionId}/questions`),

  submitAnswer: (
    sessionId: string,
    questionId: string,
    body: { transcript: string; transcript_source: import("@/types").TranscriptSource }
  ) =>
    request<import("@/types").AnswerResponse>(
      `/api/v1/sessions/${sessionId}/questions/${questionId}/answers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    ),

  evaluate: (answerId: string) =>
    request<import("@/types").Score>(`/api/v1/answers/${answerId}/evaluate`, {
      method: "POST",
    }),

  transcribe: async (file: Blob, filename = "recording.webm") => {
    const form = new FormData();
    form.append("file", file, filename);
    return request<{ transcript: string }>("/api/v1/transcribe", {
      method: "POST",
      body: form,
    });
  },

  listSessions: () =>
    request<import("@/types").SessionSummary[]>("/api/v1/sessions"),

  sessionHistory: (sessionId: string) =>
    request<import("@/types").SessionHistory>(
      `/api/v1/sessions/${sessionId}/history`
    ),
};
