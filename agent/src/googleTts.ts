import { AudioByteStream, shortuuid, tts } from '@livekit/agents';
import type { APIConnectOptions } from '@livekit/agents';
import { VOICES as GENERATED_VOICES } from './generated/voiceOptions.ts';

// Generated from src/utils/voiceOptions.js (see scripts/sync-agent-persona.mjs)
// so parents pick from the same named voices whether Buddy talks in-browser
// or over LiveKit.
export const VOICES = GENERATED_VOICES;

const SYNTHESIZE_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;

export interface GoogleTTSOptions {
  apiKey?: string;
  voice?: keyof typeof VOICES | string;
  rate?: number;
  pitch?: number;
}

const defaultOptions: GoogleTTSOptions = {
  voice: 'sunny',
  rate: 0.9,
  pitch: 0,
};

export class GoogleTTS extends tts.TTS {
  label = 'google.TTS';
  #opts: GoogleTTSOptions;
  #apiKey: string;
  abortController = new AbortController();

  constructor(opts: GoogleTTSOptions = {}) {
    super(SAMPLE_RATE, NUM_CHANNELS, { streaming: false });
    this.#opts = { ...defaultOptions, ...opts };
    const apiKey = this.#opts.apiKey ?? process.env.GOOGLE_TTS_KEY;
    if (!apiKey) {
      throw new Error(
        'Google Cloud API key is required, whether as an argument or as $GOOGLE_TTS_KEY',
      );
    }
    this.#apiKey = apiKey;
  }

  override get model() {
    return VOICES[(this.#opts.voice as keyof typeof VOICES) ?? 'sunny'] ?? this.#opts.voice ?? '';
  }

  override get provider() {
    return 'texttospeech.googleapis.com';
  }

  updateOptions(opts: Partial<GoogleTTSOptions>) {
    this.#opts = { ...this.#opts, ...opts };
  }

  synthesize(text: string, connOptions?: APIConnectOptions, abortSignal?: AbortSignal): ChunkedStream {
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, this.abortController.signal])
      : this.abortController.signal;
    return new ChunkedStream(this, text, this.#apiKey, this.#opts, connOptions, signal);
  }

  stream(): tts.SynthesizeStream {
    // Non-streaming provider — the framework wraps this in a sentence-level
    // StreamAdapter automatically when a streaming TTS is required.
    throw new Error('Streaming is not supported by GoogleTTS; it is auto-wrapped by the framework.');
  }

  override async close() {
    this.abortController.abort();
  }
}

class ChunkedStream extends tts.ChunkedStream {
  label = 'google.ChunkedStream';
  #apiKey: string;
  #opts: GoogleTTSOptions;

  constructor(
    ttsInstance: GoogleTTS,
    text: string,
    apiKey: string,
    opts: GoogleTTSOptions,
    connOptions?: APIConnectOptions,
    abortSignal?: AbortSignal,
  ) {
    super(text, ttsInstance, connOptions, abortSignal);
    this.#apiKey = apiKey;
    this.#opts = opts;
  }

  protected async run() {
    const t0 = Date.now();
    try {
      const voiceName = VOICES[(this.#opts.voice as keyof typeof VOICES) ?? 'sunny'] ?? this.#opts.voice;
      const response = await fetch(`${SYNTHESIZE_URL}?key=${this.#apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.abortSignal,
        body: JSON.stringify({
          input: { text: this.inputText },
          voice: { languageCode: 'en-US', name: voiceName },
          audioConfig: {
            audioEncoding: 'LINEAR16',
            sampleRateHertz: SAMPLE_RATE,
            speakingRate: Math.max(0.25, Math.min(4, this.#opts.rate ?? 0.9)),
            pitch: Math.max(-20, Math.min(20, this.#opts.pitch ?? 0)),
          },
        }),
      });

      console.log(`[timing] Google TTS synthesize response in ${Date.now() - t0}ms`);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Google TTS request failed (${response.status}): ${body}`);
      }

      const { audioContent } = (await response.json()) as { audioContent: string };
      // LINEAR16 output includes a 44-byte WAV header; strip it before framing raw PCM.
      const raw = Buffer.from(audioContent, 'base64').subarray(44);

      const requestId = shortuuid();
      const audioByteStream = new AudioByteStream(SAMPLE_RATE, NUM_CHANNELS);
      const frames = audioByteStream.write(raw);
      let lastFrame: (typeof frames)[number] | undefined;
      const sendLastFrame = (segmentId: string, final: boolean) => {
        if (lastFrame) {
          this.queue.put({ requestId, segmentId, frame: lastFrame, final });
          lastFrame = undefined;
        }
      };
      for (const frame of frames) {
        sendLastFrame(requestId, false);
        lastFrame = frame;
      }
      sendLastFrame(requestId, true);
      console.log(`[timing] Google TTS frames queued at +${Date.now() - t0}ms`);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      throw error;
    } finally {
      this.queue.close();
    }
  }
}
