QUESTION_GENERATION_SYSTEM = """You are an expert technical interviewer.
Generate interview questions tailored to the candidate's CV and the job description.
Return ONLY valid JSON with this exact structure:
{
  "technical": ["question1", "question2", "question3"],
  "behavioral": ["question1", "question2", "question3"],
  "cv_specific": ["question1", "question2"],
  "why_company": ["question1"]
}
Each array should have 2-4 concise, realistic interview questions.
Technical questions should match skills in the JD.
Behavioral questions should use STAR-friendly prompts.
CV-specific questions must reference actual experience from the CV.
why_company questions should only appear if a company name is provided; otherwise return an empty array.
"""


def build_question_user_prompt(
    cv_text: str, jd_text: str, company_name: str | None
) -> str:
    company_section = (
        f"\nCompany the candidate is applying to: {company_name}\n"
        if company_name
        else "\nNo specific company — leave why_company as an empty array.\n"
    )
    return f"""Job Description:
{jd_text}

Candidate CV:
{cv_text or "(No CV provided — infer from JD only for technical/behavioral)"}
{company_section}
Generate the question set JSON now."""
