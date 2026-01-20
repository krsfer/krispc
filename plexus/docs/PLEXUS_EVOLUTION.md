# Plexus Evolution Roadmap

This document outlines the progressive integration of "The 4 Patterns That Work" and 2026 AI trends into Plexus.

## Phase 1: Foundation (Current Status)
*   [x] **Pattern 1 (Portable Arch)**: `Input` -> `Thought` flow is defined. `services/llm.py` isolates logic.
*   [x] **Pattern 4 (Infrastructure)**: API exists (`drf-spectacular` installed).
*   [x] **Pattern 2 (Principles)**: `PLEXUS_PRINCIPLES.md` created.
*   [x] **Pattern 3 (Agent Context)**: `ARCHITECTURAL_DECISIONS.md` created.

## Phase 2: Decoupling & Strengthening (Next Steps)
*   **Refine Pattern 1**:
    *   **Goal**: Make `process_input` completely framework-agnostic.
    *   **Task**: Refactor `plexus.tasks.process_input` so the core logic (content refinement, deduplication check, action extraction) resides in a pure Python class (e.g., `InputProcessor`), making the Celery task just a thin wrapper.
*   **Enhance Pattern 4**:
    *   **Goal**: Enable "External Apps".
    *   **Task**: Create a simple "SDK" or example script (`examples/query_plexus.py`) that uses the API to fetch "Tasks" and display them. This proves the "System as Infrastructure" concept.

## Phase 3: Advanced Trends (2026 Integration)

### 1. Session-Based Workflows
*   **Current**: "Always-On" (Background Celery Workers).
*   **New**: "Session-Based" (Interactive CLI/UI).
*   **Implementation**:
    *   Create a Django Management Command `python manage.py start_session`.
    *   This command fetches unprocessed inputs and asks the user (via CLI) for guidance *before* finalizing the "Thought".
    *   *Why*: Allows for "Human-in-the-loop" pattern mentioned in the video.

### 2. AI-Generated Interfaces
*   **Current**: Static Django Templates (`dashboard.html`).
*   **New**: Dynamic Data Views.
*   **Implementation**:
    *   Add an endpoint `/api/v1/generate-view/` where the user asks "Show me all tasks related to Project X".
    *   The AI returns not just JSON, but a *layout definition* (or even raw HTML/Tailwind) that the frontend renders on the fly.

### 3. Community + AI Build Model
*   **Strategy**: When adding new features, search the codebase for similar patterns first ("Community Knowledge") and then use the AI to adapt it ("Implementation Muscle").
