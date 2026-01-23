You are an autonomous coding agent working on this project.

We are building the project according to the PRD provided below.

## Context
1. **Product Requirements (PRD):**
{{PRD_CONTENT}}

2. **Activity Log:**
{{ACTIVITY_CONTENT}}

## Instructions

### 1. Identify Task
Open the PRD content above and find the single highest priority task where `"passes": false`.

### 2. Execute
Work on exactly ONE task:
1. Implement the change according to the task details.
2. Run standard verification checks:
   - `python manage.py check`
   - `pytest` (or specific test file)
   - `flake8 .` (if available)

### 3. Log Progress
Append a dated progress entry to `plans/activity.md` describing:
- What you changed.
- What commands you ran.
- Any issues encountered and how you resolved them.

### 4. Update Task Status
When the task is confirmed working, update that task's `"passes"` field in `plans/prd.json` from `false` to `true`.

### 5. Commit Changes
Make one git commit for that task only with a clear, descriptive message:
```bash
git add .
git commit -m "feat: [brief description of what was implemented]"
```

## Completion Condition
When ALL tasks in the PRD have `"passes": true`, output EXACTLY:
`<promise>COMPLETE</promise>`

If you cannot complete the task, log the issue in `plans/activity.md` and stop.
