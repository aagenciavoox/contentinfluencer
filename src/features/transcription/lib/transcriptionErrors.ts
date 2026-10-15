export type TranscriptionErrorKind = 'rate-limit' | 'other';

/** Erro com mensagem pronta para a tela. Fica fora de extractAudio para não carregar a biblioteca de mídia. */
export class TranscriptionUserError extends Error {
  kind: TranscriptionErrorKind;

  constructor(message: string, kind: TranscriptionErrorKind = 'other') {
    super(message);
    this.kind = kind;
  }
}
