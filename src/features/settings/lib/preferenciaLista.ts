/**
 * Agrupar e ordenar da lista da série ficam lembrados por série neste navegador (localStorage),
 * como as preferências da lista de conteúdos. Quem lê fora da página da série (o "Puxar" do
 * planejamento) segue a mesma escolha.
 */
export type PreferenciaLista = { agrupar?: string; ordem?: string };

const chavePreferencia = (id: string) => `criaki:serie-lista:${id}`;

export function lerPreferenciaLista(id: string): PreferenciaLista {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(chavePreferencia(id));
    const valor: unknown = raw ? JSON.parse(raw) : null;
    if (!valor || typeof valor !== 'object') return {};
    const bruto = valor as Record<string, unknown>;
    return {
      agrupar: typeof bruto.agrupar === 'string' ? bruto.agrupar : undefined,
      ordem: typeof bruto.ordem === 'string' ? bruto.ordem : undefined,
    };
  } catch {
    return {};
  }
}

export function gravarPreferenciaLista(id: string, preferencia: PreferenciaLista) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(chavePreferencia(id), JSON.stringify(preferencia));
  } catch {
    // Armazenamento bloqueado: a escolha vale só nesta visita.
  }
}
