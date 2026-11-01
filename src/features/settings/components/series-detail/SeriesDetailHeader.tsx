import { FilePlus2, Plus, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import { DesktopPageHeader } from '../../../../layouts/page/DesktopPageHeader';
import type { Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { TIPO_AGRUPAMENTO_LABEL } from '../../lib/serieAgrupamento';

const crumbLinkClass =
  'desktop-page-header-crumb rounded-[var(--radius-sm)] transition-colors hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Cabeçalho da página do agrupamento: nome e cor, tipo, caminho até os agrupamentos
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
  const descricao = (temporada?.descricao?.trim() || serie.notes?.trim()) || '';
  const pai = ancestrais.at(-1) ?? null;
  const nome = serie.name.trim() || 'Sem nome';

  const identityBlock = (
    <div className="min-w-0 flex-1 stack-xs">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <Text variant="pageTitle" as="h1" className="min-w-0 break-words text-[var(--text-primary)]">{nome}</Text>
        <span
          aria-hidden
          className="entity-color-dot h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: serie.cor || 'var(--text-tertiary)' }}
        />
        {!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
      </div>
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
  );

  if (!celular) {
    return (
      <DesktopPageHeader
        section="Criação"
        title={nome}
        backLabel={pai ? pai.name?.trim() || 'Série' : 'Séries e quadros'}
        backTo={pai ? `/series/${pai.id}` : '/series'}
        titleContent={identityBlock}
        actions={(
          <>
            <AppButton variant="secondary" iconOnly aria-label="Configurar" title="Configurar" onClick={onConfigure}>
              <Settings className="h-4 w-4" />
            </AppButton>
            <AppButton variant="secondary" onClick={onBulk} leftIcon={<FilePlus2 className="h-4 w-4" />}>
              Em massa
            </AppButton>
            <AppButton variant="primary" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
              Novo conteúdo
            </AppButton>
          </>
        )}
      />
    );
  }

  return (
    <div className="w-full stack-sm">
      <div className="flex items-start justify-between gap-6">
        {identityBlock}
      </div>
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
    </div>
  );
}
