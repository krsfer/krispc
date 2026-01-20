# Plexus Principles

This document serves as the "Constitution" for AI agents and developers working on Plexus. It prioritizes principles over rigid rules to allow for intelligent judgment in unforeseen situations.

## 1. Architecture First, Tools Second
*   **Principle**: The core logic (Capture -> Sort -> Store) must remain portable.
*   **Guideline**: Avoid coupling core business logic deeply with the framework.
    *   *Bad*: Writing complex LLM orchestration directly inside a Django View or Signal.
    *   *Good*: Writing the orchestration in a `services/` module that receives plain data and returns plain data.
*   **Goal**: We should be able to swap the web framework (Django) or the background worker (Celery) without rewriting the "brain" of the system.

## 2. Principles Over Rules
*   **Principle**: Do not blindly follow rigid "if-then" instructions. Use judgment.
*   **Guideline**:
    *   **Don't Swallow Errors**: If an LLM response is malformed, fail loudly or log it clearly. Do not assume defaults that hide the failure.
    *   **Self-Healing**: If you (the agent) build a feature, write the code in a way that allows you to debug it later. Add comments explaining *why*, not just *what*.
    *   **Idempotency**: All processing tasks (especially `process_input`) must be safe to run multiple times on the same data.

## 3. The System is Infrastructure
*   **Principle**: Plexus is not just a tool for a human; it is a platform for other apps.
*   **Guideline**:
    *   **API First**: Every feature must be accessible via API. The UI is just one client.
    *   **Documentation**: Maintain the OpenAPI/Swagger schema (`/api/docs/swagger/`). If you add an endpoint, ensure it has `drf-spectacular` annotations.
    *   **Standard Types**: Use standard data formats (JSON) and clear schemas for "Thoughts" and "Actions" so external tools can parse them reliability.

## 4. Agent-Centric Maintenance
*   **Principle**: Build with the assumption that an AI will maintain this code.
*   **Guideline**:
    *   **Context is King**: Maintain `ARCHITECTURAL_DECISIONS.md`. If you make a major change, record it there.
    *   **Simple abstractions**: Prefer simple, explicit code over "clever" metaprogramming that hides logic from static analysis.
