// Gives each activity mode its own "voice color" — a pitch/rate offset layered
// on top of the user's own speech settings — so a young, pre-reading child can
// tell modes apart by ear (not just by tapping and reading a label).
const MODE_VOICE = {
  chat:     { pitchOffset: 0,  rateMul: 1    },
  story:    { pitchOffset: 2,  rateMul: 0.95 }, // warm, slightly slower storyteller
  game:     { pitchOffset: 4,  rateMul: 1.08 }, // bright and quick
  activity: { pitchOffset: 1,  rateMul: 1    },
  routine:  { pitchOffset: -1, rateMul: 0.95 }, // calm and steady
  quiz:     { pitchOffset: 3,  rateMul: 1.05 },
  jokes:    { pitchOffset: 5,  rateMul: 1.1  }, // silly and high
  sing:     { pitchOffset: 4,  rateMul: 1    },
  feelings: { pitchOffset: -2, rateMul: 0.9  }, // gentle and soft
  move:     { pitchOffset: 3,  rateMul: 1.1  }, // energetic
  learn:    { pitchOffset: 1,  rateMul: 1    },
}

export function getModeVoice(modeId) {
  return MODE_VOICE[modeId] || MODE_VOICE.chat
}
