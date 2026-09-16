import { z } from "zod";

/**
 * CBSE Class 10 Domain Constants & Enums
 */

export const BOARDS = ["CBSE"] as const;
export type BoardType = (typeof BOARDS)[number];

export const GRADES = ["CLASS_10"] as const;
export type GradeType = (typeof GRADES)[number];

export const SUBJECTS = ["MATHEMATICS", "SCIENCE"] as const;
export type SubjectType = (typeof SUBJECTS)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type DifficultyType = (typeof DIFFICULTIES)[number];

export const QUESTION_TYPES = [
  "MCQ",
  "SHORT_ANSWER",
  "LONG_ANSWER",
] as const;
export type QuestionTypeEnum = (typeof QUESTION_TYPES)[number];

/**
 * Standardized CBSE Class 10 Mathematics Topics
 */
export const MATH_TOPICS = [
  "Real Numbers",
  "Polynomials",
  "Pair of Linear Equations in Two Variables",
  "Quadratic Equations",
  "Arithmetic Progressions",
  "Triangles",
  "Coordinate Geometry",
  "Introduction to Trigonometry",
  "Some Applications of Trigonometry",
  "Circles",
  "Areas Related to Circles",
  "Surface Areas and Volumes",
  "Statistics",
  "Probability",
] as const;
export type MathTopic = (typeof MATH_TOPICS)[number];

/**
 * Standardized CBSE Class 10 Science Topics
 */
export const SCIENCE_TOPICS = [
  "Chemical Reactions and Equations",
  "Acids, Bases and Salts",
  "Metals and Non-metals",
  "Carbon and Its Compounds",
  "Life Processes",
  "Control and Coordination",
  "How Do Organisms Reproduce?",
  "Heredity",
  "Light – Reflection and Refraction",
  "Human Eye and the Colourful World",
  "Electricity",
  "Magnetic Effects of Electric Current",
  "Our Environment",
] as const;
export type ScienceTopic = (typeof SCIENCE_TOPICS)[number];

export type TopicType = MathTopic | ScienceTopic;

/**
 * Zod Schemas for Question Validation
 */

export const boardSchema = z.enum(BOARDS);
export const gradeSchema = z.enum(GRADES);
export const subjectSchema = z.enum(SUBJECTS);
export const difficultySchema = z.enum(DIFFICULTIES);
export const questionTypeSchema = z.enum(QUESTION_TYPES);

export const questionOptionSchema = z.string().min(1);

export const questionInputSchema = z
  .object({
    id: z.string().optional(),
    board: boardSchema.default("CBSE"),
    grade: gradeSchema.default("CLASS_10"),
    subject: subjectSchema,
    topic: z.string().min(1, "Topic is required"),
    difficulty: difficultySchema,
    type: questionTypeSchema,
    marks: z.number().int().positive("Marks must be a positive integer"),
    question: z.string().min(3, "Question text must be at least 3 characters"),
    options: z.array(questionOptionSchema).nullable().optional(),
    answer: z.string().min(1, "Answer is required"),
    explanation: z.string().min(1, "Explanation is required"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "MCQ") {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ questions must have at least 2 options (standard CBSE format uses 4 options)",
          path: ["options"],
        });
      }
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

/**
 * Question Filter Interface
 */
export interface QuestionFilterParams {
  board?: BoardType;
  grade?: GradeType;
  subject?: SubjectType;
  topic?: string;
  difficulty?: DifficultyType;
  type?: QuestionTypeEnum;
  marks?: number;
}
