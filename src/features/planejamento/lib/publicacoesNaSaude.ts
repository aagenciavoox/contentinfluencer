import type { Content, Platform, RedeSocial, Serie } from '../../../lib/database.ts';
import { redeDaConta, rotuloConta } from '../../contas/lib/contas.ts';
import type { DecisaoPeriodo } from '../../editorial/lib/editorialSettings.ts';
import { metasDasContas, type MetaDaConta, type MetaDaContaVigencia } from '../../editorial/lib/metasPorConta.ts';
import type { PausaEditorial } from '../../editorial/lib/pausas.ts';
import type { ProporcaoFuncoes } from '../../editorial/lib/proporcaoObjetivos.ts';
import { publicacoesDaAgenda, resumoDePublicacoes, rotuloDoFormato, type FormatoPublicacao } from '../../editorial/lib/publicacoes.ts';

/** Uma conta na Saúde: publicações no trecho (uma por conta), a meta da conta e a divisão por formato. */
export type ContaNaSaude = {
  id: string;
  nome: string;
  realizadas: number;
  total: number;
  programadas: number;
  /** Null = conta sem meta: não vira zero e deixa a soma incompleta. */
  meta: number | null;
  /** Por formato; no YouTube, vídeo longo e Shorts separados, e "Sem formato" identificado. */
  formatos: Array<{ formato: string; rotulo: string; total: number }>;
};

export type PublicacoesNaSaude = {
  contas: ContaNaSaude[];
  total: number;
  realizadas: number;
  /** Soma das metas das contas com meta; null quando nenhuma tem. */
  meta: number | null;
  incompleta: boolean;
  /**
   * Com filtro de rede, a seleção é só o que sai apenas nas redes marcadas (regra da Criação), e a meta
   * da conta conta todas as publicações dela: os números não são comparados à meta.
   */
  metaForaDoFiltro: boolean;
};

function metaDe(meta: MetaDaConta | undefined): number | null {
  return !meta || meta.semMeta ? null : meta.valor;
}

/**
 * Publicações por conta no trecho da Saúde, com a soma das contas. Só lê.
 * Com filtro, `contents` já vem só com os conteúdos que passam nele, como no calendário.
 */
export function publicacoesNaSaude(input: {
  contents: readonly Content[];
  platforms: readonly Platform[];
  series: readonly Serie[];
  periodo: { inicio: string; fim: string };
  linhas: readonly MetaDaContaVigencia[];
  decisao: DecisaoPeriodo | null;
  proporcaoGeral: ProporcaoFuncoes | null;
  pausas: readonly PausaEditorial[];
  /** Filtros do calendário: só a conta e o formato escolhidos. */
  filtro?: { redes: readonly RedeSocial[]; formato: string | null };
}): PublicacoesNaSaude {
  const filtro = input.filtro ?? { redes: [], formato: null };
  const metaForaDoFiltro = filtro.redes.length > 0;
  const ativas = input.platforms.filter(conta => conta.ativo && (filtro.redes.length === 0 || filtro.redes.includes(redeDaConta(conta) ?? 'outra')));
  const metas = metasDasContas({
    platformIds: ativas.map(conta => conta.id),
    linhas: input.linhas,
    periodo: input.periodo,
    decisao: input.decisao,
    proporcaoGeral: input.proporcaoGeral,
    pausas: input.pausas,
  });
  const agenda = publicacoesDaAgenda({ contents: input.contents, contas: input.platforms, series: input.series });
  const contas = ativas.map(conta => {
    const resumo = resumoDePublicacoes(agenda, input.periodo, {
      platformIds: [conta.id],
      formatos: filtro.formato ? [filtro.formato as FormatoPublicacao] : undefined,
    });
    const metaDaConta = metas.contas.find(item => item.platformId === conta.id);
    const rede = redeDaConta(conta);
    return {
      id: conta.id,
      nome: rotuloConta(conta),
      realizadas: resumo.realizadas,
      total: resumo.total,
      programadas: resumo.programadas,
      // Com filtro de formato vale a parcela daquele formato; sem parcela, sem meta.
      meta: metaForaDoFiltro ? null : filtro.formato
        ? metaDaConta?.parcelas.find(parcela => parcela.formato === filtro.formato)?.noPeriodo ?? null
        : metaDe(metaDaConta),
      formatos: Object.entries(resumo.porFormato)
        .filter(([, contagem]) => (contagem?.total ?? 0) > 0)
        .map(([formato, contagem]) => ({ formato, rotulo: rotuloDoFormato(formato, rede), total: contagem?.total ?? 0 })),
    };
  });
  return {
    contas,
    total: contas.reduce((soma, conta) => soma + conta.total, 0),
    realizadas: contas.reduce((soma, conta) => soma + conta.realizadas, 0),
    meta: contas.some(conta => conta.meta != null) ? contas.reduce((soma, conta) => soma + (conta.meta ?? 0), 0) : null,
    incompleta: !metaForaDoFiltro && contas.some(conta => conta.meta == null),
    metaForaDoFiltro,
  };
}
