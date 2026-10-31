import { useState } from 'react';
import { Layers, SlidersHorizontal } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { DisclosureButton } from '../../../../components/ui/DisclosureButton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { ToggleRow } from '../../../../components/ui/ToggleSwitch';
import type { SeriesListaModelo } from '../../hooks/useSeriesLista';
import type { ItemLista } from '../../lib/seriesListaView';
import { SerieCard } from './SerieCard';
import { FamiliaSecao, SerieLinha } from './SeriesListBlocks';

/** Corpo da lista: agrupado por família, em cards planos ou em linhas. */
export function ResultadoDaLista({ modelo, celular = false }: { modelo: SeriesListaModelo; celular?: boolean }) {
  const { lista, filtros } = modelo;
  const grade = celular ? 'grid grid-cols-1 gap-3' : 'grid-content';
  const card = (item: ItemLista, mostrarOnde: boolean) => (
    <SerieCard
      key={item.serie.id}
      item={item}
      pilarNome={modelo.pilarNome(item)}
      mostrarOnde={mostrarOnde}
      emAberto={modelo.emAberto(item.serie.id)}
      onOpen={modelo.acoes.onOpen}
      onOpenFilhos={modelo.acoes.onOpenFilhos}
      onEdit={modelo.acoes.onEdit}
      onToggleAtiva={modelo.acoes.onToggleAtiva}
      onCriarFilho={modelo.acoes.onCriarFilho}
    />
  );

  if (lista.visiveis.length === 0 && !(lista.agrupada && lista.agrupada.familias.length > 0)) {
    const busca = filtros.busca.trim();
    return (
      <EmptyState
        compact
        icon={<Layers className="h-8 w-8" />}
        title={busca ? `Nada encontrado para “${busca}”` : 'Nenhum agrupamento com estes filtros'}
        description="Ajuste a busca ou os filtros para ver outras séries."
        action={<AppButton variant="secondary" onClick={modelo.limparFiltros}>Limpar busca e filtro</AppButton>}
      />
    );
  }

  if (lista.agrupada) {
    const { familias, independentes } = lista.agrupada;
    return (
      <div className="stack-2xl">
        {familias.map(grupo => (
          <FamiliaSecao
            key={grupo.familia.serie.id}
            item={grupo.familia}
            aberta={modelo.familiaAberta(grupo.familia.serie.id)}
            onToggle={() => modelo.alternarFamilia(grupo.familia.serie.id)}
            acoes={modelo.acoes}
          >
            {grupo.itens.length > 0 ? (
              <div className={grade}>{grupo.itens.map(item => card(item, false))}</div>
            ) : (
              <Text variant="secondary">Nenhuma série nesta família ainda.</Text>
            )}
          </FamiliaSecao>
        ))}
        {independentes.length > 0 ? (
          <section className="stack-md" aria-label="Séries independentes">
            {familias.length > 0 ? (
              <Text variant="sectionTitle" as="h2" className="border-b border-[var(--border-color)] pb-3">
                Séries independentes
              </Text>
            ) : null}
            <div className={grade}>{independentes.map(item => card(item, false))}</div>
          </section>
        ) : null}
      </div>
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
              acoes={modelo.acoes}
            />
          ))}
        </ul>
      </Surface>
    );
  }

  return <div className={grade}>{lista.visiveis.map(item => card(item, true))}</div>;
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
