export type TranscriptSource =
  | "local_whisper"
  | "browser_whisper"
  | "web_speech"
  | "text";

export interface SessionDetail {
  id: string;
  cv_text: string;
  jd_text: string;
  company_name: string | null;
  created_at: string;
  has_questions: boolean;
}

export interface SessionSummary {
  id: string;
  company_name: string | null;
  jd_preview: string;
  created_at: string;
  question_count: number;
  avg_score: number | null;
}

export interface Question {
  id: string;
  category: string;
  text: string;
  sort_order: number;
}

export interface EvaluationFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface Score {
  id: string;
  answer_id: string;
  relevance: number;
  clarity: number;
  star_method: number;
  confidence: number;
  filler_word_count: number;
  feedback: EvaluationFeedback;
  created_at: string;
}

export interface AnswerResponse {
  id: string;
  question_id: string;
  transcript: string;
  transcript_source: string;
  created_at: string;
  has_score: boolean;
}

export interface AnswerWithScore {
  id: string;
  transcript: string;
  transcript_source: string;
  created_at: string;
  score: Score | null;
}

export interface QuestionWithAnswers {
  question: Question;
  answers: AnswerWithScore[];
}

export interface SessionHistory {
  session_id: string;
  company_name: string | null;
  created_at: string;
  questions: QuestionWithAnswers[];
  average_scores: Record<string, number | null>;
}
