import { generatePaper, validatePaper } from "../lib/generator";
import { getQuestionsBySubject } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function testSpeed() {
  const mathPool = await getQuestionsBySubject("MATHEMATICS");
  const sciencePool = await getQuestionsBySubject("SCIENCE");

  console.log(`Loaded ${mathPool.length} Math questions and ${sciencePool.length} Science questions.`);
  
  const scales = [20, 40, 60, 80, 100];
  const start = Date.now();
  let count = 0;

  for (const total of scales) {
    for (const pool of [mathPool, sciencePool]) {
      const subject = pool[0].subject;
      const config: PaperConfig = {
        board: "CBSE",
        grade: "CLASS_10",
        subject,
        totalMarks: total,
        difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
        topicDistribution: getEqualTopicDistribution(subject),
        questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
      };

      const res = await generatePaper(config, pool, { beamWidthPerMark: 30, timeLimitMs: 2000 });
      const val = validatePaper(res.questions, config);
      count++;
      console.log(`[${count}] ${subject} ${total}M: status=${res.status}, valid=${val.isValid}, time=${res.executionTimeMs}ms`);
    }
  }

  console.log(`Total time for ${count} runs: ${Date.now() - start}ms`);
  await prisma.$disconnect();
}

testSpeed().catch(console.error);
