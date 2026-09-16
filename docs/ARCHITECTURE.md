# System Architecture & Technical Design

This document details the architectural design, algorithmic models, and safety validation pipelines of the **Smart Question Paper Generator**.

---

## 1. High-Level System Architecture

```text
+-------------------------------------------------------------------------+
|                       Teacher Configuration UI                          |
|  - Subject, Total Marks, Difficulty, Question Types, Topic Weightage    |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|               Zod Schema Validation & Boundary Guard                    |
|  - Enforces 100% sums on all distribution dimensions                    |
|  - Validates subject-specific CBSE Class 10 curriculum topics           |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|               Pre-Search Feasibility Analyzer                           |
|  - 0/1 Knapsack subset-sum DP reachability test                         |
|  - Multi-dimensional capacity bottleneck detection                     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|    Deterministic Multi-Criteria Candidate Search Engine                 |
|  - Mark-Bucketed Dynamic Programming Beam Search (beamWidth = 50)       |
|  - Multi-Pass Deterministic Local Optimization (1-opt & 2-opt swaps)   |
|  - Stable tie-breaking: score -> ID signature                           |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|               Independent Verification Gate                             |
|  - Direct metrics calculation from raw question objects                 |
|  - Duplicate detection and Total Variation Distance evaluation         |
|  - Classification: EXACT (within tolerances) / PARTIAL / IMPOSSIBLE     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                  Teacher Assessment View (UI)                           |
|  - Authentic CBSE Examination Format (Sections A, B, C)                 |
|  - PDF Generation & Vector Export (pdf-lib)                             |
|  - Single-Question Deterministic Swap Engine                            |
|  - Optional Groq AI Enhancement with Math/Science Safety Gates          |
+-------------------------------------------------------------------------+
```

---

## 2. Deterministic Generator Algorithm

### 2.1 Mark-Bucketed Dynamic Programming Beam Search

The core algorithm solves a constrained multi-dimensional optimization problem over a discrete set of questions.

1. **Bucket Grouping**: Questions are grouped into candidate pools by Question Type (`LONG_ANSWER`, `SHORT_ANSWER`, `MCQ`) and Topic, ordered with a balanced difficulty cycle (`HARD -> MEDIUM -> EASY`) and higher mark denominations prioritized.
2. **DP State Representation**:
   $$S = (\text{questions}, \text{marks}, \text{score}, \text{idSignature}, \text{diffEasy}, \text{diffMed}, \text{diffHard}, \text{typeMCQ}, \text{typeSA}, \text{typeLA}, \text{topicMarks})$$
3. **Transition Function**:
   For each question $q$ with mark $m_q$, states in $\text{dp}[m]$ transition to $\text{dp}[m + m_q]$ by appending $q$.
4. **Pruning**:
   Each mark bucket $\text{dp}[m]$ is pruned to the top $K = 50$ states according to the normalized partial penalty score, with deterministic tie-breaking on concatenated question ID signatures.

### 2.2 Objective Scoring Function

The composite objective penalty function is defined as:

$$\text{Score} = \Delta_{\text{TotalMarks}} \cdot W_{\text{Total}} + \Delta_{\text{Type}} \cdot W_{\text{Type}} + \Delta_{\text{Diff}} \cdot W_{\text{Diff}} + \Delta_{\text{Topic}} \cdot W_{\text{Topic}} + P_{\text{MarkMix}} \cdot W_{\text{MarkMix}} + P_{\text{Dup}}$$

#### Penalty Weights ($W$)

| Component | Weight | Rationale |
|---|---|---|
| `TOTAL_MARKS_PENALTY` | 1000 | Strict total marks satisfaction is paramount. |
| `QUESTION_TYPE_WEIGHT` | 25 | High structural importance (MCQ vs SA vs LA). |
| `DIFFICULTY_WEIGHT` | 5 | Cognitive balance across Easy, Medium, Hard. |
| `TOPIC_WEIGHT` | 3 | Broad syllabus coverage across 13-14 chapters. |
| `MARK_MIX_WEIGHT` | 1 | Soft tie-breaker for denomination diversity. |
| `DUPLICATE_PENALTY` | 50,000 | Absolute prohibition against question repetition. |

---

## 3. Independent Validation Pipeline

To ensure absolute algorithmic correctness, validation never relies on internal generator flags:

- **Total Variation Distance**: Calculated as half-L1 norm:
  $$\Delta_{\text{Dimension}} = \frac{1}{2} \sum_{k} |\text{Actual}_k - \text{Requested}_k|$$
- **EXACT Classification Criteria**:
  - Total Mark Deviation $= 0$
  - Difficulty Deviation $\le 3.0\text{ M}$
  - Question Type Deviation $\le 3.0\text{ M}$
  - Topic Deviation $\le 5.0\text{ M}$
  - Zero duplicate question IDs
  - Zero unrequested subject questions

---

## 4. AI Safety & Hallucination Guardrails

```text
Target Question (Math / Science)
               ↓
Groq LLM Phrasing Enhancement Request
               ↓
Structured JSON Validation (Zod)
               ↓
Subject Safety Gate (safetyValidator.ts)
   ├── Mathematics:
   │   ├── Numerical token extractor (integers, floats, negative signs)
   │   └── Math expression parser (polynomials, radicals, trig terms)
   └── Science:
       ├── Chemical formula parser (e.g. MnO₂, H₂SO₄, CaCO₃)
       └── Physical unit validator (e.g. °C, Ω, cm, m/s²)
               ↓
[Pass] → Non-Destructive Preview State
[Fail] → Immediate Rejection, Original Question Preserved
```
