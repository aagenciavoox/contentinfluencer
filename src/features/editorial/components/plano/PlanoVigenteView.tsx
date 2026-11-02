import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMonths, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { CONTENT_STATUS, normalizeContentStatus } from '../../../contents/lib/contentPipeline';
import type { Pilar, Platform, Serie } from '../../../../lib/database';
import type { DecisaoPeriodo } from '../../lib/editorialSettings';
import { lerFrequencia } from '../../lib/frequenciaSerie';
import { AjustarMetasDialog } from './AjustarMetasDialog';

export interface PlanoVigenteViewProps {
  periodo: { inicio: string; fim: string };
  decisao: DecisaoPeriodo | null;
  platforms: readonly Platform[];
  series: readonly Serie[];
  pilares?: readonly Pilar[];
  limiteSemanal: number | null;
  totalPrevistos: number;
  onSalvarDecisao: (patch: Partial<Omit<DecisaoPeriodo, 'inicio' | 'fim'>>) => void;
  onPeriodoChange?: (novoPeriodo: { inicio: string; fim: string }) => void;
}

interface ContaMetaExibicao {
  id: string;
  nome: string;
  handle: string;
  cor: string;
  producao: number;
  publicacao: number;
  ritmoSemanal: string;
  realizados: number;
  emProducao: number;
}

interface SerieFreqExibicao {
  id: string;
  nome: string;
  cor: string;
  frequencia: string;
  pilarNome?: string;
  metaEsperada: number;
  produzidos: number;
}

function formatarHandle(platform: Platform): string {
  if (platform.handle) {
    if (platform.handle.startsWith('@') || platform.handle.includes('/') || platform.handle.includes('.')) {
      return platform.handle;
    }
    return `@${platform.handle}`;
  }
  const nomeLower = platform.nome.toLowerCase();
  if (nomeLower.includes('youtube') || nomeLower.includes('longo')) return 'youtube.com/@criaki';
  if (nomeLower.includes('tiktok')) return '@anne_resenhas';
  return '@annestudio';
}

function navegarMes(inicio: string, delta: number): { inicio: string; fim: string } {
  try {
    const data = parseISO(inicio);
    const novoMes = addMonths(data, delta);
    return {
      inicio: format(startOfMonth(novoMes), 'yyyy-MM-dd'),
      fim: format(endOfMonth(novoMes), 'yyyy-MM-dd'),
    };
  } catch {
    return { inicio, fim: inicio };
  }
}

function extrairDiasDePausa(texto: string): number {
  if (!texto) return 0;
  const matchRange = texto.match(/(\d{1,2})\s*a\s*(\d{1,2})/);
  if (matchRange) {
    const d1 = parseInt(matchRange[1], 10);
    const d2 = parseInt(matchRange[2], 10);
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      return d2 - d1 + 1;
    }
  }
  const matchDias = texto.match(/(\d+)\s*dias?/);
  if (matchDias) {
    return parseInt(matchDias[1], 10);
  }
  return 0;
}

function defaultRitmoPorRede(nome: string): number {
  const chave = nome.toLowerCase();
  if (chave.includes('tiktok')) return 4;
  if (chave.includes('youtube') || chave.includes('longo')) return 1;
  return 3;
}

export function PlanoVigenteView({
  periodo,
  decisao,
  platforms,
  series,
  pilares = [],
  limiteSemanal,
  totalPrevistos,
  onSalvarDecisao,
  onPeriodoChange,
}: PlanoVigenteViewProps) {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [ajustarModalAberto, setAjustarModalAberto] = useState(false);
  const [expanded, setExpanded] = useState(false);

  let mesAno = 'Novembro de 2026';
  try {
    const dataRef = parseISO(periodo.inicio);
    const bruto = format(dataRef, "MMMM 'de' yyyy", { locale: ptBR });
    mesAno = bruto.charAt(0).toUpperCase() + bruto.slice(1);
  } catch {
    // fallback
  }

  const prioridadeTexto = decisao?.prioridade?.trim() || 'Foco em Cosmere & Ritmo de Final de Ano';
  const pausaTexto = decisao?.pausaEditorial?.trim() || 'Pausa editorial no feriado de 15 a 17 de novembro.';

  // 1. Cálculo proporcional exato dos dias e semanas ativas
  const totalDias = Math.max(1, differenceInCalendarDays(parseISO(periodo.fim), parseISO(periodo.inicio)) + 1);
  const diasPausa = extrairDiasDePausa(pausaTexto);
  const diasAtivos = Math.max(1, totalDias - diasPausa);
  const semanasAtivas = diasAtivos / 7;

  // Conteúdos da base dentro do período
  const conteudosDoPeriodo = state.contents.filter(c => {
    const data = c.publishDate || c.recordingDate;
    return Boolean(data && data >= periodo.inicio && data <= periodo.fim && !c.deletedAt);
  });

  // 2. Mapeamento das contas e cálculo proporcional
  const activePlatforms = platforms.filter(p => p.ativo);
  const plataformasBase: Platform[] = activePlatforms.length > 0 ? [...activePlatforms] : [
    { id: 'instagram-mock', nome: 'Instagram', handle: 'annestudio', ativo: true } as Platform,
    { id: 'tiktok-mock', nome: 'TikTok', handle: 'anne_resenhas', ativo: true } as Platform,
    { id: 'youtube-mock', nome: 'YouTube', handle: 'youtube.com/@criaki', ativo: true } as Platform,
  ];

  const coresPlataforma: Record<string, string> = {
    instagram: '#E1306C',
    tiktok: 'var(--text-primary)',
    youtube: '#EF4444',
  };

  const contas: ContaMetaExibicao[] = plataformasBase.map(p => {
    const metaSalva = decisao?.metasPorConta?.[p.id];
    const slotsSemanais = state.postingTimeEntries.filter(e => e.platformId === p.id);

    const ritmoNum = metaSalva?.ritmoSemanal
      ? (parseInt(metaSalva.ritmoSemanal.replace(/\D/g, ''), 10) || defaultRitmoPorRede(p.nome))
      : (slotsSemanais.length > 0 ? slotsSemanais.length : defaultRitmoPorRede(p.nome));

    const publicacaoCalculada = metaSalva?.publicacao ?? Math.round(ritmoNum * semanasAtivas);
    const producaoCalculada = metaSalva?.producao ?? publicacaoCalculada;

    const conteudosDaConta = conteudosDoPeriodo.filter(c => {
      const temNaPlataforma = c.plataformas?.some(dest => dest.platformId === p.id);
      return temNaPlataforma || (!c.plataformas?.length && p.id === state.editorial.preferencias.redeReferenciaId);
    });

    const realizados = conteudosDaConta.filter(c => normalizeContentStatus(c.status) === CONTENT_STATUS.POSTADO).length;
    const emProducao = conteudosDaConta.filter(c => normalizeContentStatus(c.status) !== CONTENT_STATUS.POSTADO).length;

    const pNomeLower = p.nome.toLowerCase();
    const cor = pNomeLower.includes('instagram')
      ? coresPlataforma.instagram
      : pNomeLower.includes('tiktok')
        ? coresPlataforma.tiktok
        : coresPlataforma.youtube;

    return {
      id: p.id,
      nome: p.nome,
      handle: formatarHandle(p),
      cor,
      producao: producaoCalculada,
      publicacao: publicacaoCalculada,
      ritmoSemanal: metaSalva?.ritmoSemanal ?? `~${ritmoNum} posts/sem`,
      realizados,
      emProducao,
    };
  });

  // 3. Totais consolidados
  const somaProducaoContas = contas.reduce((soma, c) => soma + c.producao, 0);
  const somaPublicacaoContas = contas.reduce((soma, c) => soma + c.publicacao, 0);

  const totalProducao = decisao?.metasProducao ?? (totalPrevistos > 0 ? totalPrevistos : somaProducaoContas);
  const totalPublicacao = decisao?.metasPublicacao ?? (limiteSemanal ? Math.round(limiteSemanal * semanasAtivas) : somaPublicacaoContas);

  const realizadosProducao = conteudosDoPeriodo.length;
  const realizadosPublicacao = conteudosDoPeriodo.filter(c => normalizeContentStatus(c.status) === CONTENT_STATUS.POSTADO).length;
  const pctProducao = totalProducao > 0 ? Math.min(100, Math.round((realizadosProducao / totalProducao) * 100)) : 0;
  const pctPublicacao = totalPublicacao > 0 ? Math.min(100, Math.round((realizadosPublicacao / totalPublicacao) * 100)) : 0;

  // 4. Séries
  const pilaresMap = new Map(pilares.map(p => [p.id, p.nome]));

  const seriesBase: Serie[] = series.filter(s => s.ativa).length > 0 ? series.filter(s => s.ativa) : [
    {
      id: 'serie-cosmere',
      name: 'Descomplicando Brandon Sanderson',
      frequenciaRecomendada: 'Semanal',
      cor: '#E1306C',
      ativa: true,
    } as Serie,
    {
      id: 'serie-escrita',
      name: 'Mesa de Escrita',
      frequenciaRecomendada: 'Quinzenal',
      cor: '#10B981',
      ativa: true,
    } as Serie,
  ];

  const seriesExibidas: SerieFreqExibicao[] = seriesBase.map(s => {
    const pilarId = s.pilarPrincipalId || (s.pilarIds && s.pilarIds[0]);
    const freq = lerFrequencia(s);

    let metaEsperada = 4;
    if (freq.unidade === 'quinzena') {
      metaEsperada = Math.max(1, Math.round(diasAtivos / 14));
    } else if (freq.unidade === 'mes') {
      metaEsperada = 1;
    } else if (freq.unidade === 'semana') {
      metaEsperada = Math.max(1, Math.round((freq.vezes ?? 1) * semanasAtivas));
    }

    const conteudosDaSerie = conteudosDoPeriodo.filter(c => c.seriesId === s.id);

    return {
      id: s.id,
      nome: s.name,
      cor: s.cor || '#E1306C',
      pilarNome: pilarId ? pilaresMap.get(pilarId) : undefined,
      frequencia:
        s.frequenciaRecomendada?.trim() ||
        (s.frequenciaVezes ? `${s.frequenciaVezes}x por ${s.frequenciaUnidade ?? 'semana'}` : '1x por semana'),
      metaEsperada,
      produzidos: conteudosDaSerie.length,
    };
  });

  const handleAnterior = () => {
    if (onPeriodoChange) {
      onPeriodoChange(navegarMes(periodo.inicio, -1));
    }
  };

  const handleProximo = () => {
    if (onPeriodoChange) {
      onPeriodoChange(navegarMes(periodo.inicio, 1));
    }
  };

  return (
    <Surface
      variant="outlined"
      padding="none"
      className="w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border-[var(--border-subtle)] p-4 sm:p-6 stack-md"
    >
      {/* 1. Header Minimalista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-[var(--radius-pill)] bg-[#10b981] shrink-0" aria-hidden />
          <Text variant="sectionTitle" as="h2" className="text-[var(--text-primary)]">
            Plano Vigente — {mesAno}
          </Text>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <Text variant="meta" as="span">
              {totalProducao} roteiros · {totalPublicacao} posts
            </Text>
          </span>
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)] hidden sm:inline">
            — {prioridadeTexto}
          </Text>
        </div>

        <div className="flex items-center gap-2">
          {onPeriodoChange ? (
            <div className="flex items-center gap-1">
              <AppButton
                variant="secondary"
                size="sm"
                iconOnly
                aria-label="Mês anterior"
                onClick={handleAnterior}
              >
                <ChevronLeft className="h-4 w-4" />
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                iconOnly
                aria-label="Próximo mês"
                onClick={handleProximo}
              >
                <ChevronRight className="h-4 w-4" />
              </AppButton>
            </div>
          ) : null}

          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => setAjustarModalAberto(true)}
          >
            Ajustar metas
          </AppButton>

          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(prev => !prev)}
            rightIcon={expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          >
            {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          </AppButton>
        </div>
      </div>

      {expanded && (
        <div className="stack-md pt-2 border-t border-[var(--border-subtle)]">
          {/* 2. Três Cards Métricos Compactos (Estilo Saúde Editorial) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Volume de Produção */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <Text variant="eyebrow" as="span" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                1. Meta de Produção
              </Text>
              <Text variant="bodyStrong" as="span" className="text-[var(--text-secondary)] tabular-nums">
                {pctProducao}%
              </Text>
            </div>
            <div className="mt-1.5">
              <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)] tabular-nums">
                {totalProducao} roteiros
              </Text>
            </div>
            <div className="mt-0.5">
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                {realizadosProducao} de {totalProducao} prontos no período
              </Text>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] mt-3 overflow-hidden">
            <div
              className="h-full bg-[var(--accent-pink)] rounded-[var(--radius-pill)] transition-all duration-300"
              style={{ width: `${pctProducao}%` }}
            />
          </div>
        </div>

        {/* Card 2: Meta de Publicação */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <Text variant="eyebrow" as="span" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                2. Meta de Publicação
              </Text>
              <Text variant="bodyStrong" as="span" className="text-[var(--text-secondary)] tabular-nums">
                {pctPublicacao}%
              </Text>
            </div>
            <div className="mt-1.5">
              <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)] tabular-nums">
                {totalPublicacao} posts
              </Text>
            </div>
            <div className="mt-0.5">
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                {realizadosPublicacao} de {totalPublicacao} postados nas contas
              </Text>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] mt-3 overflow-hidden">
            <div
              className="h-full bg-[#10b981] rounded-[var(--radius-pill)] transition-all duration-300"
              style={{ width: `${pctPublicacao}%` }}
            />
          </div>
        </div>

        {/* Card 3: Ritmo & Governança */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
          <div>
            <Text variant="eyebrow" as="div" className="tracking-wider text-[var(--text-tertiary)] uppercase">
              3. Ritmo &amp; Séries
            </Text>
            <div className="mt-1.5">
              <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)] tabular-nums">
                {contas.length} canais · {seriesExibidas.length} séries
              </Text>
            </div>
            <div className="mt-0.5">
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                {semanasAtivas.toFixed(1)} semanas úteis ({diasAtivos} dias ativos)
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {contas.map(conta => (
              <span
                key={conta.id}
                className="h-2.5 w-2.5 rounded-[var(--radius-pill)] shrink-0"
                style={{ backgroundColor: conta.cor }}
                title={conta.nome}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. Distribuição de Metas por Canal (Estilo Lista Minimalista) */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm">
        <div className="flex items-center justify-between">
          <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
            Distribuição de Metas por Conta
          </Text>
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
            Comparativo entre ritmo semanal e metas planejadas
          </Text>
        </div>

        <div className="stack-xs">
          {contas.map(conta => {
            const pctConta = conta.publicacao > 0 ? Math.min(100, Math.round((conta.realizados / conta.publicacao) * 100)) : 0;
            return (
              <div
                key={conta.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/planejamento')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/planejamento');
                  }
                }}
                className="stack-xs p-2 -mx-2 rounded-[var(--radius-input)] hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                title={`Clique para ver o planejamento de ${conta.nome}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlatformIcon platform={conta.nome} colored className="h-4 w-4 shrink-0" />
                    <Text variant="body" as="span" className="text-[var(--text-primary)] truncate">
                      {conta.nome}
                    </Text>
                    <Text variant="meta" as="span" className="font-mono text-[var(--text-tertiary)] hidden sm:inline">
                      {conta.handle}
                    </Text>
                  </div>
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                    {conta.producao} roteiros · {conta.publicacao} posts (Ritmo: {conta.ritmoSemanal})
                  </Text>
                </div>
                <div className="h-2 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] overflow-hidden">
                  <div
                    className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                    style={{
                      width: `${Math.max(4, pctConta)}%`,
                      backgroundColor: conta.cor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Frequência Pretendida das Séries (Lista Minimalista) */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm">
        <div className="flex items-center justify-between">
          <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
            Frequência Pretendida das Séries
          </Text>
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
            Cadência semanal e quinzenal das séries ativas
          </Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {seriesExibidas.map(serie => (
            <div
              key={serie.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate('/series')}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/series');
                }
              }}
              className="flex items-center justify-between gap-3 p-2 rounded-[var(--radius-input)] hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              title={`Clique para abrir detalhes da série ${serie.nome}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 rounded-[var(--radius-pill)] shrink-0"
                  style={{ backgroundColor: serie.cor }}
                  aria-hidden
                />
                <Text variant="body" as="span" className="truncate text-[var(--text-primary)]">
                  {serie.nome}
                </Text>
                {serie.pilarNome ? (
                  <Text variant="meta" as="span" className="text-[var(--text-tertiary)] truncate hidden md:inline">
                    · {serie.pilarNome}
                  </Text>
                ) : null}
              </div>
              <Text variant="meta" as="span" className="text-[var(--text-secondary)] font-mono shrink-0">
                {serie.produzidos}/{serie.metaEsperada} eps · {serie.frequencia}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Avisos Contextuais Compactos */}
      <div className="stack-xs">
        {pausaTexto ? (
          <div className="rounded-[var(--radius-card)] border border-[#fde68a] bg-[#fffbeb] dark:bg-[#78350f]/15 dark:border-[#b45309]/30 p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#d97706]" />
              <Text variant="body" as="span" className="text-[#92400e] dark:text-[#fde68a]">
                <strong>Pausas &amp; Exceções:</strong> {pausaTexto}
              </Text>
            </div>
          </div>
        ) : null}

        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
              <strong>Regra de Proporcionalidade:</strong> Calculada em {semanasAtivas.toFixed(1)} semanas reais ({diasAtivos} dias úteis). Planos passados guardam a referência de sua época sem alterações retroativas.
            </Text>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          </div>
        </div>
      </div>
    </div>
  )}

      {/* Modal de Ajuste de Metas */}
      <AjustarMetasDialog
        open={ajustarModalAberto}
        onClose={() => setAjustarModalAberto(false)}
        periodo={periodo}
        decisao={decisao}
        platforms={activePlatforms}
        defaultProducao={totalProducao}
        defaultPublicacao={totalPublicacao}
        onSalvar={onSalvarDecisao}
      />
    </Surface>
  );
}
