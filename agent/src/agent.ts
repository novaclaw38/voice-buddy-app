import { Agent } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { base, tacticalBase, isTactical } from './generated/prompts.ts';

export interface ChildInfo {
  childName?: string;
  buddyName?: string;
  childAge?: number;
  voice?: string;
}

// Personality bullets and the safety escalation line are generated from the
// main app's src/utils/prompts.js (see scripts/sync-agent-persona.mjs), so
// they can't drift between the in-app chat and this LiveKit voice session
// the way they used to. Deliberately narrower than PROMPTS.chat's full
// text: the appended "invent activities" paragraph is UX flavor suited to
// text chat, and every instruction token costs latency on a voice turn.
export function buildInstructions({ childName = 'there', buddyName = 'Buddy', childAge = 7 }: ChildInfo = {}) {
  return isTactical(childAge)
    ? tacticalBase(childName, buddyName, childAge)
    : base(childName, buddyName, childAge);
}

export function createAgent(childInfo: ChildInfo = {}) {
  return Agent.create({
    instructions: buildInstructions(childInfo),
    // Reuses the same Groq account/model as the main app's chat API's first
    // choice (api/chat.js) — fast, which matters most for voice latency.
    llm: openai.LLM.withGroq({ model: 'llama-3.1-8b-instant' }),
  });
}
