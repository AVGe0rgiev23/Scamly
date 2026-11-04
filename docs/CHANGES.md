# Changes to the plan

One line per change, newest first. The AI agent adds a line every time the team changes the plan.
Format: `date · who decided · what changed · documents/tasks affected`.

- 2026-11-04 · Alex · New task W2-13 for Roberta: site layout (header with logo, small theme switch, links, footer) + real home page, before W2-01; Week 2 Roberta total 30 h → 34 h (D22) · `BUILD_PLAN.md` section 6, `IMPLEMENTATION_PLAN.md` section 5, `PROJECT_BRIEF.md` section 0
- 2026-11-03 · Alex · Roberta works with OpenAI Codex on her own computer, Alex with Claude Code in the cloud; all project rules moved into `AGENTS.md` (shared, tool-neutral), `CLAUDE.md` now only imports it; no AI attribution of any tool in commits; Roberta's commits use her own git config; pull before / push after (D21, Q21) · `AGENTS.md`, `CLAUDE.md`, `PROJECT_BRIEF.md` section 0, `BUILD_PLAN.md` sections 1, 6 and 8, `IMPLEMENTATION_PLAN.md` sections 1, 2, 4 and 6, `WHY_WE_CHOSE.md`, `HOW_IT_WORKS.md`
- 2026-11-03 · Alex · Week 1 rebalance (option A): W1-12 seed script moves to Roberta (new Session J), W1-13 deploy stays Alex's but moves to Mon 9 Nov; Week 1 totals now A ≈ 45.5 h (28.5 h left), R ≈ 18.5 h (D20, Q20) · `BUILD_PLAN.md` sections 6 and 8, `IMPLEMENTATION_PLAN.md` sections 4–6, `PROJECT_BRIEF.md` section 0
- 2026-11-03 · Alex · Two living explanation files, `HOW_IT_WORKS.md` and `WHY_WE_CHOSE.md`, updated in the same commit as every change; `CLAUDE.md` added so every session follows the rules (D19, Q19) · `PROJECT_BRIEF.md` section 0, `BUILD_PLAN.md` sections 1 and 8, `IMPLEMENTATION_PLAN.md` sections 1–3 and 6, `CLAUDE.md`
- 2026-11-03 · Alex · Engine split: Alex builds the logic, Roberta writes `dictionary.ts`, шльокавица/typo examples and the test cases; new task W1-09b (D18, Q18) · `BUILD_PLAN.md` section 6, `IMPLEMENTATION_PLAN.md` sections 5–6
- 2026-11-03 · Alex · Work split: Alex leads backend, Roberta leads frontend, mixed; either may change anything after telling the owner; all tasks re-assigned and hours re-totalled (D17, Q17) · `PROJECT_BRIEF.md` sections 0 and 11, `BUILD_PLAN.md` sections 6 and 8, `IMPLEMENTATION_PLAN.md` sections 1, 4–6
- 2026-11-02 · Alex · Implementation plan, ideas list and this change log added · `IMPLEMENTATION_PLAN.md`, `IDEAS.md`, `CHANGES.md`
- 2026-11-02 · Alex · One branch only (`main`); no feature branches or pull requests (Q16) · `BUILD_PLAN.md` sections 6 and 8
- 2026-11-02 · Alex · Commits carry only the author's name, no co-author line (Q3) · `BUILD_PLAN.md` section 8
- 2026-11-02 · Alex · Device pairing: server creates the device login after a correct code (Q2) · `BUILD_PLAN.md` section 5
- 2026-11-02 · Alex · Keep the name "Scamly" for now (Q1) · `BUILD_PLAN.md` R12, Q1
