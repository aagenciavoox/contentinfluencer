import { ChevronRight, Plus, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import type { Serie } from '../../../../lib/database';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function contagem(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

export function SeriesTrackingHeader({
  serie,
  episodios,
  quadros,
  onEdit,
  onBulk,
}: {
  serie: Serie;
  episodios: number;
  quadros: number;
  onEdit: () => void;
  onBulk: () => void;
}) {
  const isMobile = useIsMobile();
  const capa = capaHttp(serie.capaUrl);
  const proposta = serie.notes?.trim() || '';
  const meta = [
    contagem(episodios, 'episódio', 'episódios'),
    quadros > 0 ? contagem(quadros, 'quadro', 'quadros') : null,
  ].filter(Boolean).join(' · ');

  return (
    <header className="stack-lg">
      {isMobile ? null : (
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Caminho">
          <Link
            to="/series"
            className="text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            Séries
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
          <Text variant="meta" className="break-words text-[var(--text-secondary)]">{serie.name}</Text>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {capa ? (
          <img
            src={capa}
            alt=""
            className="h-24 w-24 shrink-0 rounded-[var(--radius-card)] object-cover sm:h-28 sm:w-28"
          />
        ) : (
          <span
            aria-hidden
            className="h-24 w-24 shrink-0 rounded-[var(--radius-card)] sm:h-28 sm:w-28"
            style={{ backgroundColor: serie.cor || 'var(--bg-elevated)' }}
          />
        )}

        <div className="min-w-0 flex-1 stack-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="pageTitle" as="h1" className="break-words">{serie.name}</Text>
            {!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
          </div>
          {proposta ? (
            <Text variant="body" className="max-w-3xl text-[var(--text-secondary)]">{proposta}</Text>
          ) : null}
          <Text variant="meta">{meta}</Text>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <AppButton
            variant="secondary"
            onClick={onEdit}
            leftIcon={<Settings className="h-4 w-4" />}
          >
            Editar definições
          </AppButton>
          <AppButton
            variant="primary"
            onClick={onBulk}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Adicionar em massa
          </AppButton>
        </div>
      </div>
    </header>
  );
}
