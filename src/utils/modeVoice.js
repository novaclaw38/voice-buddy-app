// Gives each activity mode its own "voice color" — a pitch/rate offset layered
// on top of the user's own speech settings — so a young, pre-reading child can
// tell modes apart by ear (not just by tapping and reading a label).
// Keys here must match a key in PROMPTS (src/utils/prompts.js) — a voice
// profile with no matching persona would silently pair a distinct "sound"
// with the generic chat behavior via getModeVoice's fallback below.
const MODE_VOICE = {
  chat:  { pitchOffset: 0, rateMul: 1    },
  story: { pitchOffset: 2, rateMul: 0.95 }, // warm, slightly slower storyteller
}

export function getModeVoice(modeId) {
  return MODE_VOICE[modeId] || MODE_VOICE.chat
}
