import { ServerOptions, cli, defineAgent, inference, voice } from '@livekit/agents';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createAgent } from './agent.ts';
import { GoogleSTT } from './googleStt.ts';
import { GoogleTTS } from './googleTts.ts';

// Load environment variables from a local file.
// Make sure to set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
// GROQ_API_KEY, and GOOGLE_TTS_KEY when running locally or self-hosting.
dotenv.config({ path: '.env.local' });

export default defineAgent({
  entry: async (ctx) => {
    const session = new voice.AgentSession({
      // Ears: Google Cloud Speech-to-Text (non-streaming, matches the
      // app's existing tap-to-talk push style — the framework wraps this
      // with VAD-based turn segmentation automatically).
      stt: new GoogleSTT(),

      // Voice: Google Cloud Text-to-Speech, same named voices as the main
      // app's api/tts.js so Buddy sounds the same everywhere.
      tts: new GoogleTTS({ voice: 'sunny' }),

      turnHandling: {
        turnDetection: new inference.TurnDetector(),
        interruption: { mode: 'adaptive' },
        preemptiveGeneration: { enabled: true },
      },
    });

    await session.start({
      agent: createAgent(),
      room: ctx.room,
    });

    await ctx.connect();

    session.generateReply({
      instructions: 'Greet the child warmly and ask what they want to do today.',
    });
  },
});

// Run the agent server
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'buddy-voice-agent',
  }),
);
