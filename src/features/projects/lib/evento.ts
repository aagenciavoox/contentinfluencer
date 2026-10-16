import type { FuncaoEditorial, FuncaoOrigem, Projeto } from '../../../lib/database.ts';
import { FUNCAO_LABELS, FUNCOES, funcaoHerdavelDaSerie, isFuncaoEditorial, rotuloDaSerie } from '../../editorial/lib/funcoes.ts';

/** `campanha` é o valor legado de Publi. Produção e os demais tipos ficam como estão. */
function tipoCanonico(tipo: string | null | undefined): string {
  if (tipo === 'campanha') return 'publi';
  return tipo || '';
}

/** Tipos novos do formulário. `producao` só aparece ao editar um projeto que já é Produção. */
export const PROJETO_TIPOS_FORMULARIO = ['publi', 'parceria', 'evento', 'maratona', 'outro'] as const;

export type ProjetoTipoFormulario = (typeof PROJETO_TIPOS_FORMULARIO)[number] | 'producao';

export const PROJETO_TIPO_OPCOES: Array<{ value: ProjetoTipoFormulario; label: string }> = [
  { value: 'publi', label: 'Publi' },
  { value: 'parceria', label: 'Parceria' },
  { value: 'evento', label: 'Evento' },
  { value: 'maratona', label: 'Maratona de leitura' },
  { value: 'outro', label: 'Outro' },
];

const TIPOS_FORMULARIO = new Set<string>([
  ...PROJETO_TIPOS_FORMULARIO,
  'producao',
]);

export function tipoDoFormulario(tipo: string | null | undefined): ProjetoTipoFormulario {
  const normalizado = tipoCanonico(tipo);
  if (TIPOS_FORMULARIO.has(normalizado)) return normalizado as ProjetoTipoFormulario;
  return 'publi';
}

export function isProjetoPubli(tipo: string | null | undefined): boolean {
  return tipoCanonico(tipo) === 'publi';
}

/** Nomes já usados em Outro, para reaparecer no cadastro de outro projeto. */
export function tiposPersonalizadosUsados(
  projetos: readonly { tipo: string; tipoPersonalizado?: string | null }[],
): string[] {
  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const projeto of projetos) {
    if (tipoCanonico(projeto.tipo) !== 'outro') continue;
    const nome = projeto.tipoPersonalizado?.trim();
    if (!nome) continue;
    const chave = nome.toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(nome);
  }
  return nomes.sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

export function isProjetoEvento(tipo: string | null | undefined): boolean {
  return tipo === 'evento';
}

export function rotuloProjetoTipo(tipo: string | null | undefined, personalizado?: string | null): string {
  const canonico = tipoCanonico(tipo);
  if (canonico === 'evento') return 'Evento';
  if (canonico === 'producao') return 'Produção';
  if (canonico === 'parceria') return 'Parceria';
  if (canonico === 'maratona') return 'Maratona de leitura';
  if (canonico === 'outro') return personalizado?.trim() || 'Outro';
  if (canonico === 'publi') return 'Publi';
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
