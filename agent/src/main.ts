import { AgentSessionEventTypes, ServerOptions, cli, defineAgent, inference, voice } from '@livekit/agents';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createAgent, type ChildInfo } from './agent.ts';
import { GoogleSTT } from './googleStt.ts';
import { GoogleTTS } from './googleTts.ts';

// Load environment variables from a local file.
// Make sure to set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
// GROQ_API_KEY, and GOOGLE_TTS_KEY when running locally or self-hosting.
dotenv.config({ path: '.env.local' });

function parseChildInfo(metadata: string | undefined): ChildInfo {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return {
      childName: typeof parsed.childName === 'string' ? parsed.childName : undefined,
      buddyName: typeof parsed.buddyName === 'string' ? parsed.buddyName : undefined,
      childAge: typeof parsed.childAge === 'number' ? parsed.childAge : undefined,
    };
  } catch {
    return {};
  }
}

export default defineAgent({
  entry: async (ctx) => {
    const t0 = Date.now();

    // Connect first (recommended by the framework — see JobContext.connect
    // docs) so room metadata (set by api/livekit-agent.js from the child's
    // current settings) is available before we build Buddy's personality.
    await ctx.connect();
    console.log(`[timing] connected at +${Date.now() - t0}ms`);

    // ctx.room.metadata (the rtc-node client's local cache) isn't
    // guaranteed to be synced yet the instant connect() resolves. The job
    // dispatch snapshot (ctx.job.room.metadata) already carries the room
    // metadata set by api/livekit-agent.js, so prefer that and only fall
    // back to the live client value if the snapshot is somehow missing it.
    const childInfo = parseChildInfo(ctx.job.room?.metadata || ctx.room.metadata);

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

    session.on(AgentSessionEventTypes.SpeechCreated, (ev) => {
      console.log(`[timing] speech_created (${ev.source}) at +${Date.now() - t0}ms`);
    });

    await session.start({
      agent: createAgent(childInfo),
      room: ctx.room,
    });
    console.log(`[timing] session started at +${Date.now() - t0}ms`);

    session.generateReply({
      instructions: childInfo.childName
        ? `Greet ${childInfo.childName} warmly by name and ask what they want to do today. Keep it to one short sentence.`
        : 'Greet the child warmly and ask what they want to do today. Keep it to one short sentence.',
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
