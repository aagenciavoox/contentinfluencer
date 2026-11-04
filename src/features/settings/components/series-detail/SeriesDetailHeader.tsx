import { ArrowLeft, ChevronDown, Layers, Pencil, Plus, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu } from '../../../../components/ui/MoreMenu';
import { PlatformIcons } from '../../../../components/ui/PlatformIcons';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import type { Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { rotuloDoFoco } from '../../../editorial/lib/focoTemporada';
import { normalizarRedesPostIt } from '../../../planejamento/lib/redesPostIt';
import { TIPO_AGRUPAMENTO_LABEL } from '../../lib/serieAgrupamento';
import type { MetaDoCabecalho, TotaisDoCabecalho } from '../../lib/serieCabecalho';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

const FAIXAS: Array<{ id: keyof TotaisDoCabecalho; rotulo: string }> = [
  { id: 'total', rotulo: 'Episódios' },
  { id: 'ideias', rotulo: 'Ideias' },
  { id: 'roteiros', rotulo: 'Roteiros' },
  { id: 'producao', rotulo: 'Produção' },
  { id: 'postados', rotulo: 'Postados' },
];

/**
 * Cabeçalho da série: identidade compacta, ações, totais por etapa atual e a meta de planejamento.
 */
export function SeriesDetailHeader({
  serie,
  tipo,
  ancestrais,
  temporada,
  totais,
  meta,
  celular,
  onConfigure,
  onCreate,
  onBulk,
  adicionar,
}: {
  serie: Serie;
  tipo: SerieTipoAgrupamento;
  /** Do mais distante ao mais próximo. */
  ancestrais: readonly Pick<Serie, 'id' | 'name'>[];
  temporada: Temporada | null;
  totais: TotaisDoCabecalho;
  meta: MetaDoCabecalho;
  celular: boolean;
  onConfigure: () => void;
  onCreate: () => void;
  onBulk: () => void;
  /** Na série e no quadro, um botão só abre temporada, quadro e episódio. */
  adicionar?: { onEpisodio: () => void; onTemporada?: () => void; onQuadro?: () => void } | null;
}) {
  const descricao = (temporada?.descricao?.trim() || serie.notes?.trim()) || '';
  const foco = normalizarRedesPostIt(temporada?.focoRedes?.length ? temporada.focoRedes : serie.focoRedes ?? []);
  const pai = ancestrais.at(-1) ?? null;
  const nome = serie.name.trim() || 'Sem nome';
  const capa = capaHttp(serie.capaUrl);
  const iniciais = nome.slice(0, 2).toUpperCase();
  const cor = serie.cor || 'var(--brand-accent)';

  return (
    <div className="w-full stack-sm">
      <nav className="flex flex-wrap items-center gap-1.5 text-[var(--text-secondary)]" aria-label="Caminho">
        <Link
          to={pai ? `/series/${pai.id}` : '/series'}
          className="flex items-center gap-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <Text variant="secondary" as="span">{pai ? 'Voltar' : 'Séries'}</Text>
        </Link>
        {ancestrais.map(no => (
          <span key={no.id} className="flex items-center gap-1.5">
            <span className="text-[var(--text-tertiary)]">/</span>
            <Link to={`/series/${no.id}`} className="hover:underline">
              <Text variant="secondary" as="span">{no.name?.trim() || 'Sem nome'}</Text>
            </Link>
          </span>
        ))}
        {temporada ? (
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--text-tertiary)]">/</span>
            <Link to={`/series/${serie.id}`} className="hover:underline">
              <Text variant="secondary" as="span">{nome}</Text>
            </Link>
          </span>
        ) : null}
      </nav>

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 sm:p-4" style={{ borderLeft: `4px solid ${cor}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {capa ? (
              <img src={capa} alt="" className="h-12 w-12 shrink-0 rounded-[var(--radius-input)] object-cover" />
            ) : (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-input)]"
                style={{ backgroundColor: `${serie.cor || '#e11d48'}18`, color: serie.cor || '#e11d48' }}
                aria-hidden="true"
              >
                <Text variant="bodyStrong" as="span">{iniciais}</Text>
              </div>
            )}
            <div className="min-w-0 flex-1 stack-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="pageTitle" as="h1" className="text-[var(--text-primary)]">
                  {temporada ? temporada.nome : nome}
                </Text>
                <Badge variant="neutral">{TIPO_AGRUPAMENTO_LABEL[tipo] ?? 'Série'}</Badge>
                <Badge variant={serie.ativa ? 'success' : 'neutral'}>{serie.ativa ? 'Ativa' : 'Inativa'}</Badge>
              </div>
              {foco.length > 0 ? (
                <span className="flex flex-wrap items-center gap-2">
                  <PlatformIcons redes={foco} max={6} size="md" />
                  <Text variant="meta" as="span">{rotuloDoFoco(foco)}</Text>
                </span>
              ) : null}
              {descricao ? (
                <Text variant="secondary" as="p" className="max-w-3xl line-clamp-2">{descricao}</Text>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AppButton variant="ghost" size={celular ? 'sm' : undefined} onClick={onConfigure} leftIcon={<Pencil className="h-4 w-4" />}>
              Editar série
            </AppButton>
            <AppButton variant="secondary" size={celular ? 'sm' : undefined} onClick={onBulk} leftIcon={<Layers className="h-4 w-4" />}>
              Criar em massa
            </AppButton>
            {adicionar ? (
              <MoreMenu
                label="Adicionar"
                align="right"
                triggerClassName="!h-auto !w-auto border-0 bg-transparent p-0 hover:bg-transparent pointer-coarse:!h-auto pointer-coarse:!w-auto"
                trigger={(
                  <span className={cn(
                    't-button inline-flex items-center gap-2 rounded-[var(--radius-input)] border border-[var(--brand-accent-strong)] bg-[var(--brand-accent-strong)] px-4 text-[var(--brand-on-accent)]',
                    celular ? 'h-8' : 'h-[var(--control-height)]',
                    'pointer-coarse:h-11',
                  )}>
                    <Plus className="h-4 w-4" />
                    Adicionar
                    <ChevronDown className="h-4 w-4" />
                  </span>
                )}
                items={[
                  ...(adicionar.onTemporada ? [{ label: 'Temporada', onClick: adicionar.onTemporada }] : []),
                  ...(adicionar.onQuadro ? [{ label: 'Quadro', onClick: adicionar.onQuadro }] : []),
                  { label: 'Episódio', onClick: adicionar.onEpisodio },
                ]}
              />
            ) : (
              <AppButton variant="primary" size={celular ? 'sm' : undefined} onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Novo episódio
              </AppButton>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <dl className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Episódios por etapa atual">
            {FAIXAS.map(faixa => (
              <div key={faixa.id} className="flex flex-col">
                <dt><Text variant="meta" as="span" className="text-[var(--text-tertiary)]">{faixa.rotulo}</Text></dt>
                <dd><Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">{totais[faixa.id]}</Text></dd>
              </div>
            ))}
          </dl>

          <div className="ml-auto flex min-w-[220px] flex-col justify-center gap-1 rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                {meta.estado === 'sem-meta' ? 'Meta de planejamento' : meta.regra}
              </Text>
            </div>
            <Text variant="secondary" as="span" className="text-[var(--text-primary)]">{meta.texto}</Text>
            {meta.estado === 'ativa' && meta.esperado > 0 ? (
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]"
                role="progressbar"
                aria-label="Episódios previstos em relação à meta"
                aria-valuemin={0}
                aria-valuemax={meta.esperado}
                aria-valuenow={meta.previstos}
              >
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${meta.barra}%`, backgroundColor: cor }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
