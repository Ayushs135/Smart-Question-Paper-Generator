import { prisma } from "@/lib/prisma";
import type { Question } from "@prisma/client";
import type {
  BoardType,
  GradeType,
  SubjectType,
  DifficultyType,
  QuestionTypeEnum,
  QuestionFilterParams,
} from "@/types/question";

/**
 * Normalizes an MCQ option string by stripping redundant leading labels (e.g. "A)", "(A)", "A.", "A:").
 * Ensures options are stored and rendered cleanly without duplicated prefixes.
 */
export function normalizeOptionText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/^(\([A-Za-z0-9]+\)|[A-Za-z0-9]+[\)\.\:\-])\s*/, "")
    .trim();
}

/**
 * Parses and normalizes the JSON-serialized options array for a question.
 */
export function formatQuestionOptions(optionsJson: string | null): string[] | null {
  if (!optionsJson) return null;
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((opt) => (typeof opt === "string" ? normalizeOptionText(opt) : String(opt)));
  } catch {
    return null;
  }
}

/**
 * Type-safe interface for formatted Question object with parsed options and domain types
 */
export interface HydratedQuestion extends Omit<Question, "options" | "board" | "grade" | "subject" | "difficulty" | "type"> {
  board: BoardType;
  grade: GradeType;
  subject: SubjectType;
  difficulty: DifficultyType;
  type: QuestionTypeEnum;
  options: string[] | null;
}

/**
 * Hydrates a Prisma Question record with parsed options.
 */
export function hydrateQuestion(question: Question): HydratedQuestion {
  return {
    ...question,
    board: question.board as BoardType,
    grade: question.grade as GradeType,
    subject: question.subject as SubjectType,
    difficulty: question.difficulty as DifficultyType,
    type: question.type as QuestionTypeEnum,
    options: formatQuestionOptions(question.options),
  };
}

/**
 * Retrieves questions based on flexible filter criteria.
 * Defaults to Board: CBSE and Grade: CLASS_10.
 */
export async function getQuestions(
  filters: QuestionFilterParams = {}
): Promise<HydratedQuestion[]> {
  const {
    board = "CBSE",
    grade = "CLASS_10",
    subject,
    topic,
    difficulty,
    type,
    marks,
  } = filters;

  const whereClause: {
    board?: string;
    grade?: string;
    subject?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    marks?: number;
  } = {};

  if (board) whereClause.board = board;
  if (grade) whereClause.grade = grade;
  if (subject) whereClause.subject = subject;
  if (topic) whereClause.topic = topic;
  if (difficulty) whereClause.difficulty = difficulty;
  if (type) whereClause.type = type;
  if (marks !== undefined) whereClause.marks = marks;

  const questions = await prisma.question.findMany({
    where: whereClause,
    orderBy: [
      { subject: "asc" },
      { topic: "asc" },
      { marks: "asc" },
    ],
  });

  return questions.map(hydrateQuestion);
}

/**
 * Retrieves all CBSE Class 10 questions.
 */
export async function getAllQuestions(
  board: BoardType = "CBSE",
  grade: GradeType = "CLASS_10"
): Promise<HydratedQuestion[]> {
  return getQuestions({ board, grade });
}

/**
 * Retrieves questions filtered by Subject (MATHEMATICS or SCIENCE).
 */
export async function getQuestionsBySubject(
  subject: SubjectType,
  board: BoardType = "CBSE",
  grade: GradeType = "CLASS_10"
): Promise<HydratedQuestion[]> {
  return getQuestions({ board, grade, subject });
}

/**
 * Retrieves questions filtered by Topic name.
 */
export async function getQuestionsByTopic(
  topic: string,
  subject?: SubjectType,
  board: BoardType = "CBSE",
  grade: GradeType = "CLASS_10"
): Promise<HydratedQuestion[]> {
  return getQuestions({ board, grade, subject, topic });
}

/**
 * Retrieves questions filtered by Difficulty (EASY, MEDIUM, HARD).
 */
export async function getQuestionsByDifficulty(
  difficulty: DifficultyType,
  subject?: SubjectType,
  board: BoardType = "CBSE",
  grade: GradeType = "CLASS_10"
): Promise<HydratedQuestion[]> {
  return getQuestions({ board, grade, subject, difficulty });
}

/**
 * Retrieves questions filtered by QuestionType (MCQ, SHORT_ANSWER, LONG_ANSWER).
 */
export async function getQuestionsByType(
  type: QuestionTypeEnum,
  subject?: SubjectType,
  board: BoardType = "CBSE",
  grade: GradeType = "CLASS_10"
): Promise<HydratedQuestion[]> {
  return getQuestions({ board, grade, subject, type });
}

/**
 * Retrieves questions filtered by exact Mark value.
 */
export async function getQuestionsByMarks(
  marks: number,
  subject?: SubjectType,
  board: BoardType = "CBSE",
  grade: GradeType = "CLASS_10"
): Promise<HydratedQuestion[]> {
  return getQuestions({ board, grade, subject, marks });
}

/**
 * Retrieves a single question by its unique identifier.
 */
export async function getQuestionById(id: string): Promise<HydratedQuestion | null> {
  const question = await prisma.question.findUnique({
    where: { id },
  });

  return question ? hydrateQuestion(question) : null;
}

/**
 * Retrieves multiple questions by their unique identifiers.
 * Preserves the order of the provided IDs and filters out any non-existent questions.
 */
export async function getQuestionsByIds(ids: string[]): Promise<HydratedQuestion[]> {
  if (!ids || ids.length === 0) return [];
  const questions = await prisma.question.findMany({
    where: {
      id: { in: ids },
    },
  });

  const hydratedMap = new Map(questions.map((q) => [q.id, hydrateQuestion(q)]));
  return ids
    .map((id) => hydratedMap.get(id))
    .filter((q): q is HydratedQuestion => q !== undefined);
}

