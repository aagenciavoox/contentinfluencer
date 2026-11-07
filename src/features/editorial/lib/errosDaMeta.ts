import { inteiroNaoNegativo } from '../../../lib/inteiro.ts';
import { chaveDoEscopo } from './acompanhamento.ts';
import { frequenciaParaGravar, MAX_VEZES_DA_META } from './metaDaOnda.ts';

/** Um campo que impede salvar a meta da série ou da wave. `id` é o controle que recebe o foco. */
export type ErroDaMeta = { id: string; mensagem: string };

export const ID_META = {
  quantidade: 'meta-geral-quantidade',
  periodo: 'meta-geral-periodo',
  inicio: 'meta-geral-inicio',
} as const;

export function idDoEscopo(linhaId: string, campo: 'conta' | 'formato' | 'inicio' | 'termino' | 'meta-inicio' | 'meta-vezes'): string {
  return `escopo-${linhaId}-${campo}`;
}

export function idDaJanela(prefixo: string, campo: 'inicio' | 'termino'): string {
  return `${prefixo}-${campo}`;
}

type Janela = { inicio: string | null; termino: string | null };

type LinhaValidada = Janela & {
  id: string;
  escopo: 'conta' | 'formato';
  platformId: string | null;
  formato: string | null;
  metaVezes: string;
  metaUnidade: string;
  metaAPartirDe: string;
  rotulo: string;
};

function terminoAntes(janela: Janela): boolean {
  return Boolean(janela.inicio && janela.termino && janela.inicio > janela.termino);
}

/**
 * Tudo o que falta para gravar a meta, de uma vez. A quantidade vazia não é erro:
 * ela tira a meta. A data de início só é obrigatória no ciclo de 14 dias.
 */
export function errosDaMeta(input: {
  vezes: string;
  unidade: string;
  inicio: string;
  tipo: 'serie' | 'quadro' | 'temporada';
  janelaOnda?: Janela | null;
  janelaGeral?: Janela | null;
  linhas?: readonly LinhaValidada[];
  comEscopos: boolean;
}): ErroDaMeta[] {
  const erros: ErroDaMeta[] = [];
  if (input.vezes.trim() && inteiroNaoNegativo(input.vezes) == null) {
    erros.push({ id: ID_META.quantidade, mensagem: 'Use um número inteiro, sem ponto nem sinal.' });
  }
  const vezesNumero = inteiroNaoNegativo(input.vezes);
  const frequencia = frequenciaParaGravar({
    vezes: vezesNumero,
    unidade: input.unidade,
    aPartirDe: input.inicio,
    tipo: input.tipo,
  });
  if ('erro' in frequencia) {
    erros.push({
      id: frequencia.campo === 'quantidade'
        ? ID_META.quantidade
        : frequencia.campo === 'inicio'
          ? ID_META.inicio
          : ID_META.periodo,
      mensagem: frequencia.erro,
    });
  }

  if (input.janelaOnda && terminoAntes(input.janelaOnda)) {
    erros.push({ id: idDaJanela('onda', 'termino'), mensagem: 'O término da wave vem antes do início.' });
  }

  if (!input.comEscopos) return erros;

  if (input.janelaGeral && terminoAntes(input.janelaGeral)) {
    erros.push({ id: idDaJanela('geral', 'termino'), mensagem: 'O término do acompanhamento geral vem antes do início.' });
  }

  const vistos = new Set<string>();
  for (const linha of input.linhas ?? []) {
    const chave = chaveDoEscopo(linha);
    if (vistos.has(chave)) {
      erros.push({
        id: idDoEscopo(linha.id, linha.escopo === 'formato' ? 'formato' : 'conta'),
        mensagem: `Há dois acompanhamentos em ${linha.rotulo}. Deixe só um.`,
      });
    } else {
      vistos.add(chave);
    }
    if (linha.escopo === 'conta' && !linha.platformId) {
      erros.push({ id: idDoEscopo(linha.id, 'conta'), mensagem: `Escolha a conta de ${linha.rotulo}.` });
    }
    if (terminoAntes(linha)) {
      erros.push({ id: idDoEscopo(linha.id, 'termino'), mensagem: `Em ${linha.rotulo}, o término vem antes do início.` });
    }
    const quantidade = inteiroNaoNegativo(linha.metaVezes);
    if (linha.metaVezes.trim() && quantidade == null) {
      erros.push({
        id: idDoEscopo(linha.id, 'meta-vezes'),
        mensagem: `Em ${linha.rotulo}, use um número inteiro, sem ponto nem sinal.`,
      });
    }
    if (linha.metaVezes.trim() === '0' || quantidade === 0) {
      erros.push({
        id: idDoEscopo(linha.id, 'meta-vezes'),
        mensagem: `Em ${linha.rotulo}, quantidade zero não apaga a meta. Deixe o campo vazio para usar a meta geral.`,
      });
    } else if (Number.isFinite(quantidade) && quantidade > MAX_VEZES_DA_META) {
      erros.push({
        id: idDoEscopo(linha.id, 'meta-vezes'),
        mensagem: `Em ${linha.rotulo}, a quantidade máxima da meta é ${MAX_VEZES_DA_META}.`,
      });
    }
    if (Number.isFinite(quantidade) && quantidade > 0 && quantidade <= MAX_VEZES_DA_META && linha.metaUnidade === 'quinzena' && !linha.metaAPartirDe) {
      erros.push({
        id: idDoEscopo(linha.id, 'meta-inicio'),
        mensagem: `Em ${linha.rotulo}, a meta a cada 14 dias precisa da data de início dos ciclos.`,
      });
    }
  }
  return erros;
}
