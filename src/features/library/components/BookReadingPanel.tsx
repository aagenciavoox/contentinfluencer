import { useId } from 'react';
import type { BibliotecaItem } from '../../../lib/database';
import { Surface } from '../../../components/ui/Surface';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import {
  CRITERIOS_AVALIACAO,
  CRITERIO_ROTULO,
  formatarNota,
  mediaDosCriterios,
  type AvaliacaoCriterios,
  type CriterioAvaliacao,
} from '../lib/avaliacaoCriterios';
import { HalfStarRating } from './HalfStarRating';

type StatusLeitura = BibliotecaItem['status'];

/** Só com a leitura terminada o livro ganha avaliação (na tela e no Word). */
export const STATUS_AVALIAVEL: StatusLeitura = 'Lido';

interface BookReadingPanelProps {
  status: StatusLeitura;
  statusOptions: readonly StatusLeitura[];
  onStatusChange: (status: StatusLeitura) => void;
  criterios: AvaliacaoCriterios | undefined;
  onCriterioChange: (criterio: CriterioAvaliacao, nota: number | null) => void;
  className?: string;
}

/** Topo da aba Anotações dos livros: status da leitura e a avaliação por critério. */
export function BookReadingPanel({
  status,
  statusOptions,
  onStatusChange,
  criterios,
  onCriterioChange,
  className,
}: BookReadingPanelProps) {
  const statusId = useId();
  const media = mediaDosCriterios(criterios);

  return (
    <Surface variant="outlined" padding="md" className={cn('stack-md', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={statusId} className="t-secondary text-[var(--text-primary)]">
          Status da leitura
        </label>
        <SelectField
          id={statusId}
          value={status}
          onChange={value => onStatusChange(value as StatusLeitura)}
          options={statusOptions.map(option => ({ value: option, label: option }))}
        />
      </div>

      {/* As estrelas só aparecem quando a leitura termina. */}
      {status === STATUS_AVALIAVEL && (
        <section className="border-t border-[var(--border-color)] pt-4" aria-label="Avaliação">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <Text variant="bodyStrong" as="h3">Avaliação</Text>
            <Text variant="meta">
              {media === null ? 'Sem notas ainda' : `Média ${formatarNota(Math.round(media * 10) / 10)}`}
            </Text>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
            {CRITERIOS_AVALIACAO.map(id => (
              <div key={id} className="contents">
                <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">{CRITERIO_ROTULO[id]}</Text>
                <HalfStarRating
                  label={CRITERIO_ROTULO[id]}
                  value={criterios?.[id] ?? null}
                  onChange={nota => onCriterioChange(id, nota)}
                />
              </div>
            ))}
          </div>
          <Text variant="meta" as="p" className="mt-3">
            A metade esquerda da estrela dá meia nota. Toque de novo na mesma nota para apagar.
          </Text>
        </section>
      )}
    </Surface>
  );
}
