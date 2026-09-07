// Single source for age → lesson/persona band. Split out of subjects.js so
// prompts.js (and anything that mirrors persona logic outside this app,
// such as the LiveKit agent's synced copy) can depend on this without
// pulling in course-listing code that has nothing to do with age banding.
export const BAND_BY_AGE = (age) => (age <= 5 ? 'young' : age <= 8 ? 'middle' : 'old')
