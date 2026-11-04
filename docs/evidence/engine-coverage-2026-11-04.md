# Detection engine coverage, 4 November 2026

Evidence for W1-10 ("engine coverage ≥ 90 %, report saved to `docs/evidence/`").

**Command** (run from the repo root):

```sh
npx vitest run src/engine --coverage --coverage.include='src/engine/**' --coverage.exclude='src/engine/**/*.test.ts'
```

**Result:** 11 test files, **170 tests passed** (51 of them are Roberta's scenarios in `src/engine/__tests__/scenarios.ts`, 51/51 pass). Engine line coverage **100 %** (goal: ≥ 90 %).

| File | Lines | Statements | Branches | Functions |
|---|---|---|---|---|
| `src/engine/dictionary.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/fuzzy.ts` | 100 % | 100 % | 91.3 % | 100 % |
| `src/engine/hardRules.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/index.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/normalise.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/redact.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/scoring.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/signals.ts` | 100 % | 100 % | 96.66 % | 100 % |
| `src/engine/transliterate.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/types.ts` | 100 % | 100 % | 100 % | 100 % |
| `src/engine/verdict.ts` | 100 % | 100 % | 96.96 % | 100 % |
| **All engine files** | **100 %** | **100 %** | **96.58 %** | **100 %** |

The few uncovered branches are the `?? 0` / `?? ""` fallbacks that only satisfy strict TypeScript (`noUncheckedIndexedAccess`) and can't happen at runtime.

Tests per file: `scenarios` 51, `verdict` 24 (incl. every worked example of BUILD_PLAN 4.7), `fuzzy` 17, `hardRules` 16, `redact` 16, `signals` 14, `normalise` 10, `scoring` 8, `transliterate` 7, `types` 4, `data` 3.

Coverage tool: Vitest 5.1.0 with `@vitest/coverage-v8` 5.1.0. The full suite (`npm test`) on the same day: 25 files, 263 tests passed.
