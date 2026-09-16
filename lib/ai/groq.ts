import { z } from "zod";

/**
 * Single configurable server-side model name for Groq API.
 * Defaults to openai/gpt-oss-120b for high reasoning quality and strict JSON formatting.
 */
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

/**
 * Zod Schema to validate Groq structured JSON responses for question enhancement.
 * Rejects arbitrary prose, empty questions, or malformed payloads.
 */
export const GroqEnhanceResponseSchema = z.object({
  question: z
    .string()
    .min(8, "AI generated question text is empty or too short.")
    .transform((val) => val.trim()),
  reason: z
    .string()
    .default("Improved wording and clarity for standard CBSE Class 10 examination format."),
});

export type GroqEnhanceResponse = z.infer<typeof GroqEnhanceResponseSchema>;

export interface GroqCallResult {
  success: boolean;
  data?: GroqEnhanceResponse;
  error?: string;
}

/**
 * Zod Schema to validate Groq structured JSON responses for generating similar questions.
 */
export const GroqGenerateSimilarResponseSchema = z.object({
  question: z
    .string()
    .min(8, "AI generated question text is empty or too short.")
    .transform((val) => val.trim()),
  options: z
    .array(z.string().min(1, "Option text cannot be empty."))
    .optional()
    .default([]),
  answer: z
    .string()
    .min(1, "Answer is required.")
    .transform((val) => val.trim()),
  explanation: z
    .string()
    .optional()
    .default(""),
});

export type GroqGenerateSimilarResponse = z.infer<typeof GroqGenerateSimilarResponseSchema>;

export interface GroqGenerateSimilarCallResult {
  success: boolean;
  data?: GroqGenerateSimilarResponse;
  error?: string;
}

export interface GroqAvailabilityResult {
  available: boolean;
  model: string;
  error?: string;
}

/**
 * Checks if the Groq AI service is configured and accessible.
 */
export async function checkGroqAvailability(
  customApiKey?: string
): Promise<GroqAvailabilityResult> {
  const rawKey =
    customApiKey !== undefined
      ? customApiKey
      : (process.env.GROQ_API_KEY ?? "");

  const apiKey = rawKey.replace(/^["']|["']$/g, "").trim();

  if (!apiKey || apiKey.length === 0) {
    return {
      available: false,
      model: GROQ_MODEL,
      error: "GROQ_API_KEY is not configured on the server.",
    };
  }

  return {
    available: true,
    model: GROQ_MODEL,
  };
}

/**
 * Strips markdown code fences from JSON response if present.
 */
function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Invokes the Groq API using its OpenAI-compatible completions endpoint for question enhancement.
 * - Enforces server-side execution only.
 * - Uses 10-second timeout with AbortController to prevent hanging.
 * - Validates output strictly with Zod schema.
 * - Never logs or exposes the API key.
 */
export async function callGroqEnhance(
  systemPrompt: string,
  userPrompt: string,
  customApiKey?: string
): Promise<GroqCallResult> {
  const rawKey =
    customApiKey !== undefined
      ? customApiKey
      : (process.env.GROQ_API_KEY ?? "");

  const apiKey = rawKey.replace(/^["']|["']$/g, "").trim();

  if (!apiKey || apiKey.length === 0) {
    return {
      success: false,
      error: "No AI enhancement is available right now. The original question has been preserved.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      if (status === 401) {
        return {
          success: false,
          error: "Invalid or unauthorized GROQ_API_KEY. The original question has been preserved.",
        };
      }
      if (status === 403) {
        return {
          success: false,
          error: "Access forbidden with provided GROQ_API_KEY. The original question has been preserved.",
        };
      }
      if (status === 404) {
        return {
          success: false,
          error: `Requested model "${GROQ_MODEL}" is unavailable or deprecated. The original question has been preserved.`,
        };
      }
      if (status === 429) {
        return {
          success: false,
          error: "Groq API rate limit exceeded. Please wait a moment and try again.",
        };
      }
      return {
        success: false,
        error: `Groq API service unavailable (Status: ${status}). The original question has been preserved.`,
      };
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return {
        success: false,
        error: "Malformed response received from Groq AI. The original question has been preserved.",
      };
    }

    const cleanedContent = extractJsonPayload(content);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedContent);
    } catch {
      return {
        success: false,
        error: "Groq response could not be parsed as JSON. The original question has been preserved.",
      };
    }

    const zodValidation = GroqEnhanceResponseSchema.safeParse(parsedJson);
    if (!zodValidation.success) {
      const issueMessages = zodValidation.error.issues.map((i) => i.message).join("; ");
      return {
        success: false,
        error: `Groq structured response validation failed: ${issueMessages}`,
      };
    }

    return {
      success: true,
      data: zodValidation.data,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: "Groq API request timed out after 10 seconds. The original question has been preserved.",
      };
    }

    const message = err instanceof Error ? err.message : "Unknown network error";
    return {
      success: false,
      error: `Network failure connecting to Groq AI (${message}). The original question has been preserved.`,
    };
  }
}

/**
 * Invokes the Groq API for generating a brand new similar question matching target metadata.
 */
export async function callGroqGenerateSimilar(
  systemPrompt: string,
  userPrompt: string,
  customApiKey?: string
): Promise<GroqGenerateSimilarCallResult> {
  const rawKey =
    customApiKey !== undefined
      ? customApiKey
      : (process.env.GROQ_API_KEY ?? "");

  const apiKey = rawKey.replace(/^["']|["']$/g, "").trim();

  if (!apiKey || apiKey.length === 0) {
    return {
      success: false,
      error: "Groq API is not configured or available. Cannot generate a new question.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      if (status === 401) {
        return {
          success: false,
          error: "Invalid or unauthorized GROQ_API_KEY.",
        };
      }
      if (status === 404) {
        return {
          success: false,
          error: `Requested model "${GROQ_MODEL}" is unavailable or deprecated.`,
        };
      }
      if (status === 429) {
        return {
          success: false,
          error: "Groq API rate limit reached. Please wait a moment and try again.",
        };
      }
      return {
        success: false,
        error: `Groq AI service returned status ${status}.`,
      };
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return {
        success: false,
        error: "Malformed response received from Groq AI.",
      };
    }

    const cleanedContent = extractJsonPayload(content);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedContent);
    } catch {
      return {
        success: false,
        error: "Groq response could not be parsed as valid JSON.",
      };
    }

    const zodValidation = GroqGenerateSimilarResponseSchema.safeParse(parsedJson);
    if (!zodValidation.success) {
      const issueMessages = zodValidation.error.issues.map((i) => i.message).join("; ");
      return {
        success: false,
        error: `Generated question validation failed: ${issueMessages}`,
      };
    }

    return {
      success: true,
      data: zodValidation.data,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: "Groq API request timed out after 12 seconds.",
      };
    }

    const message = err instanceof Error ? err.message : "Unknown network error";
    return {
      success: false,
      error: `Network failure connecting to Groq AI (${message}).`,
    };
  }
}
