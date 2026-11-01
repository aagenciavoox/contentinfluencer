import { ChevronRight, FilePlus2, Plus, Settings } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import type { Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { TIPO_AGRUPAMENTO_LABEL } from '../../lib/serieAgrupamento';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

const crumbLinkClass =
  'desktop-page-header-crumb rounded-[var(--radius-sm)] transition-colors hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Cabeçalho da página do agrupamento: capa, nome e cor, tipo, caminho até os agrupamentos
 * superiores e as ações. A página prioriza os conteúdos; o que é configuração fica na engrenagem.
 */
export function SeriesDetailHeader({
  serie,
  tipo,
  ancestrais,
  temporada,
  resumo,
  celular,
  onConfigure,
  onCreate,
  onBulk,
}: {
  serie: Serie;
  tipo: SerieTipoAgrupamento;
  /** Do mais distante ao mais próximo. */
  ancestrais: readonly Pick<Serie, 'id' | 'name'>[];
  temporada: Temporada | null;
  /** "18 conteúdos · Fantasia · Aprofundar". */
  resumo: string;
  celular: boolean;
  onConfigure: () => void;
  onCreate: () => void;
  onBulk: () => void;
}) {
  const capa = capaHttp(serie.capaUrl);
  const descricao = (temporada?.descricao?.trim() || serie.notes?.trim()) || '';
  const pai = ancestrais.at(-1) ?? null;
  const nome = serie.name.trim() || 'Sem nome';

  return (
    <div className="desktop-page-header stack-md">
      {celular ? null : (
        <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1.5">
          <Link to="/series" className={crumbLinkClass}>Séries e quadros</Link>
          {ancestrais.map(item => (
            <Fragment key={item.id}>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
              <Link to={`/series/${item.id}`} className={crumbLinkClass}>{item.name?.trim() || 'Sem nome'}</Link>
            </Fragment>
          ))}
          <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
          {temporada ? (
            <>
              <Link to={`/series/${serie.id}`} className={crumbLinkClass}>{nome}</Link>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
              <span aria-current="page" className="desktop-page-header-crumb text-[var(--text-primary)]">{temporada.nome}</span>
            </>
          ) : (
            <span aria-current="page" className="desktop-page-header-crumb text-[var(--text-primary)]">{nome}</span>
          )}
        </nav>
      )}

      <div className="flex items-start gap-3 sm:gap-6">
        {capa ? (
          <img
            src={capa}
            alt=""
            className={cn(
              'shrink-0 rounded-[var(--radius-card)] object-cover',
              celular ? 'h-16 w-16' : 'h-28 w-44',
            )}
          />
        ) : null}

        <div className="min-w-0 flex-1 stack-xs">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <Text variant="pageTitle" className="min-w-0 break-words">{nome}</Text>
            <span
              aria-hidden
              className="entity-color-dot h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: serie.cor || 'var(--text-tertiary)' }}
            />
            {!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
          </span>
          <p className="flex flex-wrap items-center gap-1.5 t-secondary text-[var(--text-secondary)]">
            {pai ? (
              <>
                <Link to={`/series/${pai.id}`} className={crumbLinkClass}>{pai.name?.trim() || 'Sem nome'}</Link>
                <span aria-hidden className="text-[var(--text-tertiary)]">/</span>
              </>
            ) : null}
            <span>{TIPO_AGRUPAMENTO_LABEL[tipo]}</span>
            {temporada && celular ? (
              <>
                <span aria-hidden className="text-[var(--text-tertiary)]">/</span>
                <span>{temporada.nome}</span>
              </>
            ) : null}
          </p>
          {descricao ? (
            <Text variant="body" className={cn('max-w-3xl', celular && 'line-clamp-2')}>{descricao}</Text>
          ) : null}
          {resumo ? <Text variant="meta" as="p">{resumo}</Text> : null}
        </div>

        {celular ? null : (
          <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
            <AppButton variant="secondary" iconOnly aria-label="Configurar" title="Configurar" onClick={onConfigure}>
              <Settings className="h-4 w-4" />
            </AppButton>
            <AppButton variant="secondary" onClick={onBulk} leftIcon={<FilePlus2 className="h-4 w-4" />}>
              Em massa
            </AppButton>
            <AppButton variant="primary" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
              Novo conteúdo
            </AppButton>
          </div>
        )}
      </div>

      {celular ? (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            variant="primary"
            onClick={onCreate}
            leftIcon={<Plus className="h-4 w-4" />}
            className="flex-1"
          >
            Novo
          </AppButton>
          <AppButton
            variant="secondary"
            onClick={onBulk}
            leftIcon={<FilePlus2 className="h-4 w-4" />}
            className="flex-1"
          >
            Em massa
          </AppButton>
          <AppButton variant="secondary" iconOnly aria-label="Configurar" onClick={onConfigure}>
            <Settings className="h-4 w-4" />
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
