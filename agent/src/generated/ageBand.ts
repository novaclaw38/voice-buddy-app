// GENERATED FILE — do not edit by hand.
// Source of truth: src/utils/ageBand.js (AGENT-SYNC block)
// Regenerate with `npm run sync:agent-persona` after editing the source.

// Single source for age → lesson/persona band. Split out of subjects.js so
// prompts.js (and anything that mirrors persona logic outside this app,
// such as the LiveKit agent's synced copy) can depend on this without
// pulling in course-listing code that has nothing to do with age banding.
export const BAND_BY_AGE = (age: number) => (age <= 5 ? 'young' : age <= 8 ? 'middle' : 'old')
