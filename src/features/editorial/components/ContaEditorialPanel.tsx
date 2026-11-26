import { Link } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Surface } from '../../../components/ui/Surface';
import { LinhaDeLeitura } from '../../../components/ui/LinhaDeLeitura';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Platform } from '../../../lib/database';
import { iconeDaConta, rotuloConta } from '../../contas/lib/contas';
import { PostingTimesOverview } from '../../settings/components/PostingTimesOverview';
import { plural } from '../../settings/lib/serieAgrupamento';
import { textoDoChip } from '../lib/frequenciaChip';
import { MetaDaContaEmbutida } from './plano/ContasEFormatosCard';
import { PausasDoPeriodo } from './plano/PausasDoPeriodo';

/** Aba de uma conta ativa: cabeçalho da conta, meta/formatos, horários, pausas e séries vinculadas. */
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="stack-xs min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <PlatformIcon platform={iconeDaConta(conta)} colored className="h-5 w-5 shrink-0" />
            <Text variant="sectionTitle" as="h2" className="min-w-0 truncate">
              {rotuloConta(conta)}
            </Text>
          </div>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Metas, formatos, horários e séries desta conta.
          </Text>
        </div>
        <AppButton variant="secondary" size="sm" onClick={onEditarConta}>
          Editar conta
        </AppButton>
      </div>

      <MetaDaContaEmbutida conta={conta} />

      <PostingTimesOverview somenteContaId={conta.id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <PausasDoPeriodo armazenadas variante="cartao-conta" escopos={['conta']} platformId={conta.id} />

        <Surface padding="lg" className="stack-md h-full" aria-labelledby="series-da-conta">
          <div className="stack-xs">
            <Text variant="itemTitle" as="h3">
              <span id="series-da-conta">Séries nesta conta</span>
            </Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
              {series.length === 0
                ? 'Nenhuma série publica nesta conta.'
                : plural(series.length, 'série vinculada', 'séries vinculadas')}
            </Text>
          </div>

          {series.length > 0 ? (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {series.map(serie => (
                <li key={serie.id}>
                  <Link
                    to={`/series/${serie.id}/editar`}
                    className="block rounded-[var(--radius-sm)] px-1 transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <LinhaDeLeitura rotulo={serie.name}>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <Badge variant="neutral">{textoDoChip(serie, { quadro: serie.tipoAgrupamento === 'quadro' })}</Badge>
                        {serie.ativa === false ? <Badge variant="neutral">Inativa</Badge> : null}
                      </span>
                    </LinhaDeLeitura>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Surface>
      </div>
    </div>
  );
}
