import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  ConversionCanceledError,
  Input,
  Mp4OutputFormat,
  OggOutputFormat,
  Output,
  Quality,
  UnsupportedInputFormatError,
  WavOutputFormat,
  getFirstEncodableAudioCodec,
  type ConversionAudioOptions,
  type OutputFormat,
} from 'mediabunny';
import { TranscriptionUserError } from './transcriptionErrors';

/** Folga sob os 25 MB que o plano gratuito do Groq aceita por arquivo. */
export const MAX_AUDIO_UPLOAD_BYTES = 24 * 1024 * 1024;
/** O plano gratuito transcreve até 2 horas de áudio por hora. */
export const MAX_AUDIO_DURATION_SECONDS = 2 * 60 * 60;
/** Voz em mono a 24 kbps: 2 horas cabem em ~22 MB. */
const SPEECH_BITRATE = 24_000;
const WAV_SAMPLE_RATE = 16_000;
const WAV_BYTES_PER_SECOND = WAV_SAMPLE_RATE * 2;

export class AudioExtractionError extends TranscriptionUserError {}
export { ConversionCanceledError as AudioExtractionCanceledError };

export type ExtractedAudio = {
  blob: Blob;
  fileName: string;
  duration: number;
};

type AudioTarget = {
  format: OutputFormat;
  extension: string;
  mimeType: string;
  audio: ConversionAudioOptions;
};

async function chooseAudioTarget(duration: number): Promise<AudioTarget> {
  const compressed = await getFirstEncodableAudioCodec(['opus', 'aac'], {
    numberOfChannels: 1,
    sampleRate: 48_000,
    quality: new Quality({ bitrate: SPEECH_BITRATE }),
  });
  const compressedAudio = {
    numberOfChannels: 1,
    sampleRate: 48_000,
    quality: new Quality({ bitrate: SPEECH_BITRATE }),
    forceTranscode: true,
  };

  if (compressed === 'opus') {
    return {
      format: new OggOutputFormat(),
      extension: 'ogg',
      mimeType: 'audio/ogg',
      audio: { ...compressedAudio, codec: 'opus' },
    };
  }
  if (compressed === 'aac') {
    return {
      format: new Mp4OutputFormat(),
      extension: 'm4a',
      mimeType: 'audio/mp4',
      audio: { ...compressedAudio, codec: 'aac' },
    };
  }

  // Sem codificador de áudio no navegador: WAV 16 kHz mono, ~1,9 MB por minuto.
  if (duration * WAV_BYTES_PER_SECOND > MAX_AUDIO_UPLOAD_BYTES) {
    throw new AudioExtractionError(
      'Este navegador não comprime áudio, então aqui cabem só uns 12 minutos. No Chrome, Edge, Firefox ou Safari atualizados, vídeos longos funcionam.',
    );
  }
  return {
    format: new WavOutputFormat(),
    extension: 'wav',
    mimeType: 'audio/wav',
    audio: {
      codec: 'pcm-s16',
      numberOfChannels: 1,
      sampleRate: WAV_SAMPLE_RATE,
      forceTranscode: true,
    },
  };
}

/**
 * Separa só o áudio do vídeo, em mono e comprimido, sem sair do aparelho.
 * O arquivo é lido aos pedaços, então vídeos grandes não ocupam a memória inteira.
 */
export async function extractAudio(
  file: File,
  options: { onProgress?: (progress: number) => void; signal?: AbortSignal } = {},
): Promise<ExtractedAudio> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

  try {
    let audioTrack;
    try {
      audioTrack = await input.getPrimaryAudioTrack();
    } catch (error) {
      if (error instanceof UnsupportedInputFormatError) {
        throw new AudioExtractionError(
          'Este formato não abriu no navegador. MP4, MOV, WebM, MP3 e M4A costumam funcionar.',
        );
      }
      throw error;
    }
    if (!audioTrack) {
      throw new AudioExtractionError('Este arquivo não tem som, então não há o que transcrever.');
    }

    const duration = await input.computeDuration([audioTrack]);
    if (duration > MAX_AUDIO_DURATION_SECONDS) {
      throw new AudioExtractionError('Por enquanto dá para transcrever vídeos de até 2 horas.');
    }

    const target = await chooseAudioTarget(duration);
    const output = new Output({ format: target.format, target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { discard: true },
      audio: target.audio,
    });
    if (!conversion.isValid) {
      throw new AudioExtractionError(
        'O navegador não conseguiu ler o som deste vídeo. Exportar de novo em MP4 costuma resolver.',
      );
    }

    conversion.onProgress = progress => options.onProgress?.(progress);
    const cancel = () => void conversion.cancel();
    if (options.signal?.aborted) await conversion.cancel();
    options.signal?.addEventListener('abort', cancel, { once: true });
    try {
      await conversion.execute();
    } finally {
      options.signal?.removeEventListener('abort', cancel);
    }

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0) {
      throw new AudioExtractionError('O áudio saiu vazio. Vale conferir se o vídeo tem som.');
    }
    if (buffer.byteLength > MAX_AUDIO_UPLOAD_BYTES) {
      throw new AudioExtractionError('Mesmo comprimido, o áudio passou de 25 MB. Um trecho menor do vídeo cabe.');
    }

    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'audio';
    return {
      blob: new Blob([buffer], { type: target.mimeType }),
      fileName: `${baseName}.${target.extension}`,
      duration,
    };
  } finally {
    input.dispose();
  }
}
