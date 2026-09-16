import { generatePaper, validatePaper } from "../lib/generator";
import { getQuestionsBySubject } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { SubjectType } from "../types/question";
import { prisma } from "../lib/prisma";

interface ScaleAuditRecord {
  subject: SubjectType;
  requestedTotal: number;
  actualTotal: number;
  questionCount: number;
  mcqMarks: number;
  saMarks: number;
  laMarks: number;
  markDenominations: {
    MCQ: string;
    SA: string;
    LA: string;
  };
  difficultyDeviation: string;
  topicDeviation: string;
  questionTypeDeviation: string;
  status: string;
  isValid: boolean;
}

async function auditScales() {
  const scales = [20, 25, 30, 40, 50, 80, 100];
  const subjects: SubjectType[] = ["MATHEMATICS", "SCIENCE"];
  const records: ScaleAuditRecord[] = [];

  try {
    const mathQuestions = await getQuestionsBySubject("MATHEMATICS");
    const scienceQuestions = await getQuestionsBySubject("SCIENCE");

    for (const subject of subjects) {
      const pool = subject === "MATHEMATICS" ? mathQuestions : scienceQuestions;

      for (const total of scales) {
        // Standard realistic CBSE distribution
        let typeDist = { MCQ: 25, SHORT_ANSWER: 50, LONG_ANSWER: 25 };
        if (total === 20) {
          typeDist = { MCQ: 35, SHORT_ANSWER: 40, LONG_ANSWER: 25 };
        } else if (total === 25) {
          typeDist = { MCQ: 36, SHORT_ANSWER: 44, LONG_ANSWER: 20 };
        } else if (total === 30) {
          typeDist = { MCQ: 30, SHORT_ANSWER: 40, LONG_ANSWER: 30 };
        } else if (total === 40) {
          typeDist = { MCQ: 30, SHORT_ANSWER: 45, LONG_ANSWER: 25 };
        } else if (total === 50) {
          typeDist = { MCQ: 28, SHORT_ANSWER: 46, LONG_ANSWER: 26 };
        } else if (total === 80) {
          typeDist = { MCQ: 25, SHORT_ANSWER: 50, LONG_ANSWER: 25 };
        } else if (total === 100) {
          typeDist = { MCQ: 35, SHORT_ANSWER: 40, LONG_ANSWER: 25 };
        }

        const config: PaperConfig = {
          board: "CBSE",
          grade: "CLASS_10",
          subject,
          totalMarks: total,
          difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
          topicDistribution: getEqualTopicDistribution(subject),
          questionTypeDistribution: typeDist,
        };

        const res = await generatePaper(config, pool);
        const val = validatePaper(res.questions, config);

        const mcqCounts = res.actual.markMix.MCQ.filter((c) => c.questionCount > 0)
          .map((c) => `${c.marks}M(${c.questionCount})`)
          .join(", ") || "0";
        const saCounts = res.actual.markMix.SHORT_ANSWER.filter((c) => c.questionCount > 0)
          .map((c) => `${c.marks}M(${c.questionCount})`)
          .join(", ") || "0";
        const laCounts = res.actual.markMix.LONG_ANSWER.filter((c) => c.questionCount > 0)
          .map((c) => `${c.marks}M(${c.questionCount})`)
          .join(", ") || "0";

        records.push({
          subject,
          requestedTotal: total,
          actualTotal: res.actual.totalMarks,
          questionCount: res.questions.length,
          mcqMarks: res.actual.questionTypes.MCQ,
          saMarks: res.actual.questionTypes.SHORT_ANSWER,
          laMarks: res.actual.questionTypes.LONG_ANSWER,
          markDenominations: {
            MCQ: mcqCounts,
            SA: saCounts,
            LA: laCounts,
          },
          difficultyDeviation: `±${res.deviations.difficulty.totalDeviation.toFixed(1)}M`,
          topicDeviation: `±${res.deviations.topics.totalDeviation.toFixed(1)}M`,
          questionTypeDeviation: `±${res.deviations.questionTypes.totalDeviation.toFixed(1)}M`,
          status: res.status,
          isValid: val.isValid,
        });
      }
    }

    console.log(JSON.stringify(records, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

auditScales().catch(console.error);
