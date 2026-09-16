# Smart Question Paper Generator - API Documentation

This document provides complete technical specifications for the HTTP REST endpoints, Next.js Server Actions, and Core TypeScript Library APIs in the **Smart Question Paper Generator**.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [REST API Endpoints](#2-rest-api-endpoints)
   - [POST /api/paper/pdf](#post-apipaperpdf)
3. [Next.js Server Actions](#3-nextjs-server-actions)
   - [generatePaperAction](#generatepaperaction)
   - [swapQuestionAction](#swapquestionaction)
   - [enhanceQuestionAction](#enhancequestionaction)
   - [applyQuestionEnhancementAction](#applyquestionenhancementaction)
   - [generateSimilarQuestionAction](#generatesimilarquestionaction)
   - [applySimilarQuestionAction](#applysimilarquestionaction)
4. [Core Library APIs](#4-core-library-apis)
   - [Deterministic Generator Engine (`lib/generator`)](#deterministic-generator-engine-libgenerator)
   - [Question Data Layer (`lib/questions.ts`)](#question-data-layer-libquestionsts)
   - [AI Enhancement & Safety Engine (`lib/ai`)](#ai-enhancement--safety-engine-libai)
   - [Vector PDF Generation (`lib/pdf`)](#vector-pdf-generation-libpdf)
5. [Data Models & TypeScript Schemas](#5-data-models--typescript-schemas)
   - [PaperConfig Schema](#paperconfig-schema)
   - [GenerationResult Contract](#generationresult-contract)
   - [HydratedQuestion Contract](#hydratedquestion-contract)
   - [ConstraintViolation Model](#constraintviolation-model)
6. [Error Handling & Status Codes](#6-error-handling--status-codes)

---

## 1. Architecture Overview

The system follows a strict **hybrid separation of concerns**:
- **Deterministic Core**: Authoritative for constraint satisfaction, 0/1 knapsack feasibility, dynamic programming candidate optimization, total mark calculation, duplicate prevention, and section taxonomy.
- **Server Actions & API Routes**: Type-safe server boundaries executing database queries, generator operations, and AI API calls without leaking environment secrets (`GROQ_API_KEY`, `DATABASE_URL`) to the client.
- **Safety Gate**: Independent validation pipeline enforcing domain invariance on mathematical expressions, numerical constants, chemical formulas, and scientific units.

---

## 2. REST API Endpoints

### POST `/api/paper/pdf`

Generates and streams an official, vector A4 CBSE Examination Question Paper PDF based on a `GenerationResult` payload.

- **URL**: `/api/paper/pdf`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Response Type**: `application/pdf` (binary stream)

#### Request Headers

| Header | Value | Description |
|---|---|---|
| `Content-Type` | `application/json` | Required |

#### Request Body

Pass the full `GenerationResult` object obtained from `generatePaperAction` or `generatePaper`:

```json
{
  "status": "EXACT",
  "questions": [
    {
      "id": "cmu1ao2k6001djbcdgpjctvfs",
      "board": "CBSE",
      "grade": "CLASS_10",
      "subject": "MATHEMATICS",
      "topic": "Areas Related to Circles",
      "difficulty": "EASY",
      "type": "MCQ",
      "marks": 1,
      "question": "If the perimeter and the area of a circle are numerically equal, then the radius of the circle is:",
      "options": ["2 units", "π units", "4 units", "7 units"],
      "answer": "2 units",
      "explanation": "2πr = πr² implies r = 2 units."
    }
  ],
  "actual": {
    "totalMarks": 40,
    "questionCount": 21,
    "sections": {
      "sectionA_MCQ": [...],
      "sectionB_ShortAnswer": [...],
      "sectionC_LongAnswer": [...]
    }
  }
}
```

#### Successful Response (`200 OK`)

- **Status**: `200 OK`
- **Content-Type**: `application/pdf`
- **Headers**:
  - `Content-Disposition: attachment; filename="CBSE_Class10_MATHEMATICS_40M_Question_Paper.pdf"`
  - `Content-Length: <byte_count>`

#### Error Responses

| Status Code | Condition | Response Body |
|---|---|---|
| `400 Bad Request` | Missing or invalid paper data structure | `{"error": "Invalid paper data provided."}` |
| `500 Internal Server Error` | PDF generation or font encoding failure | `{"error": "<error_message>"}` |

---

## 3. Next.js Server Actions

All server actions are defined in [`app/generate/actions.ts`](file:///D:/vs/Smart-Question-Paper-Generator/app/generate/actions.ts) and marked with `"use server"`. They execute entirely on the Node.js runtime.

### `generatePaperAction`

Invokes the deterministic question paper generator using a validated blueprint configuration.

```typescript
export async function generatePaperAction(config: PaperConfig): Promise<GenerationResult>
```

#### Parameters

- `config` (`PaperConfig`): Blueprint parameters including `subject`, `totalMarks`, `difficultyDistribution`, `questionTypeDistribution`, and `topicDistribution`.

#### Returns

- `Promise<GenerationResult>`: The complete structured generation output including status (`EXACT` | `PARTIAL` | `IMPOSSIBLE`), selected questions, deviations, violations, and explanation.

---

### `swapQuestionAction`

Deterministically replaces an individual question in an existing paper with a matching alternative from the question bank.

```typescript
export async function swapQuestionAction(
  currentQuestionsOrIds: string[] | HydratedQuestion[],
  targetQuestionId: string,
  config: PaperConfig
): Promise<ExtendedSwapResult>
```

#### Parameters

- `currentQuestionsOrIds` (`string[] | HydratedQuestion[]`): Array of questions or question IDs in the current active paper.
- `targetQuestionId` (`string`): The unique ID of the question to be replaced.
- `config` (`PaperConfig`): The active blueprint configuration.

#### Returns

- `Promise<ExtendedSwapResult>`:
  - `success` (`boolean`): True if a valid alternative was found and replaced.
  - `swappedQuestion` (`HydratedQuestion`): The newly selected replacement question.
  - `originalQuestion` (`HydratedQuestion`): The original question that was replaced.
  - `paper` (`GenerationResult`): The updated paper result with recalculated deviations.
  - `fallbackAvailable` (`boolean`): True if no database alternative exists, indicating AI generation fallback is available.
  - `reason` (`string`): Detailed explanation of the outcome.

---

### `enhanceQuestionAction`

Generates an AI-assisted phrasing enhancement preview for a single question using Groq API and safety validation.

```typescript
export async function enhanceQuestionAction(
  questionIdOrObject: string | HydratedQuestion
): Promise<AIEnhanceResult>
```

#### Parameters

- `questionIdOrObject` (`string | HydratedQuestion`): Question ID or full question object.

#### Returns

- `Promise<AIEnhanceResult>`:
  - `success` (`boolean`): True if enhancement was generated and passed safety gates.
  - `originalQuestion` (`HydratedQuestion`): Original unmodified question object.
  - `enhancedQuestion` (`HydratedQuestion`): Enhanced question with revised phrasing.
  - `previewText` (`string`): Preview string for teacher review.
  - `changesSummary` (`string`): Pedagogical rationale for the changes.
  - `reason` (`string`): Rejection reason if safety gate failed.

---

### `applyQuestionEnhancementAction`

Applies a reviewed question enhancement to the active paper and re-validates the paper structure.

```typescript
export async function applyQuestionEnhancementAction(
  currentQuestions: HydratedQuestion[],
  targetQuestionId: string,
  enhancedText: string,
  config: PaperConfig
): Promise<ApplyEnhancementResult>
```

#### Parameters

- `currentQuestions` (`HydratedQuestion[]`): Current array of questions in the paper.
- `targetQuestionId` (`string`): ID of the question to update.
- `enhancedText` (`string`): Teacher-approved enhanced question stem text.
- `config` (`PaperConfig`): Active blueprint configuration.

#### Returns

- `Promise<ApplyEnhancementResult>`: Contains `success`, updated `paper`, and `updatedQuestion`.

---

### `generateSimilarQuestionAction`

Authors a brand new question testing the same syllabus concept, difficulty, and mark value as a reference question.

```typescript
export async function generateSimilarQuestionAction(
  targetQuestionOrId: string | HydratedQuestion,
  existingQuestions?: HydratedQuestion[]
): Promise<AIGenerateSimilarResult>
```

#### Parameters

- `targetQuestionOrId` (`string | HydratedQuestion`): Target question to match.
- `existingQuestions` (`HydratedQuestion[]`, optional): Active paper questions to prevent collisions.

#### Returns

- `Promise<AIGenerateSimilarResult>`: Contains `success`, `originalQuestion`, and newly authored `generatedQuestion`.

---

### `applySimilarQuestionAction`

Applies a generated similar question into the active paper at the target question's exact position.

```typescript
export async function applySimilarQuestionAction(
  currentQuestions: HydratedQuestion[],
  targetQuestionId: string,
  generatedQuestion: HydratedQuestion,
  config: PaperConfig
): Promise<ApplySimilarQuestionResult>
```

---

## 4. Core Library APIs

### Deterministic Generator Engine (`lib/generator`)

#### `generatePaper(config, questionPool?, options?): Promise<GenerationResult>`
Master orchestration function. Validates input schema, executes 0/1 knapsack feasibility analysis, performs Mark-Bucketed DP Beam Search with 1-Opt local optimization, validates constraints independently, and generates a structured result.

#### `swapQuestion(currentQuestions, targetQuestionId, config, availablePool?): Promise<SwapQuestionResult>`
Replaces a single question with an exact-matching alternative from the pool while preserving all other question positions, mark totals, and section allocations.

#### `validatePaper(paper, config): ValidationReport`
Independently verifies a set of questions against a blueprint without trusting generator state. Computes actual total marks, duplicate detection, topic coverage, and section distribution.

#### `checkFeasibility(config, availableQuestions): FeasibilityReport`
Pre-generation capacity analyzer. Uses dynamic programming 0/1 subset-sum reachability to test if exact total marks can be formed, and flags chapter/type capacity bottlenecks.

#### `calculateTargetMarks(config): PaperTargetBreakdown`
Computes exact fractional target marks for difficulty, question types, and topics from percentage distributions.

#### `calculateActualMarks(questions): PaperActualBreakdown`
Aggregates actual marks directly from question objects and groups them into standard examination sections (`sectionA_MCQ`, `sectionB_ShortAnswer`, `sectionC_LongAnswer`).

#### `calculateDeviations(actual, targets, config): PaperDeviations`
Calculates half-L1 Total Variation Distance deviations across all dimensions and computes composite objective penalty score.

---

### Question Data Layer (`lib/questions.ts`)

#### `getQuestions(filters): Promise<HydratedQuestion[]>`
Retrieves questions matching multi-dimensional filters (`board`, `grade`, `subject`, `topic`, `difficulty`, `type`, `marks`).

#### `getQuestionsBySubject(subject, board?, grade?): Promise<HydratedQuestion[]>`
Fetches all questions for a specific subject (`MATHEMATICS` or `SCIENCE`).

#### `getQuestionById(id): Promise<HydratedQuestion | null>`
Retrieves a single question by its primary key ID.

#### `getQuestionsByIds(ids): Promise<HydratedQuestion[]>`
Retrieves multiple questions by their IDs preserving the order of the input array.

---

### AI Enhancement & Safety Engine (`lib/ai`)

#### `enhanceQuestion(question, options?): Promise<AIEnhanceResult>`
Sends question to Groq LLM (`openai/gpt-oss-120b`) for phrasing refinement and passes output through safety validators.

#### `generateSimilarQuestion(targetQuestion, options?): Promise<AIGenerateSimilarResult>`
Creates an original question matching target curriculum metadata.

#### `validateMathematicsSafety(originalText, enhancedText): AISafetyValidationResult`
Enforces 100% preservation of numerical constants, negative signs, radicals, polynomials, variables, and trigonometric functions.

#### `validateScienceSafety(originalText, enhancedText): AISafetyValidationResult`
Enforces 100% preservation of chemical formulas (e.g., $\text{CO}_2, \text{MnO}_2$), physical quantities, and units (e.g., $^\circ\text{C}, \Omega, \text{cm}$).

#### `checkGroqAvailability(customApiKey?): Promise<GroqAvailabilityResult>`
Checks if the Groq AI service is configured and ready on the server.

---

### Vector PDF Generation (`lib/pdf`)

#### `generatePaperPdf(result: GenerationResult): Promise<Uint8Array>`
Constructs an official, clean, multi-page vector A4 CBSE examination paper PDF using `pdf-lib`. Includes running headers, right-aligned marks, and footers with pagination.

#### `downloadPaperPdf(result: GenerationResult): Promise<void>`
Client-side helper that invokes `generatePaperPdf` and triggers a browser file download.

---

## 5. Data Models & TypeScript Schemas

### `PaperConfig` Schema

```typescript
export interface PaperConfig {
  board: "CBSE";
  grade: "CLASS_10";
  subject: "MATHEMATICS" | "SCIENCE";
  totalMarks: number; // Integer between 1 and 200
  difficultyDistribution: {
    EASY: number;   // 0 - 100%
    MEDIUM: number; // 0 - 100%
    HARD: number;   // 0 - 100%
  }; // Sum must equal 100%
  questionTypeDistribution: {
    MCQ: number;          // 0 - 100%
    SHORT_ANSWER: number; // 0 - 100%
    LONG_ANSWER: number;  // 0 - 100%
  }; // Sum must equal 100%
  topicDistribution: Record<string, number>; // Sum must equal 100%
}
```

---

### `GenerationResult` Contract

```typescript
export interface GenerationResult {
  status: "EXACT" | "PARTIAL" | "IMPOSSIBLE";
  questions: HydratedQuestion[];
  requested: PaperTargetBreakdown;
  actual: PaperActualBreakdown;
  deviations: PaperDeviations;
  violations: ConstraintViolation[];
  score: number;
  explanation: string;
  executionTimeMs: number;
}
```

---

### `HydratedQuestion` Contract

```typescript
export interface HydratedQuestion {
  id: string;
  board: "CBSE";
  grade: "CLASS_10";
  subject: "MATHEMATICS" | "SCIENCE";
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  type: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER";
  marks: number;
  question: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### `ConstraintViolation` Model

```typescript
export interface ConstraintViolation {
  type:
    | "INSUFFICIENT_TOTAL_CAPACITY"
    | "INSUFFICIENT_DIFFICULTY_CAPACITY"
    | "INSUFFICIENT_QUESTION_TYPE_CAPACITY"
    | "INSUFFICIENT_TOPIC_CAPACITY"
    | "EMPTY_QUESTION_BANK"
    | "UNREACHABLE_TOTAL_MARKS"
    | "DISTRIBUTION_DEVIATION"
    | "SPARSE_INTERSECTION";
  dimension?: "totalMarks" | "difficulty" | "type" | "topic" | "pool";
  value?: string;
  requestedMarks?: number;
  availableMarks?: number;
  message: string;
}
```

---

## 6. Error Handling & Status Codes

| Error Scenario | Layer | Behavior |
|---|---|---|
| **Invalid Blueprint Percentages** (sum $\neq 100\%$) | Zod Schema / Server Action | Rejected with detailed field paths and error messages. |
| **Unreachable Total Marks** | Feasibility Engine | Returns `status: "IMPOSSIBLE"` with `closestAchievableMarks`. |
| **Exhausted Pool Alternatives on Swap** | Swap Engine | Returns `success: false` with `fallbackAvailable: true` without mutating active paper. |
| **AI Altered Formula/Number** | AI Safety Gate | Enhancement rejected immediately; original question preserved intact. |
| **Missing GROQ_API_KEY** | Server Action | Returns graceful failure response; core deterministic generator remains 100% operational. |
| **Malformed PDF Request** | REST Endpoint | Returns HTTP `400 Bad Request` with structured JSON error. |
