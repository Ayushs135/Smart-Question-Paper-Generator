/**
 * Application Type Definitions Barrel
 *
 * Re-exports:
 * - Domain question types, Zod schemas, CBSE Class 10 chapter lists (`types/question`)
 * - Paper blueprint configuration schema and distribution utilities (`types/config`)
 * - AI request/response contracts and safety result interfaces (`types/ai`)
 */

export * from "./question";
export * from "./config";
export * from "./ai";

export interface SubjectOption {
  id: "MATHEMATICS" | "SCIENCE";
  label: string;
  description: string;
  topics: readonly string[];
}

export interface NavigationItem {
  name: string;
  href: string;
  description?: string;
  isPlaceholder?: boolean;
}

