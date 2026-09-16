import { HydratedQuestion } from "@/lib/questions";
import { AISafetyValidationResult } from "@/types/ai";

/**
 * Extracts distinct numerical tokens from a string.
 * Captures integers, decimals, and negative numbers.
 */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/-?\b\d+(?:\.\d+)?\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Extracts algebraic terms, mathematical variables, and equation fragments.
 */
export function extractMathExpressions(text: string): string[] {
  const expressions: string[] = [];

  // Match polynomial expressions like x² + 3x + k, 2x² - 4x + 3, x² - 5x + 6
  const polyMatches = text.match(/[a-zA-Z]²\s*[\+\-]\s*\d*[a-zA-Z]\s*[\+\-]\s*[a-zA-Z0-9]+/g);
  if (polyMatches) expressions.push(...polyMatches);

  // Match radicals like √2, √3, √5, √119
  const radicalMatches = text.match(/√\d+/g);
  if (radicalMatches) expressions.push(...radicalMatches);

  // Match trigonometric functions like sin θ, cos θ, tan θ, cot A, cosec θ, sec θ
  const trigMatches = text.match(/\b(sin|cos|tan|cot|cosec|sec)\s*([a-zA-Zθ°]+|\d+°)?/gi);
  if (trigMatches) expressions.push(...trigMatches);

  // Match Greek mathematical roots like α, β, θ
  const greekMatches = text.match(/[αβθ]/g);
  if (greekMatches) expressions.push(...greekMatches);

  return Array.from(new Set(expressions));
}

/**
 * Extracts chemical formulas, scientific units, and quantities from Science questions.
 */
export function extractScienceEntities(text: string): {
  formulas: string[];
  units: string[];
} {
  // Chemical formulas like CO₂, H₂O, MnO₂, HCl, MnCl₂, Cl₂, CaSO₄, NaOH, C₆H₁₂O₆, O₃, ZnS, ZnCO₃
  const formulaRegex = /(?:(?<=[^a-zA-Z0-9₀-₉]|^))([A-Z][a-z]?(?:[₀-₉0-9]+)?(?:\([A-Z][a-z0-9₀-₉]+\)(?:[₀-₉0-9]+)?|[A-Z][a-z]?(?:[₀-₉0-9]+)?)*)(?=[^a-zA-Z0-9₀-₉]|$)/g;

  const formulaMatches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = formulaRegex.exec(text)) !== null) {
    const formula = match[1];
    if (!formula) continue;
    if (
      /[0-9₀-₉]/.test(formula) ||
      ["HCl", "NaCl", "NaOH", "KOH", "CaO", "CuO", "ZnO", "H2SO4", "HNO3", "CaCO3", "CuSO4", "FeSO4", "AgCl", "AgBr"].includes(formula) ||
      (formula.length >= 2 && /[A-Z].*[A-Z]/.test(formula) && !["CBSE", "NCERT", "MCQ"].includes(formula))
    ) {
      formulaMatches.push(formula);
    }
  }

  // Scientific units like °C, K, J, kJ, Ω, Ω·m, V, A, W, cm, m, mm, g, kg
  const unitRegex = /[-+]?\b\d+(?:\.\d+)?\s*(?:°C|K|J|kJ|Ω|Ω·m|V|mV|A|mA|W|kW|kWh|cm³|cm²|cm|m³|m²|m|mm|km|g|kg|mg|m\/s|m\/s²|D)\b/g;
  const unitMatches = text.match(unitRegex) || [];

  return {
    formulas: Array.from(new Set(formulaMatches)),
    units: Array.from(new Set(unitMatches.map((u) => u.trim()))),
  };
}

/**
 * Validates Mathematics Safety (Section 7).
 * Ensures mathematical equations, numerical constants, variables, and relationships
 * are strictly preserved in the enhanced question.
 */
export function validateMathematicsSafety(
  originalText: string,
  enhancedText: string
): AISafetyValidationResult {
  const violations: string[] = [];

  // 1. Numerical Constants Check
  const origNumbers = extractNumbers(originalText);
  const enhancedNumbers = new Set(extractNumbers(enhancedText));

  for (const num of origNumbers) {
    if (!enhancedNumbers.has(num) && !enhancedText.includes(num)) {
      violations.push(
        `Original numerical value "${num}" is missing from the enhanced question.`
      );
    }
  }

  // 2. Algebraic & Geometric Expression Preservation
  const origExpressions = extractMathExpressions(originalText);
  for (const expr of origExpressions) {
    // Clean whitespace for normalized comparison
    const normalizedExpr = expr.replace(/\s+/g, "");
    const normalizedEnhanced = enhancedText.replace(/\s+/g, "");
    if (!normalizedEnhanced.includes(normalizedExpr)) {
      violations.push(
        `Mathematical expression or equation "${expr}" was altered or removed in the enhanced question.`
      );
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Validates Science Safety (Section 8).
 * Ensures scientific formulas, quantities, units, and core concepts
 * are strictly preserved without factual mutation.
 */
export function validateScienceSafety(
  originalText: string,
  enhancedText: string
): AISafetyValidationResult {
  const violations: string[] = [];

  const { formulas: origFormulas, units: origUnits } = extractScienceEntities(originalText);

  // 1. Chemical Formulas Check
  for (const formula of origFormulas) {
    if (!enhancedText.includes(formula)) {
      violations.push(
        `Chemical formula or species "${formula}" is missing from the enhanced question.`
      );
    }
  }

  // 2. Physical Quantities & Units Check
  for (const unitStr of origUnits) {
    if (!enhancedText.includes(unitStr)) {
      violations.push(
        `Physical quantity/unit "${unitStr}" was modified or removed in the enhanced question.`
      );
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Master Validation Gate before allowing AI enhancement preview or apply.
 * Verifies schema validity, non-empty text, subject safety, and MCQ option protection.
 */
export function validateEnhancedQuestion(
  original: HydratedQuestion,
  enhancedText: string
): AISafetyValidationResult {
  const violations: string[] = [];

  // 1. Non-empty check
  if (!enhancedText || typeof enhancedText !== "string" || enhancedText.trim().length < 8) {
    return {
      isValid: false,
      violations: ["AI generated question text is empty or too short."],
    };
  }

  const trimmedEnhanced = enhancedText.trim();

  // 2. MCQ Specific Checks (Section 9)
  if (original.type === "MCQ") {
    // Check that options are not embedded inside the question stem
    if (
      trimmedEnhanced.includes("(A)") &&
      trimmedEnhanced.includes("(B)") &&
      trimmedEnhanced.includes("(C)") &&
      trimmedEnhanced.includes("(D)")
    ) {
      violations.push(
        "MCQ enhancement must improve only the question stem; options must not be embedded in the question text."
      );
    }
  }

  // 3. Subject-Specific Safety Checks
  if (original.subject === "MATHEMATICS") {
    const mathCheck = validateMathematicsSafety(original.question, trimmedEnhanced);
    if (!mathCheck.isValid) {
      violations.push(...mathCheck.violations);
    }
  } else if (original.subject === "SCIENCE") {
    const scienceCheck = validateScienceSafety(original.question, trimmedEnhanced);
    if (!scienceCheck.isValid) {
      violations.push(...scienceCheck.violations);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Validates an AI-generated brand new question ("Generate Similar Question").
 * Does NOT require preserving the original question's numbers or words,
 * but validates:
 * 1. Question text is substantial and not identical to original reference.
 * 2. Uniqueness against existing questions in the paper.
 * 3. Valid MCQ options (4 distinct non-empty choices) and answer alignment.
 * 4. Non-empty answer/explanation for subjective questions.
 */
export function validateGeneratedSimilarQuestion(
  reference: HydratedQuestion,
  generated: {
    question: string;
    options?: string[];
    answer: string;
    explanation?: string;
  },
  existingQuestions?: string[]
): AISafetyValidationResult {
  const violations: string[] = [];

  // 1. Non-empty check
  if (!generated.question || typeof generated.question !== "string" || generated.question.trim().length < 8) {
    violations.push("AI generated question text is empty or too short.");
  }

  const trimmedQuestion = (generated.question || "").trim();
  const trimmedReference = reference.question.trim();

  // 2. Must not be identical or trivial copy of reference question
  if (trimmedQuestion.toLowerCase() === trimmedReference.toLowerCase()) {
    violations.push("Generated question is identical to reference question. A distinct question must be generated.");
  }

  // 3. Uniqueness against current active paper
  if (existingQuestions && existingQuestions.length > 0) {
    const isDuplicate = existingQuestions.some(
      (qText) => qText.trim().toLowerCase() === trimmedQuestion.toLowerCase()
    );
    if (isDuplicate) {
      violations.push("Generated question already exists in the current paper.");
    }
  }

  // 4. MCQ-Specific validation
  if (reference.type === "MCQ") {
    if (!generated.options || !Array.isArray(generated.options) || generated.options.length < 4) {
      violations.push("MCQ question must provide at least 4 options.");
    } else {
      const validOptions = generated.options.slice(0, 4).map((opt) => opt.trim());
      if (validOptions.some((opt) => opt.length === 0)) {
        violations.push("MCQ options cannot contain empty choices.");
      }
      const uniqueOpts = new Set(validOptions.map((o) => o.toLowerCase()));
      if (uniqueOpts.size < 4) {
        violations.push("MCQ options must all be distinct from each other.");
      }
    }

    if (!generated.answer || generated.answer.trim().length === 0) {
      violations.push("MCQ question must provide a valid correct answer.");
    }
  } else {
    // 5. Subjective Question validation
    if (!generated.answer || generated.answer.trim().length === 0) {
      violations.push("Subjective question must include a reference model answer.");
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
