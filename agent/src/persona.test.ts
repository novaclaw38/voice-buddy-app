import { describe, expect, it } from 'vitest';
import { buildInstructions } from './agent.ts';

// Pure-function coverage for instruction selection — no LLM/API calls, so
// this runs without LiveKit/Groq credentials, unlike agent.test.ts's
// judge-LLM evaluations.
describe('buildInstructions', () => {
  it('uses the gentle persona under the tactical age threshold', () => {
    const instructions = buildInstructions({ childName: 'Ada', buddyName: 'Buddy', childAge: 8 });
    expect(instructions).not.toContain('Recruit');
  });

  it('uses the tactical persona at and above the threshold', () => {
    const instructions = buildInstructions({ childName: 'Ada', buddyName: 'Buddy', childAge: 9 });
    expect(instructions).toContain('Recruit');
    expect(instructions).toMatch(/mission/i);
  });

  it('preserves the safety escalation line verbatim in both personas', () => {
    const safetyLine = 'That sounds really important — please go find a grown-up right now and tell them!';
    expect(buildInstructions({ childAge: 7 })).toContain(safetyLine);
    expect(buildInstructions({ childAge: 10 })).toContain(safetyLine);
  });
});
