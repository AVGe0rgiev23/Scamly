// The made-up card id that the test preview page /dev/moderator/scripts/edit shows.
// The browser tests (tests/e2e/scripts.spec.ts) answer the API calls for this id with
// fake data; on the real server the API answers 401 without a moderator login.
export const PREVIEW_SCRIPT_ID = "5c000000-0000-4000-8000-0000000000e1";
