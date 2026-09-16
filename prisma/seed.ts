import { prisma } from "../lib/prisma";
import { MATH_QUESTIONS } from "./seed-data/math-questions";
import { SCIENCE_QUESTIONS } from "./seed-data/science-questions";
import { EXPANDED_MATH_QUESTIONS } from "./seed-data/math-questions-expanded";
import { EXPANDED_SCIENCE_QUESTIONS } from "./seed-data/science-questions-expanded";
import { questionInputSchema, QuestionInput } from "../types/question";

async function main() {
  console.log(" Starting CBSE Class 10 Question Bank Seeding...\n");

  // 1. Clean existing questions safely
  const deleted = await prisma.question.deleteMany({});
  console.log(` Cleared ${deleted.count} existing records from the database.`);

  const allRawQuestions: QuestionInput[] = [
    ...MATH_QUESTIONS,
    ...EXPANDED_MATH_QUESTIONS,
    ...SCIENCE_QUESTIONS,
    ...EXPANDED_SCIENCE_QUESTIONS,
  ];

  console.log(` Validating and preparing ${allRawQuestions.length} CBSE Class 10 questions...`);

  // 2. Validate all questions using Zod and normalize MCQ options
  const validatedQuestions = allRawQuestions.map((q, idx) => {
    try {
      const validated = questionInputSchema.parse(q);
      const normalizedOptions = validated.options
        ? validated.options.map((opt) =>
            opt.trim().replace(/^(\([A-Za-z0-9]+\)|[A-Za-z0-9]+[\)\.\:\-])\s*/, "").trim()
          )
        : null;

      return {
        board: validated.board,
        grade: validated.grade,
        subject: validated.subject,
        topic: validated.topic,
        difficulty: validated.difficulty,
        type: validated.type,
        marks: validated.marks,
        question: validated.question,
        options: normalizedOptions ? JSON.stringify(normalizedOptions) : null,
        answer: validated.answer,
        explanation: validated.explanation,
      };
    } catch (err) {
      console.error(`[FAIL] Validation error at question index ${idx} (${q.topic}):`, err);
      throw err;
    }
  });

  // 3. Batch insert questions into SQLite via Prisma
  for (const q of validatedQuestions) {
    await prisma.question.create({
      data: q,
    });
  }

  // 4. Calculate Distribution Stats
  const totalCount = await prisma.question.count();
  const cbseCount = await prisma.question.count({ where: { board: "CBSE" } });
  const class10Count = await prisma.question.count({ where: { grade: "CLASS_10" } });

  const mathCount = await prisma.question.count({ where: { subject: "MATHEMATICS" } });
  const scienceCount = await prisma.question.count({ where: { subject: "SCIENCE" } });

  const easyCount = await prisma.question.count({ where: { difficulty: "EASY" } });
  const mediumCount = await prisma.question.count({ where: { difficulty: "MEDIUM" } });
  const hardCount = await prisma.question.count({ where: { difficulty: "HARD" } });

  const mcqCount = await prisma.question.count({ where: { type: "MCQ" } });
  const shortAnswerCount = await prisma.question.count({ where: { type: "SHORT_ANSWER" } });
  const longAnswerCount = await prisma.question.count({ where: { type: "LONG_ANSWER" } });

  console.log("\n=======================================================");
  console.log("   QUESTION BANK SEEDING COMPLETED SUCCESSFULLY");
  console.log("=======================================================");
  console.log(`Questions seeded: ${totalCount}`);
  console.log("\nBoard:");
  console.log(`  CBSE: ${cbseCount}`);
  console.log("\nGrade:");
  console.log(`  Class 10: ${class10Count}`);
  console.log("\nSubjects:");
  console.log(`  Mathematics: ${mathCount}`);
  console.log(`  Science:     ${scienceCount}`);
  console.log("\nDifficulty:");
  console.log(`  Easy:   ${easyCount}`);
  console.log(`  Medium: ${mediumCount}`);
  console.log(`  Hard:   ${hardCount}`);
  console.log("\nQuestion Types:");
  console.log(`  MCQ:          ${mcqCount}`);
  console.log(`  Short Answer: ${shortAnswerCount}`);
  console.log(`  Long Answer:  ${longAnswerCount}`);
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("[FAIL] Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
