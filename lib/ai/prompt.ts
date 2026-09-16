import { HydratedQuestion } from "@/lib/questions";

/**
 * System Prompt for CBSE Class 10 AI Question Enhancement (Reframing/Polishing)
 */
export const CBSE_AI_SYSTEM_PROMPT = `You are an expert CBSE Class 10 question editor.

Your task is to polish and clarify the phrasing of an existing examination question.

CRITICAL PRESERVATION REQUIREMENTS:
- You MUST preserve ALL numerical values, negative signs (e.g. -3, -1/2, 2, -5), fractions, equations, variables, and constants.
- You MUST preserve all chemical formulas (e.g. CO₂, MnO₂, HCl), physical units (e.g. 25°C, 30 cm, 2 Ω), and scientific terms.
- You MUST preserve the exact requested operation (e.g., "Find", "Calculate", "Prove that", "State").
- Do NOT change the mathematical solution, answer key, or difficulty.
- For MCQs, enhance ONLY the question stem (do not alter or output options).

Return ONLY a valid JSON object matching:
{
  "question": "Enhanced question text with all original numbers and formulas preserved",
  "reason": "Brief explanation of phrasing improvements"
}`;

/**
 * System Prompt for CBSE Class 10 AI Question Generation (Generate Similar Question)
 */
export const CBSE_AI_GENERATE_SIMILAR_SYSTEM_PROMPT = `You are an expert CBSE Class 10 assessment author.

Your task is to author a BRAND NEW question that tests the exact same curriculum concept, topic, and difficulty level as the reference question.

REQUIREMENTS:
- Subject, Topic, Difficulty tier, Question Type, and Mark value MUST match the reference question.
- The new question must test the same core concept but use FRESH numbers, scenarios, or geometric figures.
- Do NOT copy the reference question verbatim.
- Ensure the question is mathematically and scientifically sound, unambiguous, and solvable within Class 10 syllabus.
- For MCQs: provide exactly 4 distinct, plausible options (without letter prefixes like A) or B) in the option strings) and the correct answer string.
- For Short/Long Answer: provide a complete, clear answer and step-by-step explanation.

Return ONLY a valid JSON object matching:
{
  "question": "New question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "answer": "Correct answer",
  "explanation": "Step-by-step solution and pedagogical explanation"
}`;

/**
 * Constructs the user prompt containing full question metadata for AI Enhancement.
 */
export function buildUserPrompt(question: HydratedQuestion, specificPreserveNotes?: string): string {
  const metadataBlock = [
    `Board: ${question.board}`,
    `Grade: ${question.grade}`,
    `Subject: ${question.subject}`,
    `Topic: ${question.topic}`,
    `Difficulty: ${question.difficulty}`,
    `Question Type: ${question.type}`,
    `Marks: ${question.marks}`,
  ].join("\n");

  let prompt = `Please enhance the following CBSE Class 10 examination question:\n\n`;
  prompt += `--- QUESTION METADATA ---\n${metadataBlock}\n\n`;
  prompt += `--- ORIGINAL QUESTION ---\n${question.question}\n`;

  if (question.type === "MCQ" && question.options && question.options.length > 0) {
    prompt += `\n--- MCQ OPTIONS (FOR CONTEXT ONLY - DO NOT REWRITE OR INCLUDE IN OUTPUT) ---\n`;
    question.options.forEach((opt) => {
      prompt += `${opt}\n`;
    });
  }

  if (specificPreserveNotes) {
    prompt += `\nSPECIAL RETRY INSTRUCTION: ${specificPreserveNotes}\n`;
  }

  prompt += `\nRemember: Enhance only phrasing and grammar. All numbers (including negative numbers and fractions), formulas, and variables MUST remain 100% intact. Return JSON.`;

  return prompt;
}

/**
 * Constructs the user prompt for generating a new similar question.
 */
export function buildGenerateSimilarPrompt(question: HydratedQuestion): string {
  const metadataBlock = [
    `Board: ${question.board}`,
    `Grade: ${question.grade}`,
    `Subject: ${question.subject}`,
    `Topic: ${question.topic}`,
    `Difficulty: ${question.difficulty}`,
    `Question Type: ${question.type}`,
    `Marks: ${question.marks}`,
  ].join("\n");

  let prompt = `Please create a new, original CBSE Class 10 examination question testing the same syllabus concept as the reference question below:\n\n`;
  prompt += `--- TARGET QUESTION SPECIFICATIONS ---\n${metadataBlock}\n\n`;
  prompt += `--- REFERENCE QUESTION (FOR CONCEPTUAL INSPIRATION ONLY - DO NOT COPY) ---\n${question.question}\n`;

  if (question.type === "MCQ") {
    prompt += `\nRequirement for MCQ: Provide exactly 4 options with plain text (do not include "A)", "B)" in option strings) and specify the exact matching answer.`;
  } else {
    prompt += `\nRequirement: Provide a comprehensive marking scheme answer and explanation.`;
  }

  prompt += `\nReturn JSON.`;

  return prompt;
}
