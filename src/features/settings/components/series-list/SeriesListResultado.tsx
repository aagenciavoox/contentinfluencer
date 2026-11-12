import { useState, type ReactElement } from 'react';
import { Layers, SlidersHorizontal } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { DisclosureButton } from '../../../../components/ui/DisclosureButton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { ToggleRow } from '../../../../components/ui/ToggleSwitch';
import { useAppContext } from '../../../../context/AppContext';
import { temporadasDoEscopo } from '../../../editorial/lib/temporadas';
import { ondaComRitmoProprio } from '../../../editorial/lib/metaPropria';
import type { SeriesListaModelo } from '../../hooks/useSeriesLista';
import { TIPO_AGRUPAMENTO_PLURAL, tipoDaSerie } from '../../lib/serieAgrupamento';
import { erroDoVinculo } from '../../lib/serieHierarquia';
import { secoesDaVitrine, type ItemLista } from '../../lib/seriesListaView';
import { MoverSerieDialog } from './MoverSerieDialog';
import { SerieCard } from './SerieCard';
import { SerieLinha } from './SeriesListBlocks';

/** Corpo da lista. No computador, "Todos" separa Séries, Quadros e Famílias em seções; no celular a grade continua plana. */
export function ResultadoDaLista({ modelo, celular = false }: { modelo: SeriesListaModelo; celular?: boolean }) {
  const { state, dispatch } = useAppContext();
  const [moverId, setMoverId] = useState<string | null>(null);
  const acoes = { ...modelo.acoes, onMoverParaFamilia: setMoverId };

  const mover = (serieId: string, familiaId: string | null) => {
    const serie = state.series.find(item => item.id === serieId);
    if (!serie || tipoDaSerie(serie.id, state.series) !== 'serie') return;
    if ((serie.parentId ?? null) === familiaId) return;
    if (erroDoVinculo('serie', familiaId, serie.id, state.series)) return;
    void dispatch({ type: 'UPDATE_SERIE', payload: { ...serie, parentId: familiaId } });
  };

  const card = (item: ItemLista, mostrarOnde: boolean) => (
    <SerieCard
      key={item.serie.id}
      item={item}
      pilarNome={modelo.pilarNome(item)}
      temporadasCount={temporadasDoEscopo(item.serie.id, state.temporadas).length}
      ondasComRitmoProprio={state.temporadas.filter(onda => onda.serieId === item.serie.id && ondaComRitmoProprio(onda)).length}
      mostrarOnde={mostrarOnde}
      emAberto={modelo.emAberto(item.serie.id)}
      onOpen={acoes.onOpen}
      onOpenFilhos={acoes.onOpenFilhos}
      onEdit={acoes.onEdit}
      onToggleAtiva={acoes.onToggleAtiva}
      onMudarStatus={acoes.onMudarStatus}
      onCriarFilho={acoes.onCriarFilho}
      onMoverParaFamilia={acoes.onMoverParaFamilia}
    />
  );

  return (
    <>
      <CorpoDaLista modelo={modelo} celular={celular} card={card} acoes={acoes} />
      <MoverSerieDialog
        serie={moverId ? state.series.find(item => item.id === moverId) ?? null : null}
        series={state.series}
        onClose={() => setMoverId(null)}
        onMover={familiaId => { if (moverId) mover(moverId, familiaId); }}
      />
      {modelo.modalAtivacao}
    </>
  );
}

function CorpoDaLista({
  modelo,
  celular,
  card,
  acoes,
}: {
  modelo: SeriesListaModelo;
  celular: boolean;
  card: (item: ItemLista, mostrarOnde: boolean) => ReactElement;
  acoes: SeriesListaModelo['acoes'] & { onMoverParaFamilia: (serieId: string) => void };
}) {
  const { lista, filtros } = modelo;
  const emSecoes = !celular && filtros.tipo === 'todos';
  const fonte = emSecoes ? lista.elegiveis : lista.visiveis;
  const grade = celular ? 'grid grid-cols-1 gap-3' : 'grid-content';
  if (fonte.length === 0) {
    const busca = filtros.busca.trim();
    return (
      <EmptyState
        compact
        icon={<Layers className="h-8 w-8" />}
        title={busca ? `Nada encontrado para “${busca}”` : 'Nenhuma série ou quadro com estes filtros'}
        description="Ajuste o termo pesquisado ou limpe os filtros para ver outras séries e quadros."
        action={<AppButton variant="secondary" onClick={modelo.limparFiltros}>Limpar busca e filtros</AppButton>}
      />
    );
  }

  if (emSecoes) {
    return (
      <SecoesDaVitrine
        itens={lista.elegiveis}
        vista={filtros.vista}
        grade={grade}
        card={card}
        linha={(item, recuo) => (
          <SerieLinha
            key={item.serie.id}
            item={item}
            pilarNome={modelo.pilarNome(item)}
            recuo={recuo}
            emAberto={modelo.emAberto(item.serie.id)}
            acoes={acoes}
          />
        )}
      />
    );
  }

  if (filtros.vista === 'lista' && !celular) {
    return (
      <Surface variant="outlined" padding="none" className="overflow-hidden">
        <ul>
          {lista.visiveis.map(item => (
            <SerieLinha
              key={item.serie.id}
              item={item}
              pilarNome={modelo.pilarNome(item)}
              recuo={!filtros.busca.trim()}
              emAberto={modelo.emAberto(item.serie.id)}
              acoes={acoes}
            />
          ))}
        </ul>
      </Surface>
    );
  }

  return <div className={grade}>{lista.visiveis.map(item => card(item, true))}</div>;
}

function SecoesDaVitrine({
  itens,
  vista,
  grade,
  card,
  linha,
}: {
  itens: ItemLista[];
  vista: 'cards' | 'lista';
  grade: string;
  card: (item: ItemLista, mostrarOnde: boolean) => ReactElement;
  linha: (item: ItemLista, recuo: boolean) => ReactElement;
}) {
  const secoes = secoesDaVitrine(itens);
  return (
    <div className="stack-2xl">
      {secoes.map(secao => (
        <section key={secao.tipo} className="stack-md" aria-labelledby={`vitrine-secao-${secao.tipo}`}>
          <div className="flex items-baseline gap-2">
            <Text variant="sectionTitle" as="h2" id={`vitrine-secao-${secao.tipo}`}>
              {TIPO_AGRUPAMENTO_PLURAL[secao.tipo]}
            </Text>
            <Text variant="meta" as="span" className="tabular-nums text-[var(--text-tertiary)]">
              {secao.itens.length}
            </Text>
          </div>
          {vista === 'lista' ? (
            <Surface variant="outlined" padding="none" className="overflow-hidden">
              <ul>{secao.itens.map(item => linha(item, false))}</ul>
            </Surface>
          ) : (
            <div className={grade}>{secao.itens.map(item => card(item, true))}</div>
          )}
        </section>
      ))}
    </div>
  );
}

/** Preferências do módulo numa faixa que começa recolhida. */
export function PreferenciasSeries({ preferencias }: { preferencias: SeriesListaModelo['preferencias'] }) {
  const [aberta, setAberta] = useState(false);
  return (
    <Surface variant="outlined" padding="none">
      <DisclosureButton open={aberta} onToggle={() => setAberta(atual => !atual)} controls="series-preferencias" className="px-4">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
        <Text variant="body" as="span">Preferências</Text>
      </DisclosureButton>
      {aberta ? (
        <div id="series-preferencias" className="grid gap-x-6 gap-y-2 border-t border-[var(--border-color)] px-4 py-3 md:grid-cols-2">
          {preferencias.map(row => (
            <ToggleRow
              key={row.key}
              id={`series-${row.key}`}
              enabled={row.enabled}
              onToggle={row.toggle}
              title={row.title}
              className="gap-4 py-1"
            >
              <span className="stack-xs">
                <Text variant="body" as="span">{row.title}</Text>
                <Text variant="secondary" as="span">{row.description}</Text>
              </span>
            </ToggleRow>
          ))}
        </div>
      ) : null}
    </Surface>
  );
}
