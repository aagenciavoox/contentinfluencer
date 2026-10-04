import type { FuncaoEditorial, FuncaoOrigem, Projeto } from '../../../lib/database.ts';
import { FUNCAO_LABELS, FUNCOES, funcaoHerdavelDaSerie, isFuncaoEditorial, rotuloDaSerie } from '../../editorial/lib/funcoes.ts';

/** Tipos oferecidos no formulário. `campanha` segue como legado e vira `publi`. */
export const PROJETO_TIPOS_FORMULARIO = ['publi', 'producao', 'evento', 'outro'] as const;

export type ProjetoTipoFormulario = (typeof PROJETO_TIPOS_FORMULARIO)[number];

export const PROJETO_TIPO_OPCOES: Array<{ value: ProjetoTipoFormulario; label: string }> = [
  { value: 'publi', label: 'Publi' },
  { value: 'producao', label: 'Produção' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
];

export function isProjetoEvento(tipo: string | null | undefined): boolean {
  return tipo === 'evento';
}

export function rotuloProjetoTipo(tipo: string | null | undefined): string {
  if (tipo === 'evento') return 'Evento';
  if (tipo === 'producao') return 'Produção';
  if (tipo === 'outro') return 'Outro';
  if (tipo === 'publi' || tipo === 'campanha') return 'Publi';
  return 'Projeto';
}

/**
 * Lê `projetos.aviso_dias`. Vazio vira null. Fora de 0–120 também vira null,
 * para não gravar um valor que o check do banco recusaria.
 */
export function readAvisoDias(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return null;
  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 120) return null;
  return numeric;
}

/** Campo do formulário. Vazio é válido (sem aviso). Texto fora de 0–120 é inválido. */
export function parseAvisoDiasInput(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = readAvisoDias(trimmed);
  return value == null ? 'invalid' : value;
}

export function avisoDiasInvalido(tipo: string, raw: string): boolean {
  return isProjetoEvento(tipo) && parseAvisoDiasInput(raw) === 'invalid';
}

/** Fora de evento o aviso não se aplica e fica vazio. */
export function avisoDiasParaSalvar(tipo: Projeto['tipo'] | string, raw: string): number | null | 'invalid' {
  if (!isProjetoEvento(tipo)) return null;
  return parseAvisoDiasInput(raw);
}

export function rotuloAvisoDias(dias: number | null | undefined): string {
  if (dias == null) return 'Sem aviso de antecedência';
  if (dias === 0) return 'Aviso no dia do evento';
  if (dias === 1) return 'Aviso com 1 dia de antecedência';
  return `Aviso com ${dias} dias de antecedência`;
}

export type EscolhaFuncaoEvento = FuncaoEditorial | 'herdada' | 'nenhuma' | 'indefinida';

export function isEscolhaFuncaoEvento(value: string): value is EscolhaFuncaoEvento {
  return value === 'herdada' || value === 'nenhuma' || value === 'indefinida' || isFuncaoEditorial(value);
}

type ConteudoNoEvento = {
  funcao?: FuncaoEditorial | null;
  funcaoOrigem?: FuncaoOrigem | null;
  classificacaoCongeladaEm?: string | null;
};

/** Valor do seletor. Cada roteiro guarda o seu, sem copiar o do vizinho. */
export function escolhaFuncaoNoEvento(content: ConteudoNoEvento): EscolhaFuncaoEvento {
  const origem = content.funcaoOrigem ?? null;
  if (!origem) return 'indefinida';
  if (origem === 'herdada') return 'herdada';
  if (origem === 'nenhuma') return 'nenhuma';
  if (isFuncaoEditorial(content.funcao)) return content.funcao;
  return 'indefinida';
}

/**
 * Grava a função neste roteiro. Publicado (classificação congelada) permanece como está.
 * A origem escolhida fica neste conteúdo; os outros roteiros do evento não mudam.
 */
export function aplicarFuncaoNoEvento<T extends ConteudoNoEvento>(
  content: T,
  escolha: EscolhaFuncaoEvento,
): T {
  if (content.classificacaoCongeladaEm) return content;
  if (escolha === 'herdada') return { ...content, funcao: null, funcaoOrigem: 'herdada' };
  if (escolha === 'nenhuma') return { ...content, funcao: null, funcaoOrigem: 'nenhuma' };
  if (escolha === 'indefinida') return { ...content, funcao: null, funcaoOrigem: null };
  return { ...content, funcao: escolha, funcaoOrigem: 'escolhida' };
}

export function opcoesFuncaoNoEvento(
  serie: { funcaoPadrao?: FuncaoEditorial | 'varia' | null } | null | undefined,
): Array<{ value: EscolhaFuncaoEvento; label: string }> {
  return [
    { value: 'herdada', label: rotuloDaSerie(funcaoHerdavelDaSerie(serie)) },
    ...FUNCOES.map(value => ({ value, label: FUNCAO_LABELS[value] })),
    { value: 'nenhuma', label: 'Nenhuma' },
    { value: 'indefinida', label: 'Ainda não escolhida' },
  ];
}
