import { HydratedQuestion } from "@/lib/questions";
import { PaperConfig } from "@/types/config";
import { calculateTargetMarks, scorePaper, SCORING_WEIGHTS } from "./scoring";

export interface CandidateSearchOptions {
  beamWidthPerMark?: number;
  timeLimitMs?: number;
}

export interface CandidateSearchResult {
  bestPaper: HydratedQuestion[];
  bestScore: number;
  isExactTotal: boolean;
  totalEvaluatedCandidates: number;
  nodeVisits: number;
  executionTimeMs: number;
}

interface DPState {
  questions: HydratedQuestion[];
  marks: number;
  score: number;
  idSignature: string;
  diffEasy: number;
  diffMed: number;
  diffHard: number;
  typeMCQ: number;
  typeSA: number;
  typeLA: number;
  topicMarks: Record<string, number>;
}

interface TopicRatio {
  topic: string;
  ratio: number;
}

/**
 * Fast O(1) partial state scoring using precalculated distribution ratios.
 */
function computeScoreForPartialState(
  state: DPState,
  totalMarks: number,
  easyRatio: number,
  medRatio: number,
  hardRatio: number,
  mcqRatio: number,
  saRatio: number,
  laRatio: number,
  topicRatios: TopicRatio[]
): number {
  const M = state.marks;
  if (M === 0) return 1000;

  // Target ratios scaled to current partial sum M
  const diffDev =
    (Math.abs(state.diffEasy - easyRatio * M) +
      Math.abs(state.diffMed - medRatio * M) +
      Math.abs(state.diffHard - hardRatio * M)) /
    2;

  const typeDev =
    (Math.abs(state.typeMCQ - mcqRatio * M) +
      Math.abs(state.typeSA - saRatio * M) +
      Math.abs(state.typeLA - laRatio * M)) /
    2;

  let topicDevSum = 0;
  for (let i = 0; i < topicRatios.length; i++) {
    const tr = topicRatios[i];
    const actTopic = state.topicMarks[tr.topic] || 0;
    topicDevSum += Math.abs(actTopic - tr.ratio * M);
  }
  const topicDev = topicDevSum / 2;

  const progressRatio = M / totalMarks;
  const normalizedPenalty =
    (typeDev * SCORING_WEIGHTS.QUESTION_TYPE_WEIGHT +
      diffDev * SCORING_WEIGHTS.DIFFICULTY_WEIGHT +
      topicDev * SCORING_WEIGHTS.TOPIC_WEIGHT) /
    (M + 1);

  return normalizedPenalty * 100 - progressRatio * 10;
}

/**
 * Multi-criteria deterministic optimization engine.
 * Uses Mark-Bucketed Dynamic Programming Beam Search combined with
 * Multi-Mark Local Search optimization to generate syllabus-balanced papers.
 */
export function searchCandidatePapers(
  availableQuestions: HydratedQuestion[],
  config: PaperConfig,
  options: CandidateSearchOptions = {}
): CandidateSearchResult {
  const startTime = Date.now();
  const {
    beamWidthPerMark = 50,
    timeLimitMs = 5000,
  } = options;

  const targets = calculateTargetMarks(config);
  const targetTotal = config.totalMarks;

  const easyRatio = config.difficultyDistribution.EASY / 100;
  const medRatio = config.difficultyDistribution.MEDIUM / 100;
  const hardRatio = config.difficultyDistribution.HARD / 100;
  const mcqRatio = config.questionTypeDistribution.MCQ / 100;
  const saRatio = config.questionTypeDistribution.SHORT_ANSWER / 100;
  const laRatio = config.questionTypeDistribution.LONG_ANSWER / 100;
  const topicRatios: TopicRatio[] = Object.entries(config.topicDistribution).map(
    ([topic, pct]) => ({ topic, ratio: pct / 100 })
  );

  // 1. Group questions by type and topic with balanced difficulty ordering
  const typeBuckets: Record<string, Record<string, HydratedQuestion[]>> = {
    LONG_ANSWER: {},
    SHORT_ANSWER: {},
    MCQ: {},
  };

  for (const q of availableQuestions) {
    const t = q.type;
    const top = q.topic;
    if (!typeBuckets[t]) typeBuckets[t] = {};
    if (!typeBuckets[t][top]) typeBuckets[t][top] = [];
    typeBuckets[t][top].push(q);
  }

  // Difficulty cycle: HARD, MEDIUM, EASY to ensure higher cognitive levels are represented
  const diffOrder: Record<string, number> = { HARD: 1, MEDIUM: 2, EASY: 3 };
  for (const t of Object.keys(typeBuckets)) {
    for (const top of Object.keys(typeBuckets[t])) {
      typeBuckets[t][top].sort((a, b) => {
        const dA = diffOrder[a.difficulty] || 4;
        const dB = diffOrder[b.difficulty] || 4;
        if (dA !== dB) return dA - dB;
        if (b.marks !== a.marks) return b.marks - a.marks; // Higher marks first within type
        return a.id.localeCompare(b.id);
      });
    }
  }

  // Interleave question types (LA, SA, MCQ) and topics evenly in each round
  const sortedPool: HydratedQuestion[] = [];
  const topics = Array.from(
    new Set([
      ...Object.keys(typeBuckets.LONG_ANSWER),
      ...Object.keys(typeBuckets.SHORT_ANSWER),
      ...Object.keys(typeBuckets.MCQ),
    ])
  ).sort();

  let hasMore = true;
  let roundIdx = 0;
  while (hasMore) {
    hasMore = false;
    for (const top of topics) {
      if (typeBuckets.LONG_ANSWER[top] && roundIdx < typeBuckets.LONG_ANSWER[top].length) {
        sortedPool.push(typeBuckets.LONG_ANSWER[top][roundIdx]);
        hasMore = true;
      }
      if (typeBuckets.SHORT_ANSWER[top] && roundIdx < typeBuckets.SHORT_ANSWER[top].length) {
        sortedPool.push(typeBuckets.SHORT_ANSWER[top][roundIdx]);
        hasMore = true;
      }
      if (typeBuckets.MCQ[top] && roundIdx < typeBuckets.MCQ[top].length) {
        sortedPool.push(typeBuckets.MCQ[top][roundIdx]);
        hasMore = true;
      }
    }
    roundIdx++;
  }

  // 2. Mark-Bucketed DP Table: dp[m] stores top candidate states summing to m marks
  const dp: DPState[][] = Array.from({ length: targetTotal + 1 }, () => []);

  // Initial base state (0 marks)
  dp[0].push({
    questions: [],
    marks: 0,
    score: 0,
    idSignature: "",
    diffEasy: 0,
    diffMed: 0,
    diffHard: 0,
    typeMCQ: 0,
    typeSA: 0,
    typeLA: 0,
    topicMarks: {},
  });

  let totalEvaluations = 0;
  let nodeVisits = 0;

  // 3. Process each question (0/1 Knapsack with multi-criteria beam pruning)
  for (const q of sortedPool) {
    if (Date.now() - startTime > timeLimitMs) break;

    const qMarks = q.marks;
    const isEasy = q.difficulty === "EASY" ? qMarks : 0;
    const isMed = q.difficulty === "MEDIUM" ? qMarks : 0;
    const isHard = q.difficulty === "HARD" ? qMarks : 0;
    const isMCQ = q.type === "MCQ" ? qMarks : 0;
    const isSA = q.type === "SHORT_ANSWER" ? qMarks : 0;
    const isLA = q.type === "LONG_ANSWER" ? qMarks : 0;
    const qTopic = q.topic;

    // Iterate backwards from targetTotal - qMarks down to 0
    for (let m = targetTotal - qMarks; m >= 0; m--) {
      const currentBucket = dp[m];
      if (currentBucket.length === 0) continue;

      const nextM = m + qMarks;
      const nextBucket = dp[nextM];

      for (const state of currentBucket) {
        nodeVisits++;
        totalEvaluations++;

        const newQuestions = [...state.questions, q];
        const newSig = state.idSignature ? `${state.idSignature},${q.id}` : q.id;

        const newTopicMarks: Record<string, number> = { ...state.topicMarks };
        newTopicMarks[qTopic] = (newTopicMarks[qTopic] || 0) + qMarks;

        const newState: DPState = {
          questions: newQuestions,
          marks: nextM,
          score: 0,
          idSignature: newSig,
          diffEasy: state.diffEasy + isEasy,
          diffMed: state.diffMed + isMed,
          diffHard: state.diffHard + isHard,
          typeMCQ: state.typeMCQ + isMCQ,
          typeSA: state.typeSA + isSA,
          typeLA: state.typeLA + isLA,
          topicMarks: newTopicMarks,
        };

        if (nextM === targetTotal) {
          newState.score = scorePaper(newQuestions, config, targets);
        } else {
          newState.score = computeScoreForPartialState(
            newState,
            targetTotal,
            easyRatio,
            medRatio,
            hardRatio,
            mcqRatio,
            saRatio,
            laRatio,
            topicRatios
          );
        }

        nextBucket.push(newState);
      }

      // Prune nextBucket to top `beamWidthPerMark` best candidates with deterministic tie-breaking
      if (nextBucket.length > beamWidthPerMark) {
        nextBucket.sort((a, b) => {
          if (Math.abs(a.score - b.score) > 1e-5) {
            return a.score - b.score;
          }
          return a.idSignature.localeCompare(b.idSignature);
        });

        // Deduplicate signatures
        const seenSigs = new Set<string>();
        const pruned: DPState[] = [];
        for (const s of nextBucket) {
          if (!seenSigs.has(s.idSignature)) {
            seenSigs.add(s.idSignature);
            pruned.push(s);
            if (pruned.length >= beamWidthPerMark) break;
          }
        }
        dp[nextM] = pruned;
      }
    }
  }

  // 4. Extract best exact candidate
  let bestPaper: HydratedQuestion[] = [];
  let bestScore = Infinity;
  let isExactTotal = false;

  const exactBucket = dp[targetTotal];
  if (exactBucket && exactBucket.length > 0) {
    for (const cand of exactBucket) {
      const exactScore = scorePaper(cand.questions, config, targets);
      if (exactScore < bestScore) {
        bestScore = exactScore;
        bestPaper = cand.questions;
      }
    }
    isExactTotal = true;

    // 5. Deterministic Local Optimization (1-for-1 and 2-for-1 replacement passes)
    const selectedIds = new Set(bestPaper.map((q) => q.id));
    const unusedQuestions = sortedPool.filter((q) => !selectedIds.has(q.id));

    let improved = true;
    let localPasses = 0;
    while (improved && localPasses < 12) {
      improved = false;
      localPasses++;

      // Pass A: 1-for-1 equal mark swaps
      for (let i = 0; i < bestPaper.length; i++) {
        const currentQ = bestPaper[i];
        for (const candidateQ of unusedQuestions) {
          if (candidateQ.marks === currentQ.marks && !selectedIds.has(candidateQ.id)) {
            const testPaper = [...bestPaper];
            testPaper[i] = candidateQ;
            const newScore = scorePaper(testPaper, config, targets);

            if (newScore < bestScore - 1e-4) {
              bestScore = newScore;
              selectedIds.delete(currentQ.id);
              selectedIds.add(candidateQ.id);
              bestPaper = testPaper;
              improved = true;
              break;
            }
          }
        }
        if (improved) break;
      }

      // Pass B: 2-for-1 swaps (e.g. replace two questions with one equivalent mark question)
      if (!improved && bestPaper.length >= 2) {
        for (let i = 0; i < bestPaper.length - 1; i++) {
          for (let j = i + 1; j < bestPaper.length; j++) {
            const sumMarks = bestPaper[i].marks + bestPaper[j].marks;
            for (const candidateQ of unusedQuestions) {
              if (candidateQ.marks === sumMarks && !selectedIds.has(candidateQ.id)) {
                const testPaper = bestPaper.filter((_, idx) => idx !== i && idx !== j);
                testPaper.push(candidateQ);
                const newScore = scorePaper(testPaper, config, targets);

                if (newScore < bestScore - 1e-4) {
                  bestScore = newScore;
                  selectedIds.delete(bestPaper[i].id);
                  selectedIds.delete(bestPaper[j].id);
                  selectedIds.add(candidateQ.id);
                  bestPaper = testPaper;
                  improved = true;
                  break;
                }
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
      }

      // Pass C: 1-for-2 swaps (e.g. replace one larger question with two smaller unused questions)
      if (!improved && bestPaper.length < 60) {
        for (let i = 0; i < bestPaper.length; i++) {
          const targetMarks = bestPaper[i].marks;
          if (targetMarks >= 2) {
            for (let u1 = 0; u1 < Math.min(unusedQuestions.length - 1, 40); u1++) {
              const q1 = unusedQuestions[u1];
              if (selectedIds.has(q1.id) || q1.marks >= targetMarks) continue;
              for (let u2 = u1 + 1; u2 < Math.min(unusedQuestions.length, 40); u2++) {
                const q2 = unusedQuestions[u2];
                if (selectedIds.has(q2.id)) continue;
                if (q1.marks + q2.marks === targetMarks) {
                  const testPaper = bestPaper.filter((_, idx) => idx !== i);
                  testPaper.push(q1, q2);
                  const newScore = scorePaper(testPaper, config, targets);
                  if (newScore < bestScore - 1e-4) {
                    bestScore = newScore;
                    selectedIds.delete(bestPaper[i].id);
                    selectedIds.add(q1.id);
                    selectedIds.add(q2.id);
                    bestPaper = testPaper;
                    improved = true;
                    break;
                  }
                }
              }
              if (improved) break;
            }
          }
          if (improved) break;
        }
      }

      // Pass D: 2-for-2 equal sum swaps for denomination mixing
      if (!improved && bestPaper.length >= 2) {
        for (let i = 0; i < bestPaper.length - 1; i++) {
          for (let j = i + 1; j < bestPaper.length; j++) {
            const sumMarks = bestPaper[i].marks + bestPaper[j].marks;
            for (let u1 = 0; u1 < Math.min(unusedQuestions.length - 1, 30); u1++) {
              const q1 = unusedQuestions[u1];
              if (selectedIds.has(q1.id) || q1.marks >= sumMarks) continue;
              for (let u2 = u1 + 1; u2 < Math.min(unusedQuestions.length, 30); u2++) {
                const q2 = unusedQuestions[u2];
                if (selectedIds.has(q2.id)) continue;
                if (q1.marks + q2.marks === sumMarks) {
                  if (
                    (q1.marks === bestPaper[i].marks && q2.marks === bestPaper[j].marks) ||
                    (q1.marks === bestPaper[j].marks && q2.marks === bestPaper[i].marks)
                  ) {
                    continue;
                  }
                  const testPaper = bestPaper.filter((_, idx) => idx !== i && idx !== j);
                  testPaper.push(q1, q2);
                  const newScore = scorePaper(testPaper, config, targets);
                  if (newScore < bestScore - 1e-4) {
                    bestScore = newScore;
                    selectedIds.delete(bestPaper[i].id);
                    selectedIds.delete(bestPaper[j].id);
                    selectedIds.add(q1.id);
                    selectedIds.add(q2.id);
                    bestPaper = testPaper;
                    improved = true;
                    break;
                  }
                }
              }
              if (improved) break;
            }
            if (improved) break;
          }
          if (improved) break;
        }
      }
    }
  } else {
    // Fallback to closest achievable marks
    let closestM = -1;
    let minDiff = Infinity;
    for (let m = targetTotal; m >= 0; m--) {
      if (dp[m].length > 0) {
        const diff = Math.abs(m - targetTotal);
        if (diff < minDiff) {
          minDiff = diff;
          closestM = m;
        }
      }
    }

    if (closestM >= 0 && dp[closestM].length > 0) {
      dp[closestM].sort((a, b) => a.score - b.score);
      bestPaper = dp[closestM][0].questions;
      bestScore = scorePaper(bestPaper, config, targets);
    } else {
      bestPaper = [];
      bestScore = 999999;
    }
    isExactTotal = false;
  }

  // 6. Sort final paper questions: Section A (MCQ), Section B (Short Answer), Section C (Long Answer)
  bestPaper.sort((a, b) => {
    const typeOrder: Record<string, number> = { MCQ: 1, SHORT_ANSWER: 2, LONG_ANSWER: 3 };
    const orderA = typeOrder[a.type] || 4;
    const orderB = typeOrder[b.type] || 4;
    if (orderA !== orderB) return orderA - orderB;
    if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
    if (a.marks !== b.marks) return a.marks - b.marks;
    return a.id.localeCompare(b.id);
  });

  const executionTimeMs = Date.now() - startTime;

  return {
    bestPaper,
    bestScore,
    isExactTotal,
    totalEvaluatedCandidates: totalEvaluations,
    nodeVisits,
    executionTimeMs,
  };
}
