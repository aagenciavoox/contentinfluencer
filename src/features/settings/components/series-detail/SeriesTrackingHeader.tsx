import { Plus, Settings } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import type { Serie } from '../../../../lib/database';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/** Cabeçalho compacto do celular. Sem capa, o quadrado some. */
export function SeriesTrackingHeader({
  serie,
  meta,
  onEdit,
  onBulk,
}: {
  serie: Serie;
  meta: string;
  onEdit: () => void;
  onBulk: () => void;
}) {
  const capa = capaHttp(serie.capaUrl);
  const proposta = serie.notes?.trim() || '';

  return (
    <header className="stack-lg">
      <div className="flex items-start gap-4">
        {capa ? (
          <img
            src={capa}
            alt=""
            className="h-24 w-24 shrink-0 rounded-[var(--radius-card)] object-cover"
          />
        ) : null}

        <div className="min-w-0 flex-1 stack-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="pageTitle" as="h1" className="break-words">{serie.name}</Text>
            {!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
          </div>
          {proposta ? (
            <Text variant="body" className="text-[var(--text-secondary)]">{proposta}</Text>
          ) : null}
          <Text variant="meta">{meta}</Text>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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
    </header>
  );
}
