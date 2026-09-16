import { generatePaper, searchCandidatePapers } from "../lib/generator";
import { getQuestionsBySubject } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function profile() {
  const mathQuestions = await getQuestionsBySubject("MATHEMATICS");

  const config100: PaperConfig = {
    board: "CBSE",
    grade: "CLASS_10",
    subject: "MATHEMATICS",
    totalMarks: 100,
    difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
    questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
  };

  console.log("Testing 100M Math paper generation...");
  const t0 = Date.now();
  const res = await generatePaper(config100, mathQuestions);
  const dur = Date.now() - t0;

  console.log("Execution Time:", dur, "ms");
  console.log("Status:", res.status);
  console.log("Total Marks:", res.actual.totalMarks);
  console.log("Question Count:", res.actual.questionCount);
  console.log("Sections count:", {
    MCQ: res.actual.sections.sectionA_MCQ.length,
    SA: res.actual.sections.sectionB_ShortAnswer.length,
    LA: res.actual.sections.sectionC_LongAnswer.length,
  });
  console.log("Actual Marks by Type:", res.actual.questionTypes);
  console.log("Requested Marks by Type:", res.requested.questionTypes);
  console.log("Actual Marks by Difficulty:", res.actual.difficulty);
  console.log("Requested Marks by Difficulty:", res.requested.difficulty);
  console.log("Deviations:", {
    totalMarks: res.deviations.totalMarks,
    typeDev: res.deviations.questionTypes.totalDeviation,
    diffDev: res.deviations.difficulty.totalDeviation,
    topicDev: res.deviations.topics.totalDeviation,
  });
  console.log("Explanation:", res.explanation);
}

profile().catch(console.error).finally(() => prisma.$disconnect());
