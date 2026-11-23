import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Platform } from '../../../lib/database';
import { PostingTimesOverview } from '../../settings/components/PostingTimesOverview';
import { MetaDaContaEmbutida } from './plano/ContasEFormatosCard';
import { PausasDoPeriodo } from './plano/PausasDoPeriodo';

/** Aba de uma conta ativa: formatos desta rede, horários, pausa da conta e as séries que publicam nela. */
export function ContaEditorialPanel({
  conta,
  onEditarConta,
}: {
  conta: Platform;
  onEditarConta: () => void;
}) {
  const { state } = useAppContext();
  const series = state.series
    .filter(serie => serie.plataformas.some(item => item.platformId === conta.id))
    .sort((a, b) => Number(a.ativa === false) - Number(b.ativa === false) || a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEditarConta}>
          Editar conta
        </AppButton>
      </div>

      <MetaDaContaEmbutida conta={conta} />

      <PostingTimesOverview somenteContaId={conta.id} />

      <PausasDoPeriodo armazenadas escopos={['conta']} platformId={conta.id} />

      <section className="stack-sm" aria-labelledby="series-da-conta">
        <Text variant="sectionTitle" as="h2"><span id="series-da-conta">Séries nesta conta</span></Text>
        {series.length === 0 ? (
          <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">Nenhuma série publica nesta conta.</Text>
        ) : (
          <Surface padding="none">
            <ul>
              {series.map(serie => (
                <li key={serie.id} className="border-t border-[var(--border-subtle)] first:border-t-0">
                  <Link
                    to={`/series/${serie.id}/editar`}
                    className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <span className="min-w-0">
                      <Text variant="body" as="span" className="block truncate">{serie.name}</Text>
                      <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Editar série</Text>
                    </span>
                    {serie.ativa === false ? <Badge variant="neutral">Inativa</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
        )}
      </section>
    </div>
  );
}
