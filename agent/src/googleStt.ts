import { mergeFrames, normalizeLanguage, shortuuid, stt } from '@livekit/agents';
import type { AudioBuffer } from '@livekit/agents';

const RECOGNIZE_URL = 'https://speech.googleapis.com/v1/speech:recognize';

export interface GoogleSTTOptions {
  apiKey?: string;
  languageCode?: string;
}

export class GoogleSTT extends stt.STT {
  label = 'google.STT';
  #apiKey: string;
  #languageCode: string;

  constructor(opts: GoogleSTTOptions = {}) {
    super({ streaming: false, interimResults: false });
    const apiKey = opts.apiKey ?? process.env.GOOGLE_TTS_KEY;
    if (!apiKey) {
      throw new Error(
        'Google Cloud API key is required, whether as an argument or as $GOOGLE_TTS_KEY',
      );
    }
    this.#apiKey = apiKey;
    this.#languageCode = opts.languageCode ?? 'en-US';
  }

  override get provider() {
    return 'speech.googleapis.com';
  }

  protected async _recognize(frame: AudioBuffer, abortSignal?: AbortSignal): Promise<stt.SpeechEvent> {
    const merged = mergeFrames(frame);
    const audioBytes = Buffer.from(
      merged.data.buffer,
      merged.data.byteOffset,
      merged.data.byteLength,
    ).toString('base64');

    const response = await fetch(`${RECOGNIZE_URL}?key=${this.#apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abortSignal ?? null,
      body: JSON.stringify({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: merged.sampleRate,
          languageCode: this.#languageCode,
          model: 'default',
        },
        audio: { content: audioBytes },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Google STT request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      results?: { alternatives?: { transcript?: string; confidence?: number }[] }[];
    };
    const text = (data.results ?? [])
      .map((r) => r.alternatives?.[0]?.transcript ?? '')
      .join(' ')
      .trim();
    const confidence = data.results?.[0]?.alternatives?.[0]?.confidence ?? 1;

    return {
      type: stt.SpeechEventType.FINAL_TRANSCRIPT,
      requestId: shortuuid(),
      alternatives: [
        {
          language: normalizeLanguage(this.#languageCode),
          text,
          startTime: 0,
          endTime: 0,
          confidence,
        },
      ],
    };
  }

  stream(): stt.SpeechStream {
    // Non-streaming provider — the framework wraps this with VAD-based turn
    // detection automatically when a streaming STT is required.
    throw new Error('Streaming is not supported by GoogleSTT; it is auto-wrapped by the framework.');
  }
}
