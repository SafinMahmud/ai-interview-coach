import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";

export default function SetupPage() {
  const navigate = useNavigate();
  const [jdText, setJdText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api.createSession({
        jd_text: jdText,
        company_name: companyName || undefined,
        cv_file: cvFile ?? undefined,
      });
      await api.generateQuestions(session.id);
      navigate(`/interview/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>AI Interview Coach</h1>
      <p>Upload your CV and paste the job description to start practicing.</p>
      <form className="card" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="cv">CV (PDF)</label>
          <input
            id="cv"
            type="file"
            accept="application/pdf"
            onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="field">
          <label htmlFor="jd">Job description</label>
          <textarea
            id="jd"
            rows={8}
            required
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description..."
          />
        </div>
        <div className="field">
          <label htmlFor="company">Company name (optional)</label>
          <input
            id="company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="For 'why this company' questions"
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Starting..." : "Start interview"}
        </button>
      </form>
    </div>
  );
}
