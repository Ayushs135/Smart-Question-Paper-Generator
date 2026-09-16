import { generatePaper, validatePaper } from "../lib/generator";
import { getQuestionsBySubject } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function main() {
  try {
    const mathQuestions = await getQuestionsBySubject("MATHEMATICS");
    const scienceQuestions = await getQuestionsBySubject("SCIENCE");

    const totals = [20, 25, 30, 40, 50];

    console.log("=========================================================================");
    console.log(" TESTING PURE LONG-ANSWER SECTION MARKS ACROSS SCALES (20M - 50M)");
    console.log("=========================================================================");

    for (const total of totals) {
      const cfg: PaperConfig = {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "MATHEMATICS",
        totalMarks: total,
        difficultyDistribution: { EASY: 20, MEDIUM: 50, HARD: 30 },
        topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
        questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 100 },
      };

      const res = await generatePaper(cfg, mathQuestions);
      const val = validatePaper(res.questions, cfg);
      const laSum = res.actual.questionTypes.LONG_ANSWER;
      const mcqSum = res.actual.questionTypes.MCQ;
      const saSum = res.actual.questionTypes.SHORT_ANSWER;
      const laCounts = res.actual.markMix.LONG_ANSWER.filter((c) => c.questionCount > 0);

      console.log(`\n Math ${total}M Pure Long Answer:`);
      console.log(`   Status: ${res.status} | Total Marks: ${res.actual.totalMarks}/${total} | Valid: ${val.isValid}`);
      console.log(`   LA Marks: ${laSum}M | MCQ: ${mcqSum}M | SA: ${saSum}M`);
      console.log(`   Denominations used: ${laCounts.map((c) => `${c.marks}M(${c.questionCount})`).join(", ")}`);
      console.log(`   Questions: ${res.questions.map((q) => `${q.marks}M [${q.topic}]`).join(" + ")} = ${res.actual.totalMarks}M`);

      if (res.actual.totalMarks !== total || laSum !== total) {
        throw new Error(`FAILED: Math ${total}M generated ${res.actual.totalMarks}M (LA: ${laSum}M) instead of ${total}M`);
      }
    }

    for (const total of totals) {
      const cfg: PaperConfig = {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "SCIENCE",
        totalMarks: total,
        difficultyDistribution: { EASY: 20, MEDIUM: 50, HARD: 30 },
        topicDistribution: getEqualTopicDistribution("SCIENCE"),
        questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 100 },
      };

      const res = await generatePaper(cfg, scienceQuestions);
      const val = validatePaper(res.questions, cfg);
      const laSum = res.actual.questionTypes.LONG_ANSWER;
      const mcqSum = res.actual.questionTypes.MCQ;
      const saSum = res.actual.questionTypes.SHORT_ANSWER;
      const laCounts = res.actual.markMix.LONG_ANSWER.filter((c) => c.questionCount > 0);

      console.log(`\n Science ${total}M Pure Long Answer:`);
      console.log(`   Status: ${res.status} | Total Marks: ${res.actual.totalMarks}/${total} | Valid: ${val.isValid}`);
      console.log(`   LA Marks: ${laSum}M | MCQ: ${mcqSum}M | SA: ${saSum}M`);
      console.log(`   Denominations used: ${laCounts.map((c) => `${c.marks}M(${c.questionCount})`).join(", ")}`);
      console.log(`   Questions: ${res.questions.map((q) => `${q.marks}M [${q.topic}]`).join(" + ")} = ${res.actual.totalMarks}M`);

      if (res.actual.totalMarks !== total || laSum !== total) {
        throw new Error(`FAILED: Science ${total}M generated ${res.actual.totalMarks}M (LA: ${laSum}M) instead of ${total}M`);
      }
    }

    console.log("\n[SUCCESS] ALL LONG ANSWER SCALE VERIFICATIONS PASSED WITH 100% ACCURACY!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
