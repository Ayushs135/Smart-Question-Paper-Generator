import { prisma } from "../lib/prisma";

async function main() {
  const math = await prisma.question.findMany({ where: { subject: "MATHEMATICS" } });
  const science = await prisma.question.findMany({ where: { subject: "SCIENCE" } });

  console.log("=== MATHEMATICS QUESTION BANK ===");
  console.log("Total Questions:", math.length);

  const mathByType: Record<string, number> = {};
  const mathByMarks: Record<number, number> = {};
  const mathByTypeMarks: Record<string, Record<number, number>> = {};
  const mathByTopic: Record<string, number> = {};
  const mathByDiff: Record<string, number> = {};

  for (const q of math) {
    mathByType[q.type] = (mathByType[q.type] || 0) + 1;
    mathByMarks[q.marks] = (mathByMarks[q.marks] || 0) + 1;
    mathByTypeMarks[q.type] = mathByTypeMarks[q.type] || {};
    mathByTypeMarks[q.type][q.marks] = (mathByTypeMarks[q.type][q.marks] || 0) + 1;
    mathByTopic[q.topic] = (mathByTopic[q.topic] || 0) + 1;
    mathByDiff[q.difficulty] = (mathByDiff[q.difficulty] || 0) + 1;
  }

  console.log("By Type:", mathByType);
  console.log("By Marks:", mathByMarks);
  console.log("By Type x Marks:", mathByTypeMarks);
  console.log("By Difficulty:", mathByDiff);
  console.log("By Topic count:", Object.keys(mathByTopic).length, "topics");

  console.log("\n=== SCIENCE QUESTION BANK ===");
  console.log("Total Questions:", science.length);

  const sciByType: Record<string, number> = {};
  const sciByMarks: Record<number, number> = {};
  const sciByTypeMarks: Record<string, Record<number, number>> = {};

  for (const q of science) {
    sciByType[q.type] = (sciByType[q.type] || 0) + 1;
    sciByMarks[q.marks] = (sciByMarks[q.marks] || 0) + 1;
    sciByTypeMarks[q.type] = sciByTypeMarks[q.type] || {};
    sciByTypeMarks[q.type][q.marks] = (sciByTypeMarks[q.type][q.marks] || 0) + 1;
  }

  console.log("By Type:", sciByType);
  console.log("By Marks:", sciByMarks);
  console.log("By Type x Marks:", sciByTypeMarks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
