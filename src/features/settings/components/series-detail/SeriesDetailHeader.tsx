import { ArrowLeft, Clock, Layers, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import type { Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { TIPO_AGRUPAMENTO_LABEL, type ContagemConteudos } from '../../lib/serieAgrupamento';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/**
 * Cabeçalho e Hero Card da série com barra de cor, iniciais, bordão, badges e bloco de métricas.
 */
export function SeriesDetailHeader({
  serie,
  tipo,
  ancestrais,
  temporada,
  total,
  celular,
  onConfigure,
  onBulk,
}: {
  serie: Serie;
  tipo: SerieTipoAgrupamento;
  /** Do mais distante ao mais próximo. */
  ancestrais: readonly Pick<Serie, 'id' | 'name'>[];
  temporada: Temporada | null;
  total: ContagemConteudos;
  celular: boolean;
  onConfigure: () => void;
  onCreate?: () => void;
  onBulk: () => void;
}) {
  const descricao = (temporada?.descricao?.trim() || serie.notes?.trim()) || '';
  const pai = ancestrais.at(-1) ?? null;
  const nome = serie.name.trim() || 'Sem nome';
  const capa = capaHttp(serie.capaUrl);
  const iniciais = nome.slice(0, 2).toUpperCase();

  return (
    <div className="w-full stack-md">
      {/* Barra de Navegação Superior e Ações */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Link
            to={pai ? `/series/${pai.id}` : '/series'}
            className="flex items-center gap-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <Text variant="secondary" as="span">{pai ? (pai.name?.trim() || 'Série') : 'Séries & Agrupamentos'}</Text>
          </Link>
          <span className="text-[var(--text-tertiary)]">/</span>
          <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">{nome}</Text>
        </nav>

        <div className="flex items-center gap-2">
          <AppButton
            variant="secondary"
            onClick={onBulk}
            leftIcon={<Layers className="h-4 w-4" />}
          >
            Criação em Massa
          </AppButton>
          <AppButton
            variant="primary"
            onClick={onConfigure}
            leftIcon={<Pencil className="h-4 w-4" />}
          >
            Editar Série
          </AppButton>
        </div>
      </div>

      {/* Hero Card da Série */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-sm">
        {/* Faixa superior com a cor da série */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{ backgroundColor: serie.cor || 'var(--brand-accent)' }}
        />

        <div className="flex flex-col justify-between gap-6 p-4 sm:p-6 lg:flex-row lg:items-center">
          {/* Lado Esquerdo: Avatar + Identidade */}
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {capa ? (
              <img
                src={capa}
                alt={nome}
                className="h-16 w-16 shrink-0 rounded-[var(--radius-card)] object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-card)] sm:h-20 sm:w-20"
                style={{
                  backgroundColor: `${serie.cor || '#e11d48'}18`,
                  color: serie.cor || '#e11d48',
                }}
              >
                <Text variant="sectionTitle" as="span">
                  {iniciais}
                </Text>
              </div>
            )}

            <div className="min-w-0 flex-1 stack-xs">
              {/* Badges superiores */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="neutral"
                  className="uppercase"
                  style={{
                    backgroundColor: `${serie.cor || '#e11d48'}18`,
                    color: serie.cor || 'var(--text-primary)',
                  }}
                >
                  {TIPO_AGRUPAMENTO_LABEL[tipo]?.toUpperCase() || 'SÉRIE'}
                </Badge>
                <Badge variant={serie.ativa ? 'success' : 'neutral'}>
                  {serie.ativa ? 'Série Ativa' : 'Série Inativa'}
                </Badge>
                <Badge variant="neutral" className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{serie.frequenciaRecomendada || '1 roteiro / semana'}</span>
                </Badge>
              </div>

              {/* Título da série */}
              <Text variant="pageTitle" as="h1" className="text-[var(--text-primary)]">
                {nome}
              </Text>

              {/* Jargão / Bordão */}
              {serie.bordao ? (
                <Text
                  variant="body"
                  as="p"
                  className="italic"
                  style={{ color: serie.cor || 'var(--brand-accent)' }}
                >
                  "{serie.bordao}"
                </Text>
              ) : null}

              {/* Descrição */}
              {descricao ? (
                <Text variant="secondary" as="p" className="max-w-3xl leading-relaxed line-clamp-2">
                  {descricao}
                </Text>
              ) : null}
            </div>
          </div>

          {/* Lado Direito: Box de Métricas */}
          <div className="flex shrink-0 self-start flex-col rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--surface-subtle)] p-3 sm:px-6 sm:py-3 text-center lg:self-center min-w-[220px]">
            <div className="flex items-center justify-between divide-x divide-[var(--border-color)]">
              <div className="flex-1 pr-3">
                <Text variant="label" as="div" className="text-[var(--text-tertiary)] uppercase">TOTAL</Text>
                <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)]">{total.conteudos}</Text>
              </div>
              <div className="flex-1 px-3">
                <Text variant="label" as="div" className="text-[var(--text-tertiary)] uppercase">ROTEIROS</Text>
                <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)]">{total.roteiros}</Text>
              </div>
              <div className="flex-1 pl-3">
                <Text variant="label" as="div" className="text-[var(--text-tertiary)] uppercase">POSTADOS</Text>
                <Text variant="sectionTitle" as="div" className="text-emerald-600 dark:text-emerald-400">{total.publicacoes}</Text>
              </div>
            </div>

            {/* Linha de progresso de postagem */}
            <div className="mt-2.5 flex flex-col gap-1 border-t border-[var(--border-color)] pt-2 text-left">
              <div className="flex items-center justify-between">
                <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                  Publicados
                </Text>
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                  {total.conteudos > 0 ? `${Math.round((total.publicacoes / total.conteudos) * 100)}%` : '0%'}
                </Text>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{
                    width: `${total.conteudos > 0 ? Math.min(100, Math.round((total.publicacoes / total.conteudos) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
