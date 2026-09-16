# Smart Question Paper Generator

An intelligent academic assessment generation platform engineered for educators to generate balanced, syllabus-aligned **Mathematics** and **Science** question papers.

---

## Project Overview

The **Smart Question Paper Generator** allows teachers to synthesize high-quality examination papers calibrated against precise pedagogical constraints:
- **Total Marks & Time Allocation**
- **Difficulty Distribution** (Easy / Medium / Hard)
- **Topic Weightage** (Proportional chapter/subtopic coverage)
- **Question-Type Taxonomy** (Multiple Choice, Short Answer, Long Answer)

Academic Scope: Specifically tailored for **CBSE Class 10** curriculum standards in Mathematics and Science.

---

## Core Capabilities & Architecture

- **Deterministic Constraint-Based Generator**:
  - Mark-Bucketed Dynamic Programming Beam Search with multi-criteria proportional pruning and deterministic tie-breaking.
  - Deterministic 1-Opt and 2-Opt local search optimization ensuring optimal syllabus topic, question type, and cognitive difficulty alignment.
  - Pre-search feasibility analysis with 0/1 subset-sum reachability checking and multi-dimensional capacity detection.
  - Independent validation layer recalculating all metrics directly from question objects without trusting generator metadata.
  - Structured generation result returning `status` (`EXACT`, `PARTIAL`, `IMPOSSIBLE`), `requested` targets, `actual` metrics, `deviations`, `violations`, `score`, and human-readable pedagogical `explanation`.

- **Individual Question Swap Engine**:
  - Deterministic single-question replacement without regenerating the entire paper.
  - Preserves exact mark value, topic, question type, difficulty tier, and array position.
  - Re-evaluates target deviations and validates candidate uniqueness against active paper.

- **AI Question Enhancement & Authoring (Optional)**:
  - Hybrid architecture separation: Deterministic engine remains the sole authority for constraints; Groq LLM provides optional teacher-reviewed phrasing enhancements and new question authoring.
  - Strict Mathematical & Science Safety Gates preventing alteration of equations, numerical constants, chemical formulas, physical units, or MCQ options.
  - Non-destructive preview workflow with explicit teacher review before applying changes.
  - Graceful fallback: 100% functional offline or when `GROQ_API_KEY` is not configured.

- **Vector PDF Examination Export**:
  - Client-side and server-side PDF generator (`pdf-lib`) producing official A4 CBSE-formatted question papers.
  - Continuous Q1..Qn question numbering, multi-page automatic pagination, and running footers.
  - Strictly student-facing (omits answer keys and teacher UI controls).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **ORM & Database** | Prisma with SQLite (Local Development) |
| **Algorithm Engine** | Dynamic Programming Beam Search + Local Search Optimization |
| **PDF Generation** | pdf-lib (Vector PDF) |
| **AI Integration** | Groq API (`openai/gpt-oss-120b`) via server-side Server Actions |
| **Schema Validation** | Zod |
| **Icons & UI** | Lucide React |

---

## Project Structure

```text
Smart-Question-Paper-Generator/
├── app/
│   ├── api/paper/pdf/route.ts  # Server-side PDF export endpoint
│   ├── generate/
│   │   ├── actions.ts          # Server Actions (generate, swap, enhance, similar)
│   │   └── page.tsx            # Teacher configuration interface (/generate)
│   ├── globals.css             # Tailwind global styles
│   ├── layout.tsx              # Root layout with Navbar and Footer
│   └── page.tsx                # Landing / educator dashboard page
├── components/
│   ├── BlueprintSummaryModal.tsx # Verified blueprint review modal & JSON inspector
│   ├── ConfigurationForm.tsx   # Main interactive teacher configuration form
│   ├── DistributionProgress.tsx # Live segmented progress bar and status indicator
│   ├── FeatureCard.tsx         # Reusable feature display cards
│   ├── Footer.tsx              # Application footer
│   ├── Navbar.tsx              # Responsive navigation bar
│   └── paper/
│       ├── PaperGenerationSummary.tsx # Generation summary & multi-metric breakdown
│       ├── PaperHeader.tsx     # Formal exam document header
│       ├── PaperQuestion.tsx   # Individual question item with swap/AI actions
│       ├── PaperSection.tsx    # Section partition (MCQ, Short Answer, Long Answer)
│       ├── PaperView.tsx       # Full authentic exam paper presentation
│       └── index.ts            # Component barrel export
├── lib/
│   ├── ai/                     # AI Enhancement & Safety Gates
│   │   ├── groq.ts             # Server-side Groq API client with Zod schemas
│   │   ├── prompt.ts           # System & user prompts for CBSE alignment
│   │   ├── questionEnhancer.ts # Question enhancement coordinator
│   │   ├── questionGenerator.ts# New similar question generator
│   │   ├── safetyValidator.ts  # Math & Science hallucination safety gates
│   │   └── index.ts            # AI module barrel export
│   ├── generator/              # Deterministic Constraint Engine
│   │   ├── candidateSearch.ts  # Mark-bucketed DP beam search & local search
│   │   ├── feasibility.ts      # Pre-search feasibility & 0/1 subset-sum reachability
│   │   ├── generatePaper.ts    # Master generation orchestrator
│   │   ├── scoring.ts          # Pedagogical scoring, deviations & target breakdown
│   │   ├── swapQuestion.ts     # Individual question swap engine
│   │   ├── types.ts            # Result contracts, breakdowns & violation types
│   │   ├── validator.ts        # Independent question paper validation engine
│   │   └── index.ts            # Generator module barrel export
│   ├── pdf/
│   │   ├── downloadHelper.ts   # Browser PDF download trigger
│   │   └── generatePaperPdf.ts # Vector PDF generation engine (pdf-lib)
│   ├── prisma.ts               # PrismaClient singleton instance
│   ├── questions.ts            # Data layer queries and multi-filter functions
│   └── utils.ts                # ClassName merging utilities
├── prisma/
│   ├── schema.prisma           # Prisma schema (Question model & SQLite datasource)
│   ├── seed.ts                 # Database seed script with Zod validation
│   └── seed-data/              # Seed question datasets
├── scripts/                    # Test suites and forensic verification scripts
├── types/                      # TypeScript interfaces and Zod schemas
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS design system config
└── tsconfig.json               # TypeScript configuration
```

---

## Quick Start / Local Installation

### Prerequisites

- **Node.js**: v18.18.0 or later (v20+ / v22+ recommended)
- **npm**: v9+ or later

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Ayushs135/Smart-Question-Paper-Generator.git
cd Smart-Question-Paper-Generator
npm install
```

### 2. Configure Environment

Copy the `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

Configure your environment variables:
```env
# Database connection string (SQLite for local development)
DATABASE_URL="file:./dev.db"

# Optional: Groq API Key for AI Question Enhancement
# Get your API key from https://console.groq.com/
GROQ_API_KEY=""

# Optional: Groq LLM model name (default: openai/gpt-oss-120b)
GROQ_MODEL="openai/gpt-oss-120b"
```

### 3. Initialize & Seed Database

Generate the Prisma Client, push schema to SQLite, and seed the CBSE Class 10 question bank:

```bash
# Push schema to SQLite database (creates dev.db)
npm run prisma:push

# Seed question bank
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Test Suites

Execute the comprehensive 10-phase verification suite:

```bash
# Run all test suites
npm test

# Run individual test suites:
npm run test:questions   # Question bank data layer tests
npm run test:config      # Blueprint configuration Zod tests
npm run test:generator   # Deterministic generator engine tests
npm run test:paper-view  # Connected generator & paper UI tests
npm run test:swap        # Individual question swap engine tests
npm run test:ai          # Groq AI enhancement & safety tests
npm run test:scale       # Multi-scale paper generation tests (20M-100M)
npm run test:mark-mix    # Mark-value denomination mixing tests
npm run test:similar     # AI similar question generation tests
npm run test:pdf         # Vector PDF export tests
```

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build application for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint validation |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:push` | Sync Prisma schema with SQLite database |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed CBSE Class 10 question bank |
| `npm test` | Run complete regression test suite |
