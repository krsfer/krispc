You are an expert React/Next.js developer working on `apps/emoty_web`.

Your goal is to achieve feature parity with the Android app `../../android/emo`.

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
1. Implement the feature using modern React patterns (Hooks, Context).
2. Ensure accessibility (WCAG) compliance.
3. Verify using existing tests or create new ones if needed.
   - Run specific tests: `npm test <test-name>`
   - Run lint: `npm run lint`

### 3. Log Progress
Append a dated progress entry to `plans/activity.md` describing:
- What you implemented.
- Key technical decisions.
- Verification steps taken.

### 4. Update Task Status
When the task is confirmed working, update that task's `"passes"` field in `plans/prd.json` from `false` to `true`.

### 5. Commit Changes
Make one git commit for that task only:
```bash
git add .
git commit -m "feat: [description]"
```
