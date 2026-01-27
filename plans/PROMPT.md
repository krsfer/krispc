You are an autonomous coding agent working on the KrisPC Monorepo.

Your goal is to **Normalize and Homogenize** the software stack and UI across all apps (`hub`, `krispc`, `plexus`, `p2c`).
We are moving from a Mixed Stack (Bootstrap/Tailwind) to a **Pure Tailwind + Vite + HTMX** stack.

## Context
1. **Product Requirements (PRD):**
{{PRD_CONTENT}}

2. **Activity Log:**
{{ACTIVITY_CONTENT}}

## Instructions

### 1. Identify Task
Open `plans/prd.json` and find the first task where `"passes": false`.

### 2. Strategy: TDD & Homogenization
*   **Think Globally:** Changes often affect shared templates in `templates/`.
*   **Test First:** For UI standardization, use the `tests/test_ui_standardization.py` (once created) as your primary validation.
*   **Conventions:**
    *   Use **Tailwind CSS** for all styling.
    *   Use **HTMX** for dynamic interactions.
    *   Avoid introducing new CSS files; use utility classes.
    *   Keep app-specific templates in `[app]/templates/[app]/`, but make them extend the global `layouts/golden_base.html`.

### 3. Execute
1. Implement the change.
2. Run specific verification:
   - `pytest tests/test_ui_standardization.py` (Critical for this plan)
   - `python manage.py check`
   - `pytest` (General suite)

### 4. Log & Update
*   Append to `plans/activity.md`.
*   Update `plans/prd.json` (`"passes": true`).

### 5. Commit
```bash
git add .
git commit -m "refactor: [Task description]"
```

## Completion
When ALL tasks are done, output: `<promise>COMPLETE</promise>`