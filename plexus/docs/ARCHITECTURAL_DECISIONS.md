# Architectural Decisions & Context

This document explains the "Why" and "How" of Plexus to assist AI agents and developers in maintaining and extending the system.

## Core Architecture: Capture -> Sort -> Store

The system follows a linear information processing flow:

1.  **Capture (`Input`)**
    *   **What**: Raw data entry (text, images, voice).
    *   **Where**: `plexus.models.Input`.
    *   **Mechanism**:
        *   API: `POST /api/v1/inputs/`
        *   Frontend: `CaptureView`
    *   **Decision**: We store *raw* input first to ensure no data loss. Processing is asynchronous.

2.  **Sort & Process (The "Brain")**
    *   **Trigger**: Django Signal (`post_save` on `Input`) -> Celery Task (`process_input`).
    *   **Logic**: `plexus.services.llm.classify_input`.
    *   **Decision**: We use a dedicated `services/` layer for LLM interaction to keep it decoupled from Django models.
    *   **Duplicate Detection**: We check for semantic duplicates before creating a Thought.

3.  **Store (`Thought` & `Action`)**
    *   **Thought**: The "processed" atom of information. Typed as `ideation`, `reference`, or `task`.
    *   **Action**: Actionable steps derived from a Thought.
    *   **Decision**: Thoughts are immutable snapshots of the AI's understanding at a point in time. If re-processed, we update the Thought and recreate Actions.

## Key Technical Decisions

### 1. Asynchronous Processing (Celery)
*   **Why**: LLM calls are slow (2-10s). Blocking the web request is unacceptable.
*   **Trade-off**: Requires a worker process (Redis + Celery).
*   **Agent Note**: When debugging "missing thoughts," check the Celery worker logs, not just the web server logs.

### 2. Django Rest Framework + Spectacular
*   **Why**: To treat the system as "Infrastructure" (Pattern 4).
*   **Outcome**: We have a fully documented API at `/api/docs/swagger/` that allows other agents/scripts to interact with Plexus programmatically.

### 3. Service Layer for LLMs (`plexus.services.llm`)
*   **Why**: To support multiple providers (Gemini, OpenAI, Anthropic) via `SystemConfiguration`.
*   **Pattern**: Strategy Pattern. The system checks `active_ai_provider` and dispatches to the correct internal function.

## Future Context (The "Build Log")

*   **2026-01-20**: Initial documentation of the architecture to support "Agent Maintenance" (Pattern 3).
