/**
 * Deterministic Question Paper Generator Engine Module
 *
 * Provides:
 * - Deterministic mark-bucketed Dynamic Programming beam search & 1-opt local search optimization
 * - 0/1 Knapsack subset-sum reachability & multi-dimensional capacity feasibility checks
 * - Pedagogical scoring & deviation metric calculation
 * - Independent validation gate
 * - Single-question deterministic swap engine
 */

export * from "./types";
export * from "./feasibility";
export * from "./scoring";
export * from "./candidateSearch";
export * from "./validator";
export * from "./generatePaper";
export * from "./swapQuestion";

