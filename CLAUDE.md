# KrisPC Suite

Behavioral guidelines to reduce common LLM coding mistakes. Read alongside the
project-specific constraints in `RULES.md` and `docs/STANDARDS.md`, which take
precedence on stack, design, and API rules.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Project

KrisPC Suite: a Django 6 / Python 3.13 monolith hosting several apps behind one
golden base template, deployed on Fly.io.

- **Apps:** `krispc` (IT services site), `plexus` (SecondBrain capture/AI),
  `hub`, `p2c` (Pdf2Cal), `sas`, `streams`, `emoty`, `analytics`. Project
  settings live in `_main/`.
- **Backend:** Django + DRF (`drf-spectacular`), Channels, Celery + Redis.
- **Frontend:** Vue 3 + Vite (`django-vite`), Tailwind 3, HTMX. `apps/emoty_web`
  is a separate Next.js app, the only React surface.
- **Project rules are non-negotiable and live in `RULES.md`.** The full design
  spec (Modern v2 tokens, radii, type scale, test contract) is in
  `docs/STANDARDS.md`. Read both before touching templates, styling, or the API.
- The `.story/` directory is a gitignored per-developer storybloq workspace. Do
  not commit it.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Harness

Tests run under pytest against `_main.test_settings`. Two env vars are required
or settings fail to load (see ISS-002): `SECRET_KEY=...` and `MAPBOX_TOKEN=...`.

- **Tests:** `SECRET_KEY=test MAPBOX_TOKEN=test pytest`
- **Single file:** `SECRET_KEY=test MAPBOX_TOKEN=test pytest tests/test_design_system.py`
- **Frontend build:** `npm run build` (must succeed at least once before any UI
  test runs — `django-vite` aborts page render without
  `krispc/static/dist/.vite/manifest.json`).

UI tickets are not "done" until these three suites are green:
`tests/test_design_system.py`, `tests/test_ui_refresh.py`,
`tests/test_ui_standardization.py`.

There is no separate lint/type step; pre-commit hooks run on commit. Do not pass
`--no-verify` to bypass them (see `RULES.md`).

## 6. Loops & Autonomy

Sections 4 and 5 define the loop and how to verify it. These rules govern running it without me approving every turn.

- "Done" is defined in section 5. If a task has no programmatic check, say so before starting rather than looping with no stop condition.
- Prefer the built-in autonomy commands over asking me to type "continue":
  - `/goal <verifiable end state>` for "keep working until it's correct" (test-fix-retest cycles, lint-clean, migrations with a clear stop condition).
  - `/loop <interval, or until: condition>` for polling or repeating a check (watch CI, re-run a suite).
  - `/batch <one mechanical change>` for a repetitive edit spread across many files. Requires git; it spawns parallel worktree agents and opens a PR per agent, so it also multiplies token usage.
- The `/goal` completion check is read from your output by a separate evaluator model, not from the filesystem. State conditions you can demonstrate in the transcript (show the passing test run), not silent file assertions.
- Always work on a git branch so changes can be reverted. Never start an autonomous loop without an iteration cap.
- Loops are for code with programmatic verification. Do not loop on judgment-heavy work, design decisions, or long compute jobs (training runs, quantization sweeps). Those are a script or my call, not a loop.
- If you are still stuck when the cap is reached, stop. Document what is blocking progress, what you tried, and suggested next steps. Do not thrash.

## Text

Rules for human-readable text you produce (PR descriptions, comments, docstrings, commit messages, docs):

- No em-dashes or other long dashes. Use commas, periods, or parentheses instead.
- Cut filler and hedging: "um", "basically", "essentially", "it's worth noting", "of course".
- Vary sentence length. Do not pad a short, correct statement into a long fuzzy one, and do not chain choppy fragments either.
- Avoid the usual LLM tells: no "it's not just X, it's Y", no "delve", no overwrought openers.
- Reread what you wrote before you finish. Delete anything that does not earn its place.

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:

- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/design-consultation`
- `/design-shotgun`
- `/design-html`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/canary`
- `/benchmark`
- `/browse`
- `/connect-chrome`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/setup-gbrain`
- `/retro`
- `/investigate`
- `/document-release`
- `/document-generate`
- `/codex`
- `/cso`
- `/autoplan`
- `/plan-devex-review`
- `/devex-review`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`
- `/learn`
