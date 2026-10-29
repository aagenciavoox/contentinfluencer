/**
 * Hashtags padrão dos Ajustes para conteúdos sem série.
 * Só preenche campo vazio — nunca sobrescreve o que a pessoa já escreveu.
 */
export function hashtagsPadraoForaSerie(input: {
  seriesId: string | null | undefined;
  hashtagsAtuais: string | null | undefined;
  hashtagsForaSeries: string | null | undefined;
}): string {
  if (input.seriesId) return input.hashtagsAtuais ?? '';
  const atuais = (input.hashtagsAtuais ?? '').trim();
  if (atuais) return atuais;
  return (input.hashtagsForaSeries ?? '').trim();
}
