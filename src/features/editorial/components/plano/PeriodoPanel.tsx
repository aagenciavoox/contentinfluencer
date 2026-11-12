import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, CalendarRange, Flag, Layers, Target } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { DisclosureButton } from '../../../../components/ui/DisclosureButton';
import { InlineNotice, type InlineNoticeAction } from '../../../../components/ui/InlineNotice';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import type { FuncaoEditorial } from '../../../../lib/database';
import { BREAKPOINTS } from '../../../../shared/breakpoints';
import { reservaPronta, rotuloCapacidadeSeries, textoEstoque } from '../../lib/estoque';
import { listarSoEmOutrasRedes } from '../../lib/soEmOutrasRedes';
import { entriesDaConcentracao } from '../../../planejamento/lib/concentracaoAoColocar';
import { avisosDeOrientacao, mapaSequenciaPorConteudo } from '../../../planejamento/lib/orientacaoEditorial';
import { ETAPA_LABEL, ETAPAS, ETAPAS_DE_CONTEUDO, contagemPorEtapaVazia, somaDasEtapas, type ContagemPorEtapa, type Etapa } from '../../lib/etapas';
import { apurarSerie, textoDaFrequencia, textoDoVolume } from '../../lib/apuracaoSerie';
import { exclusaoDeMetaPropria } from '../../lib/metaPropria';
import { FUNCAO_CURTA, FUNCOES } from '../../lib/funcoes';
import { decisaoDoPeriodo } from '../../lib/periodoEditorial';
import {
  frasesDoResumo,
  metasDoPeriodo,
  resumoDasMetas,
  somaDaProporcao,
  type OrigemDaMeta,
} from '../../lib/proporcaoObjetivos';
import { sortPilares } from '../../../settings/lib/activePilares';
import { CardConfiguracao } from './campos';
import type { ObjetivoNoEditor } from './AjustarMetasDialog';
import { ItensDoPeriodoDialog, type FiltroDosItens } from './ItensDoPeriodoDialog';
import { PlanoVigenteView } from './PlanoVigenteView';
import { ProporcaoObjetivosEditor } from './ProporcaoObjetivosEditor';
import {
  PeriodoEditorialControl,
  semanasParciais,
  useContagemDoPeriodo,
  useItensDaJanela,
  type PeriodoSelecionado,
} from './PeriodoEditorialControl';
import { useEditorialPlano } from './useEditorialPlano';
import { usePostItsNaData } from '../../../planejamento/hooks/usePostItsNaData';
import { limiteSemanalDoPeriodo } from '../../lib/vigencias';

/** "3 roteiros e 2 post-its estão sem objetivo; a distribuição está incompleta." */
function textoSemObjetivo(roteiros: number, reservas: number): string {
  const partes = [
    ...(roteiros === 1 ? ['1 roteiro'] : roteiros > 1 ? [`${roteiros} roteiros`] : []),
    ...(reservas === 1 ? ['1 post-it'] : reservas > 1 ? [`${reservas} post-its`] : []),
  ];
  const verbo = roteiros + reservas === 1 ? 'está' : 'estão';
  return `${partes.join(' e ')} ${verbo} sem objetivo; a distribuição está incompleta.`;
}

function celula(valor: number | null): string {
  return valor == null ? '—' : String(valor);
}


/** "27 de set. a 3 de out.": a semana parcial no cartão; o rótulo longo fica para o leitor de tela. */
function rotuloCurtoDaSemana(inicio: string, fim: string): string {
  const dia = (iso: string) => format(parseISO(iso), "d 'de' MMM", { locale: ptBR });
  return `${dia(inicio)}. a ${dia(fim)}.`;
}

/** Cor de cada objetivo: só enfeita, o nome vem sempre ao lado. */
const COR_DA_FUNCAO: Record<FuncaoEditorial, string> = {
  atrair: 'var(--accent-pink)',
  converter: 'var(--accent-blue)',
  aprofundar: 'var(--accent-orange)',
  comunidade: 'var(--accent-green)',
  acao: 'var(--accent-red)',
  reter: 'var(--accent-purple)',
};

/** Uma linha da distribuição. `funcao` null é "Sem objetivo": não tem meta. */
type LinhaObjetivo = {
  funcao: FuncaoEditorial | null;
  nome: string;
  cor: string;
  /** Meta que vale no período: o ajuste, ou a proporção × limite. */
  meta: number | null;
  /** O que a proporção daria, para o "voltar à proporção". */
  calculada: number | null;
  percentual: number | null;
  origem: OrigemDaMeta;
  previsto: number;
  porEtapa: ContagemPorEtapa;
};

function chaveDaLinha(linha: LinhaObjetivo): string {
  return linha.funcao ?? 'sem-objetivo';
}

/** A meta que vale, só para ler. Mudar fica no editor de metas do período. */
function ValorDaMeta({ linha }: { linha: LinhaObjetivo }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <Text variant="body" as="span" className={`tabular-nums ${linha.meta == null ? 'text-[var(--text-tertiary)]' : ''}`}>
        {linha.meta == null ? '—' : linha.meta}
      </Text>
      {linha.origem === 'ajustada' ? <Badge variant="neutral">ajustado</Badge> : null}
    </span>
  );
}

/** Barra fina de previstos sobre a meta. Sem meta, não desenha nada. */
function BarraDaMeta({ linha }: { linha: LinhaObjetivo }) {
  if (linha.meta == null || linha.meta === 0) return null;
  const parte = Math.min(1, linha.previsto / linha.meta);
  return (
    <span
      aria-hidden
      className="mt-1 block h-1 w-full min-w-12 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-hover)]"
    >
      <span className="block h-full rounded-[var(--radius-pill)]" style={{ width: `${parte * 100}%`, backgroundColor: linha.cor }} />
    </span>
  );
}

function PrevistosDaMeta({
  linha,
  onAbrir,
}: {
  linha: LinhaObjetivo;
  onAbrir: () => void;
}) {
  return (
    <span className="inline-flex flex-col items-stretch">
      <span className="inline-flex items-center justify-center gap-1">
        <NumeroQueAbre
          valor={linha.previsto}
          rotulo={rotuloDoNumero(linha.previsto, linha, null)}
          onAbrir={onAbrir}
        />
        {linha.meta != null ? (
          <Text variant="secondary" as="span" className="tabular-nums">de {linha.meta}</Text>
        ) : null}
      </span>
      <BarraDaMeta linha={linha} />
    </span>
  );
}

/** Número que abre a lista do que está nele. Zero não abre nada. */
function NumeroQueAbre({
  valor,
  rotulo,
  onAbrir,
}: {
  valor: number;
  rotulo: string;
  onAbrir: () => void;
}) {
  if (valor === 0) {
    return <Text variant="body" as="span" className="tabular-nums text-[var(--text-tertiary)]">0</Text>;
  }
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={rotulo}
      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-input)] px-2 t-body-strong tabular-nums text-[var(--text-primary)] underline decoration-[var(--border-color)] underline-offset-4 hover:bg-[var(--bg-hover)] hover:decoration-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
    >
      {valor}
    </button>
  );
}

function rotuloDoNumero(valor: number, linha: LinhaObjetivo, etapa: Etapa | null): string {
  const quantos = valor === 1 ? 'o item' : `os ${valor} itens`;
  return etapa
    ? `Ver ${quantos} de ${linha.nome} em ${ETAPA_LABEL[etapa]}`
    : `Ver ${quantos} previstos de ${linha.nome}`;
}

/**
 * Tabela no computador; no celular, uma linha por objetivo com as etapas que têm item.
 * Cada número abre a lista do que está nele.
 */
/** Só leitura: mudar a meta de um objetivo fica no editor de metas do período. */
function MetasPorObjetivo({
  linhas,
  onAbrir,
}: {
  linhas: LinhaObjetivo[];
  onAbrir: (filtro: FiltroDosItens) => void;
}) {
  const estreito = useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 1}px)`);
  const abrir = (linha: LinhaObjetivo, etapa: Etapa | null) => onAbrir({
    titulo: etapa ? `${linha.nome} · ${ETAPA_LABEL[etapa]}` : `${linha.nome} · Previstos`,
    objetivo: linha.funcao,
    etapas: etapa ? [etapa] : ETAPAS,
  });
  const percentual = (linha: LinhaObjetivo) => (
    linha.percentual != null ? (
      <Text variant="meta" as="span" className="tabular-nums">{linha.percentual}%</Text>
    ) : null
  );

  if (estreito) {
    return (
      <ul className="mt-3">
        {linhas.map(linha => {
          const etapasComItem = ETAPAS.filter(etapa => linha.porEtapa[etapa] > 0);
          const funcao = linha.funcao;
          return (
            <li
              key={chaveDaLinha(linha)}
              className="stack-xs border-b border-[var(--border-color)] py-2 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={funcao ? `meta-${funcao}` : undefined} className="flex min-w-0 items-center gap-2.5">
                  <span className="entity-color-dot h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: linha.cor }} aria-hidden />
                  <Text variant="body" as="span">{linha.nome}</Text>
                  {percentual(linha)}
                </label>
                {funcao ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <Text variant="label" as="span" aria-hidden>Meta</Text>
                    <ValorDaMeta linha={linha} />
                  </span>
                ) : null}
              </div>
              {linha.previsto === 0 && linha.meta == null ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">Nada previsto</Text>
              ) : (
                <div className="stack-xs">
                  <span className="flex items-center gap-1">
                    <Text variant="meta" as="span">Previstos</Text>
                    <NumeroQueAbre
                      valor={linha.previsto}
                      rotulo={rotuloDoNumero(linha.previsto, linha, null)}
                      onAbrir={() => abrir(linha, null)}
                    />
                    {linha.meta != null ? (
                      <Text variant="meta" as="span" className="tabular-nums">de {linha.meta}</Text>
                    ) : null}
                  </span>
                  <BarraDaMeta linha={linha} />
                  {etapasComItem.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {etapasComItem.map(etapa => (
                        <span key={etapa} className="inline-flex items-center gap-1">
                          <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{ETAPA_LABEL[etapa]}</Text>
                          <NumeroQueAbre
                            valor={linha.porEtapa[etapa]}
                            rotulo={rotuloDoNumero(linha.porEtapa[etapa], linha, etapa)}
                            onAbrir={() => abrir(linha, etapa)}
                          />
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  const colunas = ['Meta', 'Previstos de meta', ...ETAPAS.map(etapa => ETAPA_LABEL[etapa])];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[var(--surface-subtle)]">
            <th scope="col" className="rounded-l-[var(--radius-input)] py-2 pl-3 pr-3">
              <Text variant="label" as="span" className="text-[var(--text-secondary)]">Objetivo</Text>
            </th>
            {colunas.map((coluna, index) => (
              <th
                key={coluna}
                scope="col"
                className={`px-2 py-2 text-center ${index === colunas.length - 1 ? 'rounded-r-[var(--radius-input)]' : ''}`}
              >
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">{coluna}</Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(linha => {
            const funcao = linha.funcao;
            return (
              <tr key={chaveDaLinha(linha)} className="border-b border-[var(--border-color)] last:border-b-0">
                <th scope="row" className="py-2 pl-3 pr-3 font-normal">
                  <span className="flex items-center gap-2.5">
                    <span className="entity-color-dot h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: linha.cor }} aria-hidden />
                    {funcao ? (
                      <label htmlFor={`meta-${funcao}`}>
                        <Text variant="body" as="span">{linha.nome}</Text>
                      </label>
                    ) : (
                      <Text variant="body" as="span">{linha.nome}</Text>
                    )}
                    {percentual(linha)}
                  </span>
                </th>
                <td className="px-2 py-1.5">
                  <span className="flex flex-col items-center gap-1">
                    {funcao ? (
                      <ValorDaMeta linha={linha} />
                    ) : (
                      <Text variant="body" as="span" className="text-[var(--text-tertiary)]">—</Text>
                    )}
                  </span>
                </td>
                <td className="border-r border-[var(--border-color)] px-2 py-1 text-center">
                  <PrevistosDaMeta linha={linha} onAbrir={() => abrir(linha, null)} />
                </td>
                {ETAPAS.map(etapa => (
                  <td key={etapa} className="px-2 py-1 text-center">
                    <NumeroQueAbre
                      valor={linha.porEtapa[etapa]}
                      rotulo={rotuloDoNumero(linha.porEtapa[etapa], linha, etapa)}
                      onAbrir={() => abrir(linha, etapa)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type LinhaDoPeriodo = { id: string; nome: string; cor?: string | null; texto: string };

function GrupoDoPeriodo({ titulo, linhas }: { titulo: string; linhas: LinhaDoPeriodo[] }) {
  return (
    <div className="stack-sm">
      <Text variant="eyebrow" as="p">{titulo}</Text>
      <ul className="stack-xs">
        {linhas.map(linha => (
          <li key={linha.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--border-color)]"
                style={linha.cor ? { backgroundColor: linha.cor } : undefined}
              />
              <Text variant="body" as="span" className="truncate">{linha.nome}</Text>
            </span>
            <Text variant="secondary" as="span" className="shrink-0 tabular-nums">{linha.texto}</Text>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Aba Período: o seletor de período aparece uma vez, e tudo que muda com ele fica aqui,
 * lido e editado no mesmo lugar (prioridade, metas, limite de semana parcial). O que vale
 * sempre fica na aba Ajustes.
 */
export function PeriodoPanel({
  periodo,
  onPeriodoChange,
  onAbrirAjustes,
  planoRecolhivel = true,
  semListasDoPeriodo = false,
}: {
  periodo: PeriodoSelecionado;
  onPeriodoChange: (periodo: PeriodoSelecionado) => void;
  onAbrirAjustes: () => void;
  /** No Editorial, contas e séries do período ficam na tabela do Plano (sem repetir as listas). */
  semListasDoPeriodo?: boolean;
  /** No Planejamento as metas abrem fechadas; no Editorial ficam abertas. */
  planoRecolhivel?: boolean;
}) {
  const navigate = useNavigate();
  const { state, settings, salvarDecisao, salvarProporcao } = useEditorialPlano();
  const [filtroItens, setFiltroItens] = useState<FiltroDosItens | null>(null);
  const [editandoProporcao, setEditandoProporcao] = useState(false);
  const [semanasAbertas, setSemanasAbertas] = useState(false);
  const [detalhesAvancados, setDetalhesAvancados] = useState(false);
  // Um editor de metas só, aberto do card de metas ou das seções abaixo.
  const [ajustarAberto, setAjustarAberto] = useState(false);
  const contagem = useContagemDoPeriodo(periodo.inicio, periodo.fim);
  const itensJanela = useItensDaJanela(periodo.inicio, periodo.fim);
  const postIts = usePostItsNaData();
  const decisao = decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);
  const parciais = semanasParciais(periodo.inicio, periodo.fim);
  // O período definido manda: vigente usa o ritmo atual inteiro; encerrado mantém o que valia nele.
  const limiteSemanal = limiteSemanalDoPeriodo(
    { limiteSemanal: settings.preferencias.limiteSemanal, vigencias: settings.vigencias },
    periodo,
  );
  const semLimite = limiteSemanal == null;
  const estoque = reservaPronta(state.contents, {
    redeReferenciaId: settings.preferencias.redeReferenciaId,
  });
  const reserva = settings.preferencias.reservaProntos;
  const soEmOutras = listarSoEmOutrasRedes({
    contents: state.contents,
    settings: { redeReferenciaId: settings.preferencias.redeReferenciaId },
    platforms: state.platforms,
  });
  const capacidadeSeries = rotuloCapacidadeSeries({
    limite: contagem.limite,
    reservaFora: contagem.reservaForaSeriesSemanal,
    comSerie: Math.max(0, contagem.previsto - contagem.semSerie),
    semSerie: contagem.semSerie,
  });
  const objetivos = new Map(contagem.objetivos.map(objetivo => [objetivo.id, objetivo]));

  const avisos: Array<{ id: string; texto: string; acao?: InlineNoticeAction }> = [];
  if (!semLimite && contagem.excesso != null && contagem.excesso > 0) {
    avisos.push({
      id: 'excesso',
      texto: contagem.notaSoma ?? `O período tem ${contagem.previsto} e o limite é ${contagem.limite}.`,
      acao: { rotulo: 'Ajustar o limite', onClick: onAbrirAjustes },
    });
  }
  if (contagem.espacosLivres > 0) {
    const n = contagem.espacosLivres;
    avisos.push({
      id: 'sem-pauta',
      texto: n === 1 ? '1 espaço sem pauta.' : `${n} espaços sem pauta.`,
      acao: { rotulo: 'Abrir o planejamento', onClick: () => navigate('/planejamento') },
    });
  }
  // Reserva sem objetivo também deixa a distribuição incompleta.
  const reservasSemObjetivo = contagem.semObjetivoPorEtapa.planejamento;
  if (contagem.semObjetivo > 0 || reservasSemObjetivo > 0) {
    avisos.push({
      id: 'sem-objetivo',
      texto: textoSemObjetivo(contagem.semObjetivo, reservasSemObjetivo),
      acao: {
        rotulo: 'Ver quais',
        onClick: () => setFiltroItens({
          titulo: 'Sem objetivo',
          objetivo: null,
          etapas: reservasSemObjetivo > 0 ? ETAPAS : ETAPAS_DE_CONTEUDO,
        }),
      },
    });
  }
  // Mesma leitura do Planejamento: avisos nunca bloqueiam.
  for (const aviso of avisosDeOrientacao({
    postIts,
    contents: state.contents,
    series: state.series,
    temas: state.temas,
    obras: state.bibliotecaItems,
    periodo: { inicio: periodo.inicio, fim: periodo.fim },
    entries: entriesDaConcentracao({
      postIts, contents: state.contents, series: state.series, temas: state.temas,
      obras: state.bibliotecaItems, settings, platforms: state.platforms,
      periodo: {inicio: periodo.inicio, fim: periodo.fim},
    }),
    sequenciaPorConteudo: settings.concentracao.contarSequencia ? mapaSequenciaPorConteudo(state.contents) : {},
    itensSerie: itensJanela,
    limiteGravacoesDia: settings.preferencias.limiteGravacoesDia,
    concentracao: settings.concentracao,
    excecoesConcentracao: settings.excecoesConcentracao,
    pausas: settings.pausas ?? [],
    platforms: state.platforms,
    redeReferenciaId: settings.preferencias.redeReferenciaId,
    diasGravacao: settings.preferencias.diasGravacao,
    antecedenciaPostagemDias: settings.preferencias.antecedenciaPostagemDias,
    temporadas: state.temporadas,
    avisosLigados: settings.avisos,
    indicadoresProducao: settings.indicadoresProducao,
  })) {
    avisos.push({
      id: aviso.id,
      texto: aviso.texto,
      acao: {
        rotulo: 'Abrir o planejamento',
        onClick: () => navigate('/planejamento'),
      },
    });
  }

  const numeros = [
    { id: 'limite', rotulo: periodo.modo === 'semana' ? 'Limite da semana' : 'Limite do período', valor: celula(contagem.limite) },
    { id: 'previstos', rotulo: 'Previstos', valor: String(contagem.previsto) },
    { id: 'postados', rotulo: 'Publicados', valor: String(contagem.porEtapa.postado) },
    {
      id: 'prontos',
      rotulo: 'Prontos de reserva',
      valor: reserva == null ? String(estoque.total) : textoEstoque(estoque.total, reserva),
    },
  ];

  const proporcao = settings.proporcaoFuncoes;
  const somaProporcao = somaDaProporcao(proporcao);
  const metas = metasDoPeriodo({ limite: contagem.limite, proporcao, ajustes: decisao?.metas });
  const linhasObjetivo: LinhaObjetivo[] = FUNCOES.map(funcao => {
    const porEtapa = objetivos.get(funcao)?.porEtapa ?? contagemPorEtapaVazia();
    const meta = metas[funcao];
    return {
      funcao,
      nome: FUNCAO_CURTA[funcao],
      cor: COR_DA_FUNCAO[funcao],
      meta: meta.meta,
      calculada: meta.calculada,
      percentual: meta.percentual,
      origem: meta.origem,
      previsto: somaDasEtapas(porEtapa),
      porEtapa,
    };
  });
  const frasesDasMetas = frasesDoResumo(resumoDasMetas(
    linhasObjetivo.flatMap(linha => (linha.funcao ? [{ funcao: linha.funcao, meta: linha.meta, previsto: linha.previsto }] : [])),
  ));
  // Sem objetivo entra como linha para a soma bater com os previstos do período.
  const previstosSemObjetivo = somaDasEtapas(contagem.semObjetivoPorEtapa);
  if (previstosSemObjetivo > 0) {
    linhasObjetivo.push({
      funcao: null,
      nome: 'Sem objetivo',
      cor: 'var(--text-tertiary)',
      meta: null,
      calculada: null,
      percentual: null,
      origem: null,
      previsto: previstosSemObjetivo,
      porEtapa: contagem.semObjetivoPorEtapa,
    });
  }

  // As contas que antes ficavam nos cards de pilar e de série: aqui, junto do período que as define.
  const previstosPorPilar = new Map(contagem.pilares.map(linha => [linha.id, linha.previsto]));
  const pilares: LinhaDoPeriodo[] = sortPilares(state.pilares)
    .filter(pilar => pilar.ativo || (previstosPorPilar.get(pilar.id) ?? 0) > 0)
    .map(pilar => {
      const previstos = previstosPorPilar.get(pilar.id) ?? 0;
      return {
        id: pilar.id,
        nome: pilar.nome,
        cor: pilar.cor,
        texto: previstos === 1 ? '1 previsto' : `${previstos} previstos`,
      };
    });

  // Mesma apuração das séries em todas as telas: episódios + reservas no período, frequência por janela.
  const series: LinhaDoPeriodo[] = state.series
    .filter(serie => serie.ativa)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(serie => {
      const apuracao = apurarSerie({
        serie,
        series: state.series,
        itens: itensJanela,
        periodo,
        excluir: exclusaoDeMetaPropria(serie, state.series, state.temporadas),
      });
      return {
        id: serie.id,
        nome: serie.name,
        cor: serie.cor,
        texto: `${textoDoVolume(apuracao.noPeriodo)} · ${textoDaFrequencia(apuracao)}`,
      };
    });
  const objetivosDoEditor: ObjetivoNoEditor[] = linhasObjetivo.flatMap(linha => (linha.funcao
    ? [{ funcao: linha.funcao, nome: linha.nome, meta: linha.meta, calculada: linha.calculada, percentual: linha.percentual, origem: linha.origem }]
    : []));


  const notaCapacidade = semLimite
    ? null
    : periodo.modo === 'semana'
      ? `Limite semanal de ${limiteSemanal}, salvo um ajuste desta semana.`
      : `Ritmo de ${limiteSemanal} por semana nos dias do período, sem as pausas com data, arredondado uma vez no total. Semanas ajustadas entram como estão.`;

  return (
    <div className="stack-lg">
      <PeriodoEditorialControl periodo={periodo} onChange={onPeriodoChange} />

      <PlanoVigenteView
        periodo={periodo}
        decisao={decisao}
        platforms={state.platforms}
        series={state.series}
        pilares={state.pilares}
        limiteSemanal={limiteSemanal}
        contagem={contagem}
        itensSerie={itensJanela}
        objetivos={objetivosDoEditor}
        semanasParciais={parciais}
        ajustarAberto={ajustarAberto}
        onAjustarAbertoChange={setAjustarAberto}
        onSalvarDecisao={patch => salvarDecisao(periodo, patch)}
        recolhivel={planoRecolhivel}
        semListas={semListasDoPeriodo}
      />

      <div className="pt-2">
        <DisclosureButton
          open={detalhesAvancados}
          onToggle={() => setDetalhesAvancados(aberto => !aberto)}
          controls="detalhes-avancados-periodo"
        >
          <Text variant="bodyStrong" as="span">Distribuição por objetivo e capacidade avançada</Text>
          <Text variant="secondary" as="span">Ver balanço por objetivo, pilares e semanas parciais.</Text>
        </DisclosureButton>
      </div>

      {detalhesAvancados ? (
        <div id="detalhes-avancados-periodo" className="stack-lg pt-2 border-t border-[var(--border-subtle)]">
          {/* Leitura do período: os números primeiro, numa faixa só. */}
          <div className="stack-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {numeros.map(item => (
            <Surface key={item.id} variant="info" padding="sm">
              <Text variant="label">{item.rotulo}</Text>
              <Text variant="itemTitle" as="p" className="mt-1 tabular-nums">{item.valor}</Text>
            </Surface>
          ))}
        </div>
        <Text variant="meta" as="p">
          {notaCapacidade ? `${notaCapacidade} ` : ''}
          {capacidadeSeries ? `${capacidadeSeries}. ` : ''}
          Cada ciclo conta uma vez na grade.
        </Text>
        <Text variant="meta" as="p">
          Reserva: {estoque.ineditos} {estoque.ineditos === 1 ? 'inédito' : 'inéditos'}
          {' · '}
          {estoque.reaproveitar} para reaproveitar
          {soEmOutras.length > 0
            ? ` · ${soEmOutras.length} só em outras redes`
            : ''}
        </Text>
        {semLimite ? (
          <div className="flex flex-wrap items-center gap-3">
            <Text variant="secondary" as="p">Quantos roteiros cabem na sua semana?</Text>
            <AppButton variant="secondary" size="sm" onClick={onAbrirAjustes}>
              Definir limite
            </AppButton>
          </div>
        ) : null}
      </div>

      {avisos.length > 0 ? (
        <div className="stack-sm">
          {avisos.map(aviso => <InlineNotice key={aviso.id} texto={aviso.texto} acao={aviso.acao} />)}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CardConfiguracao
          icone={<Flag className="h-5 w-5" />}
          titulo="Prioridade do período"
          acao={<AppButton variant="secondary" size="sm" onClick={() => setAjustarAberto(true)}>Ajustar metas</AppButton>}
        >
          <Text variant={decisao?.prioridade?.trim() ? 'body' : 'secondary'} as="p" className="whitespace-pre-wrap">
            {decisao?.prioridade?.trim() || 'Nenhuma prioridade escrita para este período.'}
          </Text>
        </CardConfiguracao>

        <CardConfiguracao
          icone={<Layers className="h-5 w-5" />}
          titulo="Pilares e séries no período"
          acao={(
            <AppButton
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/series')}
            >
              Ver todas as séries
            </AppButton>
          )}
        >
          {pilares.length > 0 || series.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {pilares.length > 0 ? <GrupoDoPeriodo titulo="Pilares" linhas={pilares} /> : null}
              {series.length > 0 ? <GrupoDoPeriodo titulo="Séries" linhas={series} /> : null}
            </div>
          ) : (
            <Text variant="secondary">Nenhum pilar ou série ativa neste período.</Text>
          )}
        </CardConfiguracao>
      </div>

      <CardConfiguracao
        icone={<Target className="h-5 w-5" />}
        titulo="Distribuição por objetivo"
        descricao="Quanto espaço você quer dar para cada objetivo neste período?"
        acao={editandoProporcao ? undefined : (
          <AppButton variant="secondary" size="sm" onClick={() => setEditandoProporcao(true)}>
            {proporcao ? 'Editar distribuição' : 'Definir distribuição'}
          </AppButton>
        )}
      >
        {editandoProporcao ? (
          <ProporcaoObjetivosEditor
            idBase="proporcao-periodo"
            valor={proporcao}
            onCancelar={() => setEditandoProporcao(false)}
            onSalvar={nova => {
              salvarProporcao(nova);
              setEditandoProporcao(false);
            }}
          />
        ) : null}
        {!editandoProporcao && proporcao && somaProporcao !== 100 ? (
          <InlineNotice
            texto={`Total: ${somaProporcao}%. ${somaProporcao < 100 ? `Faltam ${100 - somaProporcao}% para fechar 100%.` : `Passou ${somaProporcao - 100}%. Ajuste os percentuais para somarem 100%.`}`}
            acao={{ rotulo: 'Ajustar a distribuição', onClick: () => setEditandoProporcao(true) }}
          />
        ) : null}
        {!editandoProporcao && !proporcao ? (
          <Text variant="secondary">Sem distribuição definida, as metas ficam em branco. Você ainda pode digitar uma meta só para este período.</Text>
        ) : null}
        {proporcao && contagem.limite == null ? (
          <Text variant="secondary" as="p">Sem limite no período, a distribuição aparece só em %. Defina o limite para ver quantos roteiros cabem em cada objetivo.</Text>
        ) : null}
        {frasesDasMetas.length > 0 ? (
          <Surface variant="info" padding="sm">
            <p role="status"><Text variant="body" as="span">{frasesDasMetas.join(' · ')}</Text></p>
          </Surface>
        ) : null}
        <MetasPorObjetivo linhas={linhasObjetivo} onAbrir={setFiltroItens} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="secondary">
            Planejamento conta os post-its com data. As outras colunas seguem a etapa de cada roteiro.
          </Text>
          <AppButton variant="secondary" size="sm" onClick={() => setAjustarAberto(true)}>Ajustar metas</AppButton>
        </div>
      </CardConfiguracao>

      <ItensDoPeriodoDialog
        filtro={filtroItens}
        itens={contagem.itens}
        periodo={periodo}
        onClose={() => setFiltroItens(null)}
      />

      {parciais.length > 0 ? (
        <Surface padding="sm" className="stack-sm">
          <DisclosureButton
            open={semanasAbertas}
            onToggle={() => setSemanasAbertas(aberto => !aberto)}
            controls="semanas-parciais"
          >
            <CalendarRange className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
            <Text variant="bodyStrong" as="span">Semanas que cruzam o período</Text>
            <Text variant="secondary" as="span">Capacidade das semanas parciais.</Text>
          </DisclosureButton>
          {semanasAbertas ? (
            <div id="semanas-parciais" className="stack-sm">
              <ul className="stack-sm">
                {parciais.map(semana => {
                  const ajuste = decisao?.ajustesSemana.find(
                    item => item.inicio === semana.inicio && item.fim === semana.fim,
                  );
                  return (
                    <li
                      key={`${semana.inicio}:${semana.fim}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-4 py-2.5"
                    >
                      <Text variant="bodyStrong" as="span">{rotuloCurtoDaSemana(semana.inicio, semana.fim)}</Text>
                      <Text variant="secondary" as="span">
                        {ajuste != null
                          ? `Ajustada: ${ajuste.limite}`
                          : semLimite ? 'Sem ritmo definido' : `Pelo ritmo de ${limiteSemanal} por semana, proporcional aos dias`}
                      </Text>
                    </li>
                  );
                })}
              </ul>
              <div>
                <AppButton variant="secondary" size="sm" onClick={() => setAjustarAberto(true)}>Ajustar metas</AppButton>
              </div>
            </div>
          ) : null}
        </Surface>
      ) : null}
        </div>
      ) : null}
    </div>
  );
}
