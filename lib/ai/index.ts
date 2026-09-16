/**
 * Groq AI Question Enhancement & Safety Engine Module
 *
 * Provides:
 * - Server-side Groq API client with structured Zod response parsing
 * - Mathematics and Science pedagogical safety gates (equation, formula, unit preservation)
 * - Teacher-reviewed phrasing enhancement preview workflow
 * - Brand-new similar question authoring engine
 * - Offline deterministic fallbacks
 */

export * from "./groq";
export * from "./prompt";
export * from "./safetyValidator";
export * from "./questionEnhancer";
export * from "./questionGenerator";
export * from "./enhanceQuestion";

