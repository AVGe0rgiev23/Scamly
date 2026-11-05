// The made-up person id that the test preview page /dev/family/person shows.
// The browser tests (tests/e2e/family.spec.ts) answer the API calls for this id
// with fake data; on the real server the API answers 401/404, so nothing leaks.
export const PREVIEW_PERSON_ID = "a1000000-0000-4000-8000-000000000001";
