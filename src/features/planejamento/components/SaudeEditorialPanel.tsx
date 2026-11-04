import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { readStoredJson, writeStoredJson } from '../../../lib/browserStorage';
import type { Pilar, Serie } from '../../../lib/database';
import type { GradeCounts } from '../../editorial/lib/gradeCounts';
import type { PreparoDoPeriodo } from '../lib/monthHealth';
import { distribuicaoPorPilar } from '../lib/periodoDaSaude';
import { cn } from '../../../lib/utils';
import type { GradeEntry } from '../../editorial/lib/gradeEntries';
import { rotuloIntervalo, textoSemObjetivo, type Continuidade, type DistribuicaoObjetivos } from '../lib/saudeIndicadores';
import { textoDaJanela } from '../../editorial/lib/apuracaoSerie';
import { ItensDaSaudeDialog, type ListaDaSaude } from './ItensDaSaudeDialog';
import type { LinhaDoEscopoNaSaude } from '../lib/continuidadePorEscopoNaSaude';
import type { PublicacoesNaSaude } from '../lib/publicacoesNaSaude';
import { pontosParaRevisar, type AvisoOrientacao } from '../lib/orientacaoEditorial';
import { blocoDoAviso, detalheDoAviso } from '../lib/detalheDoAviso';

const STORAGE_EXPANDED_KEY = 'content-os:saude-editorial-expanded';

export interface SaudeEditorialPanelProps {
  /** "Período: 16/10 – 30/12": o período salvo no Editorial que a saúde cobre. */
  rotuloPeriodo: string;
  /** Quando o calendário mostra datas fora do período. */
  avisoPeriodo?: string | null;
  counts: GradeCounts & {
    preparo?: PreparoDoPeriodo;
    limite?: number | null;
    previsto?: number;
    postIts?: number;
  };
  series?: readonly Serie[];
  pilares: readonly Pilar[];
  /** Objetivo de cada item (o do conteúdo, senão da série, senão do post-it) sobre todos os itens. */
  objetivos?: DistribuicaoObjetivos<GradeEntry>;
  /** Séries e quadros com meta, conferidos intervalo a intervalo. */
  continuidade?: Continuidade<GradeEntry>;
  /** Acompanhamentos por conta ou formato, cada um à parte. */
  escopos?: readonly LinhaDoEscopoNaSaude[];
  /** Publicações por conta no trecho e a soma das contas. */
  publicacoes?: PublicacoesNaSaude;
  /**
   * completo: o painel de antes, com "Ver detalhes". faixa: só a linha compacta com "Ver análise".
   * analise: tudo aberto, numa coluna, para o painel lateral ou a sobreposição.
   */
  modo?: 'completo' | 'faixa' | 'analise';
  onVerAnalise?: () => void;
  onFechar?: () => void;
  /** Avisos do trecho, cada um no seu bloco (Continuidade, Concentração ou Produção). */
  avisos?: readonly AvisoOrientacao[];
  onLocalizarAviso?: (aviso: AvisoOrientacao) => void;
  /** "Instagram · Reels" quando o calendário está filtrado. */
  filtroRotulo?: string | null;
  onAddReserva: () => void;
  onOpenGravacao: () => void;
  className?: string;
}

function AvisoDetalhado({ aviso, onLocalizar }: { aviso: AvisoOrientacao; onLocalizar?: (aviso: AvisoOrientacao) => void }) {
  const detalhe = detalheDoAviso(aviso);
  return (
    <li className="stack-xs rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-2">
      <Text variant="body" as="p" className="text-[var(--text-primary)]">{aviso.texto}</Text>
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {detalhe.intervalo ? `Intervalo: ${detalhe.intervalo} · ` : ''}Regra: {detalhe.regra}
      </Text>
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">O que fazer: {detalhe.acao}</Text>
      {onLocalizar ? (
        <button type="button" onClick={() => onLocalizar(aviso)} className="w-fit hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]">
          <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">Localizar no calendário</Text>
        </button>
      ) : null}
    </li>
  );
}

export function SaudeEditorialPanel({
  rotuloPeriodo,
  avisoPeriodo,
  counts,
  series = [],
  pilares,
  objetivos,
  continuidade,
  escopos = [],
  publicacoes,
  modo = 'completo',
  onVerAnalise,
  onFechar,
  avisos = [],
  onLocalizarAviso,
  filtroRotulo,
  onAddReserva,
  onOpenGravacao,
  className,
}: SaudeEditorialPanelProps) {
  const navigate = useNavigate();
  const [lista, setLista] = useState<ListaDaSaude | null>(null);
  const [expanded, setExpandedRaw] = useState(() => readStoredJson(STORAGE_EXPANDED_KEY, false));

  const toggleExpanded = () => {
    setExpandedRaw(prev => {
      const next = !prev;
      writeStoredJson(STORAGE_EXPANDED_KEY, next);
      return next;
    });
  };


  const preenchidos = counts.previsto ?? counts.somaPlanejado ?? 0;
  // Com filtro, a contagem é só da seleção e a meta de conteúdos (de todas as redes) não se compara a ela:
  // a meta da rede fica em Publicações por conta.
  const comFiltro = Boolean(filtroRotulo);
  // Sem ritmo nem meta absoluta não há meta: nada de número inventado.
  const metaTotal = comFiltro ? null : counts.limite ?? null;
  const percentualGeral = metaTotal != null && metaTotal > 0 ? Math.min(100, Math.round((preenchidos / metaTotal) * 100)) : 0;
  const meta = counts.meta;

  const preparo = counts.preparo;
  const gravacao = preparo?.gravacao ?? 0;
  const escrita = preparo?.escrita ?? 0;
  const edicao = preparo?.edicao ?? 0;
  const prontosOuPublicados = preparo ? preparo.prontas + preparo.publicadas : 0;
  // Reserva é o post-it que ainda não virou conteúdo.
  const reservasEmPostIt = counts.porEtapa?.planejamento ?? 0;

  // Pilar inativo com item no período continua na conta, identificado; não vira "sem pilar".
  const previstosPorPilar = new Map(counts.pilares.map(linha => [linha.id, linha.planejado]));
  const pilaresNaConta = pilares.filter(p => p.ativo !== false || (previstosPorPilar.get(p.id) ?? 0) > 0);
  const itensSemPilar = counts.itens.filter(item => !item.pilarId);
  const faltamParaMeta = metaTotal == null ? 0 : Math.max(0, metaTotal - preenchidos);
  // Atual: fatia entre os itens do período que têm pilar (soma 100%); sem pilar fica à parte.
  const distribuicao = distribuicaoPorPilar(pilaresNaConta.map(p => p.id), counts.pilares, preenchidos);
  const emAnalise = modo === 'analise';
  const aberto = emAnalise || (modo === 'completo' && expanded);
  const avisosDe = (bloco: ReturnType<typeof blocoDoAviso>) => avisos.filter(aviso => blocoDoAviso(aviso) === bloco);
  const revisar = pontosParaRevisar(avisos);

  return (
    <Surface
      variant="outlined"
      padding="none"
      className={cn('w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border-[var(--border-subtle)] shadow-[var(--shadow-soft)] p-4 sm:p-6', className)}
    >
      {/* Top Header */}
      {avisoPeriodo ? (
        <Text variant="meta" as="p" className="mb-2 text-[var(--text-tertiary)]">{avisoPeriodo}</Text>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] shrink-0" aria-hidden />
          <Text variant="sectionTitle" as="h2" className="text-[var(--text-primary)]">
            Saúde Editorial — {rotuloPeriodo}
          </Text>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            <Text variant="meta" as="span">
              {comFiltro
                ? `${preenchidos} ${preenchidos === 1 ? 'conteúdo' : 'conteúdos'} na seleção`
                : metaTotal == null ? `${preenchidos} previstos · meta não definida` : `${preenchidos}/${metaTotal} espaços`}
            </Text>
          </span>
          {publicacoes && publicacoes.contas.length > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <Text variant="meta" as="span">
                {publicacoes.metaForaDoFiltro
                  ? `${publicacoes.total} publicações na seleção`
                  : publicacoes.meta == null ? `${publicacoes.total} publicações` : `${publicacoes.total}/${publicacoes.meta} publicações${publicacoes.incompleta ? ' (incompleta)' : ''}`}
              </Text>
            </span>
          ) : null}
          {revisar > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <Text variant="meta" as="span">{revisar === 1 ? '1 aviso para revisar' : `${revisar} avisos para revisar`}</Text>
            </span>
          ) : null}
          {filtroRotulo ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <Text variant="meta" as="span">Filtro: {filtroRotulo}</Text>
            </span>
          ) : null}
        </div>

        {modo === 'faixa' ? (
          <AppButton variant="secondary" size="sm" onClick={onVerAnalise} className="shrink-0">Ver análise</AppButton>
        ) : emAnalise ? (
          onFechar ? <AppButton variant="ghost" size="sm" onClick={onFechar} className="shrink-0">Fechar</AppButton> : null
        ) : (
        <button
          type="button"
          onClick={toggleExpanded}
          className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)] px-2 py-1"
        >
          <Text variant="meta" as="span">{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</Text>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        )}
      </div>

      {aberto && (
        <div className="stack-md mt-4 pt-1 border-t border-[var(--border-subtle)]">
          {/* 3 Metric Cards */}
          <div className={emAnalise ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
            {/* Card 1: Volume Editorial */}
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <Text variant="label" as="span" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                    1. Volume Editorial
                  </Text>
                  {metaTotal != null ? (
                    <Text variant="bodyStrong" as="span" className="text-[var(--text-secondary)]">
                      {percentualGeral}%
                    </Text>
                  ) : null}
                </div>
                <div className="mt-1.5">
                  <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)]">
                    {comFiltro
                      ? `${preenchidos} na seleção`
                      : metaTotal == null ? `${preenchidos} previstos` : `${preenchidos} de ${metaTotal} espaços`}
                  </Text>
                </div>
                <div className="mt-0.5 stack-xs">
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    {prontosOuPublicados} prontos ou publicados · {reservasEmPostIt} {reservasEmPostIt === 1 ? 'reserva' : 'reservas'} em post-it
                  </Text>
                  {comFiltro ? (
                    <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                      Com filtro, o volume não é comparado à meta de conteúdos, que vale para todas as redes e formatos.
                    </Text>
                  ) : metaTotal == null ? (
                    <button type="button" onClick={() => navigate('/editorial?aba=ajustes')} className="w-fit text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]">
                      <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Meta não definida: defina o ritmo no Editorial</Text>
                    </button>
                  ) : meta?.origem === 'absoluta' ? (
                    <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Meta ajustada para este período</Text>
                  ) : meta && meta.diasDePausa > 0 ? (
                    <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                      Pelo ritmo, sem {meta.diasDePausa} {meta.diasDePausa === 1 ? 'dia' : 'dias'} de pausa
                    </Text>
                  ) : null}
                  {meta?.pendenciaDePausa ? (
                    <Text variant="meta" as="p" className="text-[#92400e] dark:text-[#fde68a]">{meta.pendenciaDePausa}</Text>
                  ) : null}
                </div>
              </div>
              {metaTotal != null ? (
                <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] mt-3 overflow-hidden">
                  <div
                    className="h-full bg-[var(--text-primary)] rounded-[var(--radius-pill)] transition-all duration-300"
                    style={{ width: `${percentualGeral}%` }}
                  />
                </div>
              ) : null}
            </div>

            {/* Card 2: Preparo das Peças */}
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
              <div>
                <Text variant="label" as="div" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                  2. Preparo das Peças
                </Text>
                <div className="mt-1.5">
                  <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)]">
                    {gravacao} roteiro(s) para gravar
                  </Text>
                </div>
                <div className="mt-0.5">
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    {escrita} ideia(s) em escrita · {edicao} em edição
                  </Text>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenGravacao}
                className="mt-3 flex items-center gap-1.5 text-[#be185d] hover:text-[#9d174d] hover:underline transition-colors w-fit focus-visible:outline-none"
              >
                <Pin className="h-3.5 w-3.5 rotate-45" />
                <Text variant="meta" as="span" className="text-[#be185d]">
                  Preparar sessão de gravação
                </Text>
              </button>
            </div>

          </div>

          {/* Três indicadores separados, sem nota geral */}
          <div className={emAnalise ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 lg:grid-cols-3 gap-3'}>
            {/* Objetivos */}
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm" aria-label="Objetivos">
              <Text variant="label" as="h3" className="tracking-wider text-[var(--text-tertiary)] uppercase">Objetivos</Text>
              {!objetivos || objetivos.total === 0 ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">Nenhum conteúdo previsto no período.</Text>
              ) : (
                <>
                  {objetivos.incompleta ? (
                    <button
                      type="button"
                      onClick={() => setLista({ titulo: 'Sem objetivo', subtitulo: textoSemObjetivo(objetivos) ?? undefined, itens: objetivos.semObjetivo })}
                      className="flex w-full items-start gap-2 rounded-[var(--radius-input)] border border-[#fde68a] bg-[#fffbeb] dark:bg-[#78350f]/15 dark:border-[#b45309]/30 p-2 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#d97706]" />
                      <span>
                        <Text variant="bodyStrong" as="span" className="block text-[#92400e] dark:text-[#fde68a]">Distribuição incompleta</Text>
                        <Text variant="meta" as="span" className="block text-[#92400e] dark:text-[#fde68a]">{textoSemObjetivo(objetivos)}</Text>
                      </span>
                    </button>
                  ) : null}
                  <ul className="stack-xs">
                    {objetivos.linhas.map(linha => (
                      <li key={linha.funcao}>
                        <button
                          type="button"
                          onClick={() => setLista({ titulo: linha.rotulo, itens: linha.itens })}
                          className="flex w-full items-baseline justify-between gap-2 rounded-[var(--radius-sm)] text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          <Text variant="body" as="span" className="text-[var(--text-primary)] truncate">{linha.rotulo}</Text>
                          <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                            {linha.metaQuantidade != null
                              ? `${linha.quantidade} de ${linha.metaQuantidade}${linha.metaAjustada ? ' (ajustada)' : ''} · ${linha.previstoPct}%`
                              : `${linha.previstoPct}% previstos`}
                            {linha.desejadoPct != null ? ` · meta ${linha.desejadoPct}%` : ''}
                          </Text>
                        </button>
                      </li>
                    ))}
                    {objetivos.semObjetivo.length > 0 ? (
                      <li>
                        <button
                          type="button"
                          onClick={() => setLista({ titulo: 'Sem objetivo', itens: objetivos.semObjetivo })}
                          className="flex w-full items-baseline justify-between gap-2 rounded-[var(--radius-sm)] text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          <Text variant="body" as="span" className="text-[var(--text-secondary)]">Sem objetivo</Text>
                          <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">{objetivos.semObjetivoPct}%</Text>
                        </button>
                      </li>
                    ) : null}
                  </ul>
                  <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                    Sobre {objetivos.total} {objetivos.total === 1 ? 'conteúdo' : 'conteúdos'} do período, sem objetivo incluído.
                  </Text>
                </>
              )}
              {!objetivos?.temProporcao ? (
                <button type="button" onClick={() => navigate('/editorial?aba=ajustes')} className="w-fit hover:underline focus-visible:outline-none">
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Definir a proporção desejada no Editorial</Text>
                </button>
              ) : null}
            </section>

            {/* Publicações por conta: uma por conta, separadas da meta de conteúdos únicos */}
            {publicacoes && publicacoes.contas.length > 0 ? (
              <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm" aria-label="Publicações por conta">
                <Text variant="label" as="h3" className="tracking-wider text-[var(--text-tertiary)] uppercase">Publicações por conta</Text>
                <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] tabular-nums">
                  {publicacoes.metaForaDoFiltro
                    ? `${publicacoes.total} publicações na seleção`
                    : publicacoes.meta == null
                    ? `${publicacoes.total} publicações no trecho · nenhuma conta com meta`
                    : `${publicacoes.total} de ${publicacoes.meta} publicações${publicacoes.incompleta ? ' · soma incompleta (conta sem meta)' : ''}`}
                </Text>
                <ul className="stack-xs">
                  {publicacoes.contas.map(conta => (
                    <li key={conta.id}>
                      <Text variant="body" as="span" className="block text-[var(--text-primary)]">
                        {conta.nome} · {publicacoes.metaForaDoFiltro ? conta.total : conta.meta == null ? `${conta.total} · sem meta` : `${conta.total} de ${conta.meta}`}
                        {conta.realizadas > 0 ? ` · ${conta.realizadas} publicadas` : ''}
                        {conta.programadas > 0 ? ` · ${conta.programadas} programadas` : ''}
                      </Text>
                      {conta.formatos.length > 0 ? (
                        <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                          {conta.formatos.map(item => `${item.rotulo} ${item.total}`).join(' · ')}
                        </Text>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Continuidade */}
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm" aria-label="Continuidade">
              <Text variant="label" as="h3" className="tracking-wider text-[var(--text-tertiary)] uppercase">Continuidade</Text>
              <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)]">{continuidade?.resumo ?? 'Sem séries para conferir'}</Text>
              {comFiltro ? (
                <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                  Os acompanhamentos contam todas as publicações: o geral, de todas as contas; por conta ou formato, aparecem só os das redes marcadas.
                </Text>
              ) : null}
              {!continuidade || continuidade.nenhumaAcompanhada ? (
                <button type="button" onClick={() => navigate('/editorial?aba=ajustes')} className="w-fit text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]">
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Escolha no Editorial quais séries acompanhar</Text>
                </button>
              ) : null}
              {continuidade ? (
                <ul className="stack-xs">
                  {continuidade.linhas.filter(linha => linha.precisaAtencao).map(linha => {
                    const datas = linha.abaixo.slice(0, 3).map(rotuloIntervalo).join(', ');
                    const mais = linha.abaixo.length > 3 ? ` +${linha.abaixo.length - 3}` : '';
                    const notas = linha.intervalos.map(intervalo => intervalo.nota).filter((nota): nota is string => Boolean(nota));
                    if (linha.semEpisodios) {
                      return (
                        <li key={linha.serieId}>
                          <Text variant="body" as="span" className="block text-[var(--text-primary)]">
                            {linha.nome}{linha.tipo === 'quadro' ? ` (quadro${linha.paiNome ? ` de ${linha.paiNome}` : ''})` : ''} · {linha.frequencia}
                          </Text>
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Sem episódios no período</Text>
                            <button type="button" onClick={() => navigate(`/series/${linha.serieId}`)} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]">
                              <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">Planejar episódios</Text>
                            </button>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={linha.serieId}>
                        <button
                          type="button"
                          onClick={() => setLista({
                            titulo: linha.tipo === 'quadro' ? `Quadro ${linha.nome}` : linha.nome,
                            subtitulo: `${linha.frequencia} · ${linha.abaixo.length} de ${linha.intervalos.length} intervalos abaixo`,
                            itens: linha.itens,
                            acao: { rotulo: 'Abrir a série', rota: `/series/${linha.serieId}` },
                          })}
                          className="w-full text-left rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          <Text variant="body" as="span" className="block text-[var(--text-primary)]">
                            {linha.nome}{linha.tipo === 'quadro' ? ` (quadro${linha.paiNome ? ` de ${linha.paiNome}` : ''})` : ''} · {linha.frequencia}
                          </Text>
                          {linha.abaixo.length > 0 ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                              {linha.abaixo.length} de {linha.intervalos.length} abaixo: {datas}{mais}
                            </Text>
                          ) : null}
                          {linha.pausadas && linha.pausadas.length > 0 ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                              {linha.pausadas.length === 1 ? '1 intervalo em pausa' : `${linha.pausadas.length} intervalos em pausa`}: {linha.pausadas.map(rotuloIntervalo).join(', ')} (não conta como falta)
                            </Text>
                          ) : null}
                          {linha.parciais && linha.parciais.length > 0 ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                              {linha.parciais.length === 1 ? '1 intervalo parcial' : `${linha.parciais.length} intervalos parciais`} (pausa em parte dos dias, ou início ou fim do acompanhamento): não contam como falta
                            </Text>
                          ) : null}
                          {linha.distancias?.map(distancia => (
                            <Text key={distancia.inicio} variant="meta" as="span" className="block text-[var(--text-secondary)]">
                              {distancia.dias} dias sem episódio ({rotuloIntervalo(distancia)}){distancia.futuro ? ', falta prever' : ''}
                            </Text>
                          ))}
                          {linha.diasSeguidos && linha.diasSeguidos.length > 0 ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                              Episódios em dias seguidos: {linha.diasSeguidos.slice(0, 3).map(item => rotuloIntervalo({ inicio: item.dia, fim: item.seguinte })).join(', ')}
                            </Text>
                          ) : null}
                          {linha.reservadas.length > 0 ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                              {linha.reservadas.length === 1 ? '1 intervalo reservado' : `${linha.reservadas.length} intervalos reservados`} só com post-it, conteúdo a desenvolver
                            </Text>
                          ) : null}
                          {linha.concentrada ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">Episódios concentrados: um intervalo passa da meta enquanto outro fica vazio</Text>
                          ) : null}
                        </button>
                        <details className="mt-0.5">
                          <summary className="cursor-pointer"><Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Intervalos avaliados</Text></summary>
                          <ul className="mt-1 stack-xs">
                            {linha.intervalos.map(intervalo => (
                              <li key={intervalo.inicio}>
                                <Text variant="meta" as="span" className={cn('tabular-nums', intervalo.abaixo ? 'text-[#b45309]' : 'text-[var(--text-secondary)]')}>
                                  {intervalo.pausada
                                    ? `${rotuloIntervalo(intervalo)}: em pausa`
                                    : intervalo.parcial ? `${textoDaJanela(intervalo)} · parcial, não conta como falta` : textoDaJanela(intervalo)}
                                </Text>
                              </li>
                            ))}
                          </ul>
                          {notas.length > 0 ? (
                            <Text variant="meta" as="p" className="mt-1 text-[var(--text-tertiary)]">{notas.join('; ')}.</Text>
                          ) : null}
                          {linha.foraDoPeriodo > 0 ? (
                            <Text variant="meta" as="p" className="mt-1 text-[var(--text-tertiary)]">
                              {linha.foraDoPeriodo === 1 ? '1 item fora do período ajudou' : `${linha.foraDoPeriodo} itens fora do período ajudaram`} a conferir os intervalos das pontas; não entram nos totais do período.
                            </Text>
                          ) : null}
                        </details>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {continuidade && continuidade.pendencias.length > 0 ? (
                <div className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                  <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">{continuidade.resumoPendencias}</Text>
                  <ul className="stack-xs">
                    {continuidade.pendencias.map(pendencia => (
                      <li key={pendencia.serieId}>
                        <button
                          type="button"
                          onClick={() => navigate(`/series/${pendencia.serieId}/editar`)}
                          className="w-full text-left rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                            {pendencia.nome}{pendencia.tipo === 'quadro' ? ' (quadro)' : ''}: {pendencia.texto}
                          </Text>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {escopos.length === 0 && continuidade && !continuidade.nenhumaAcompanhada ? (
                <button type="button" onClick={() => navigate('/editorial?aba=ajustes')} className="w-fit text-left border-t border-[var(--border-subtle)] pt-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]">
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Por conta ou formato: nenhum acompanhamento. Configurar em Editorial › Ritmo &amp; Regras › Continuidade na Saúde</Text>
                </button>
              ) : null}
              {escopos.length > 0 ? (
                <div className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                  <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Por conta ou formato</Text>
                  <ul className="stack-xs">
                    {escopos.map(linha => (
                      <li key={linha.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/series/${linha.serieId}`)}
                          className="w-full text-left rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          <Text variant="body" as="span" className="block text-[var(--text-primary)]">{linha.titulo}</Text>
                          <Text variant="meta" as="span" className={cn('block', linha.atencao ? 'text-[#b45309]' : 'text-[var(--text-secondary)]')}>{linha.texto}</Text>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {avisosDe('continuidade').length > 0 ? (
                <ul className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                  {avisosDe('continuidade').map(aviso => <AvisoDetalhado key={aviso.id} aviso={aviso} onLocalizar={onLocalizarAviso} />)}
                </ul>
              ) : null}
              {continuidade && continuidade.naoAvaliadas.length > 0 ? (
                <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                  Não avaliadas: {continuidade.naoAvaliadas.map(item => `${item.nome} (${item.motivo === 'sob-demanda' ? 'sob demanda' : item.texto.split(':')[0].toLowerCase()})`).join(', ')}.
                </Text>
              ) : null}
            </section>

            {/* Pilares: só a distribuição, sem meta enquanto não houver uma desejada */}
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm" aria-label="Pilares">
              <Text variant="label" as="h3" className="tracking-wider text-[var(--text-tertiary)] uppercase">Pilares</Text>
              <div className="stack-sm">
                {pilaresNaConta.map((pilar, index) => {
                  const pautas = distribuicao.linhas[index]?.pautas ?? 0;
                  const atualPct = distribuicao.linhas[index]?.atualPct ?? 0;
                  const barColor = pilar.cor || (index === 0 ? '#84cc16' : index === 1 ? '#ec4899' : '#374151');
                  return (
                    <div key={pilar.id} className="stack-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} aria-hidden />
                          <Text variant="body" as="span" className="text-[var(--text-primary)] truncate">
                            {pilar.nome}{pilar.ativo === false ? ' (inativo)' : ''}
                          </Text>
                        </div>
                        <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                          {pautas} · {atualPct}%
                        </Text>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] overflow-hidden">
                        <div
                          className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(atualPct, pautas > 0 ? 5 : 0))}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {itensSemPilar.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setLista({ titulo: 'Sem pilar', itens: itensSemPilar })}
                  className="w-fit text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]"
                >
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                    Sem pilar: {itensSemPilar.length} {itensSemPilar.length === 1 ? 'item' : 'itens'} (fora do percentual)
                  </Text>
                </button>
              ) : null}
              <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Percentual entre os itens com pilar. Sem distribuição desejada, não há julgamento de equilíbrio.</Text>
            </section>

            {/* Concentração: obra e assunto, pelos limites de Variedade e concentração */}
            {emAnalise ? (
              <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm" aria-label="Concentração">
                <Text variant="label" as="h3" className="tracking-wider text-[var(--text-tertiary)] uppercase">Concentração</Text>
                {avisosDe('concentracao').length === 0 ? (
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">Nenhuma obra ou assunto acima dos limites no trecho.</Text>
                ) : (
                  <ul className="stack-xs">
                    {avisosDe('concentracao').map(aviso => <AvisoDetalhado key={aviso.id} aviso={aviso} onLocalizar={onLocalizarAviso} />)}
                  </ul>
                )}
              </section>
            ) : null}
          </div>

          {emAnalise && avisosDe('producao').length > 0 ? (
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm" aria-label="Produção e gravação">
              <Text variant="label" as="h3" className="tracking-wider text-[var(--text-tertiary)] uppercase">Produção e gravação</Text>
              <ul className="stack-xs">
                {avisosDe('producao').map(aviso => <AvisoDetalhado key={aviso.id} aviso={aviso} onLocalizar={onLocalizarAviso} />)}
              </ul>
            </section>
          ) : null}

          {/* Action Banners */}
          <div className="stack-sm">
            {/* Banner 1: Espaços e Reserva */}
            {faltamParaMeta > 0 && (
              <div className="rounded-[var(--radius-card)] border border-[#fde68a] bg-[#fffbeb] dark:bg-[#78350f]/15 dark:border-[#b45309]/30 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#92400e] dark:text-[#fde68a]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#d97706]" />
                  <Text variant="body" as="span" className="text-[#92400e] dark:text-[#fde68a]">
                    {preenchidos} de {metaTotal} espaços preenchidos: {faltamParaMeta === 1 ? 'falta 1 publicação a planejar' : `faltam ${faltamParaMeta} publicações a planejar`} para a meta do período.
                  </Text>
                </div>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={onAddReserva}
                  className="border-[#d97706] text-[#92400e] hover:bg-[#fef3c7] dark:border-[#b45309] dark:text-[#fde68a] shrink-0"
                >
                  Adicionar reserva
                </AppButton>
              </div>
            )}

            {/* Banner 2: Gravações Pendentes */}
            {gravacao > 0 && (
              <div className="rounded-[var(--radius-card)] border border-[#fbcfe8] bg-[#fdf2f8] dark:bg-[#831843]/15 dark:border-[#db2777]/30 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#9d174d] dark:text-[#fbcfe8]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#db2777]" />
                  <Text variant="body" as="span" className="text-[#9d174d] dark:text-[#fbcfe8]">
                    {gravacao === 1 ? '1 roteiro com data neste período aguarda' : `${gravacao} roteiros com data neste período aguardam`} sessão de gravação.
                  </Text>
                </div>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={onOpenGravacao}
                  className="border-[#db2777] text-[#9d174d] hover:bg-[#fce7f3] dark:border-[#be185d] dark:text-[#fbcfe8] shrink-0"
                >
                  Abrir gravação
                </AppButton>
              </div>
            )}
          </div>
        </div>
      )}
      <ItensDaSaudeDialog lista={lista} onClose={() => setLista(null)} />
    </Surface>
  );
}
