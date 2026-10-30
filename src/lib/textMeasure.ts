export function partesValorVazio() {
  return { visual: '—', leitor: 'sem valor' } as const;
}

export function contagemDeTexto(value: string, limit?: number | null, mode: 'chars' | 'words' = 'chars') {
  const quantidade = mode === 'words'
    ? (value.trim() ? value.trim().split(/\s+/).length : 0)
    : value.length;
  return contagemDeQuantidade(quantidade, limit, mode);
}

export function contagemDeQuantidade(quantidade: number, limit?: number | null, mode: 'chars' | 'words' = 'chars') {
  const acima = typeof limit === 'number' && quantidade > limit;
  const perto = typeof limit === 'number' && !acima && limit > 0 && quantidade >= Math.floor(limit * 0.9);
  const numero = quantidade.toLocaleString('pt-BR');
  const texto = mode === 'words'
    ? `${numero} ${quantidade === 1 ? 'palavra' : 'palavras'}`
    : typeof limit === 'number'
      ? `${numero} / ${limit.toLocaleString('pt-BR')}`
      : `${numero} ${quantidade === 1 ? 'caractere' : 'caracteres'}`;
  return { texto, tom: acima ? 'acima' as const : perto ? 'perto' as const : 'ok' as const };
}
