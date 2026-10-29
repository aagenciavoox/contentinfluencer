import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Text } from '../../../../components/ui/Text';
import type { Content, Serie } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import type { GrupoEpisodios } from '../../../editorial/lib/episodiosAgrupados';
import { linhaDoEpisodio, type VistaEpisodios } from '../../lib/seriesEpisodeView';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function totalDoGrupo(grupo: GrupoEpisodios): number {
  return grupo.contents.length + grupo.subgrupos.reduce((soma, item) => soma + totalDoGrupo(item), 0);
}

function contagem(quantidade: number) {
  return `${quantidade} ${quantidade === 1 ? 'episódio' : 'episódios'}`;
}

function Miniatura({ src, cor }: { src: string | null; cor: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-14 w-20 shrink-0 rounded-[var(--radius-input)] object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="h-14 w-20 shrink-0 rounded-[var(--radius-input)]"
      style={{ backgroundColor: cor || 'var(--bg-elevated)' }}
    />
  );
}

function LinhaEpisodio({
  content,
  indice,
  serie,
  series,
  onOpen,
}: {
  content: Content;
  indice: number;
  serie: Serie;
  series: readonly Serie[];
  onOpen: (content: Content) => void;
}) {
  const dona = series.find(item => item.id === content.seriesId) ?? serie;
  return (
    <button
      type="button"
      onClick={() => onOpen(content)}
      className="flex w-full items-center gap-3 border-b border-[var(--border-color)] py-3 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Miniatura src={capaHttp(dona.capaUrl) || capaHttp(serie.capaUrl)} cor={dona.cor || serie.cor} />
      <span className="min-w-0 flex-1 stack-xs">
        <Text variant="meta" as="span">Episódio {indice}</Text>
        <Text variant="itemTitle" as="span" className="block truncate">{content.title?.trim() || 'Sem título'}</Text>
        <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{linhaDoEpisodio(content)}</Text>
      </span>
    </button>
  );
}

function ListaEpisodios({
  contents,
  serie,
  series,
  onOpen,
}: {
  contents: readonly Content[];
  serie: Serie;
  series: readonly Serie[];
  onOpen: (content: Content) => void;
}) {
  return (
    <div>
      {contents.map((content, index) => (
        <LinhaEpisodio
          key={content.id}
          content={content}
          indice={index + 1}
          serie={serie}
          series={series}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function GrupoQuadro({
  grupo,
  serie,
  series,
  aninhado,
  recolhido,
  onToggle,
  onAdd,
  onOpen,
}: {
  grupo: GrupoEpisodios;
  serie: Serie;
  series: readonly Serie[];
  aninhado?: boolean;
  recolhido: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAdd: (grupo: GrupoEpisodios) => void;
  onOpen: (content: Content) => void;
}) {
  const aberto = !recolhido.has(grupo.id);
  const quadro = series.find(item => item.id === grupo.serieId);
  const descricao = grupo.serieId === serie.id ? '' : (quadro?.notes?.trim() || '');
  const total = totalDoGrupo(grupo);

  return (
    <section className={cn(aninhado && 'border-l border-[var(--border-color)] pl-3')}>
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] py-3">
        <button
          type="button"
          aria-expanded={aberto}
          onClick={() => onToggle(grupo.id)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {aberto
            ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />}
          <span className="min-w-0 stack-xs">
            <Text variant="itemTitle" as="span" className="block">{grupo.rotulo}</Text>
            <Text variant="meta" as="span">{contagem(total)}</Text>
            {descricao ? (
              <Text variant="secondary" as="span" className="line-clamp-2 block">{descricao}</Text>
            ) : null}
          </span>
        </button>
        {grupo.foraDoEscopo ? (
          <Text variant="meta" as="span" className="shrink-0 pt-1">Reorganizar</Text>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(grupo)}
            className="shrink-0 pt-1 text-sm font-medium text-[var(--brand-accent-text)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            + Adicionar episódio
          </button>
        )}
      </div>
      {aberto ? (
        <div className="stack-sm">
          {grupo.contents.length > 0 ? (
            <ListaEpisodios contents={grupo.contents} serie={serie} series={series} onOpen={onOpen} />
          ) : null}
          {grupo.subgrupos.map(sub => (
            <GrupoQuadro
              key={sub.id}
              grupo={sub}
              serie={serie}
              series={series}
              aninhado
              recolhido={recolhido}
              onToggle={onToggle}
              onAdd={onAdd}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SeriesEpisodeGroups({
  vista,
  serie,
  series,
  onAdd,
  onOpen,
  onBulk,
}: {
  vista: VistaEpisodios;
  serie: Serie;
  series: readonly Serie[];
  onAdd: (grupo: GrupoEpisodios) => void;
  onOpen: (content: Content) => void;
  onBulk: () => void;
}) {
  const [recolhido, setRecolhido] = useState<ReadonlySet<string>>(() => new Set());
  const alternar = (id: string) => {
    setRecolhido(atual => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const semEpisodio = !vista.grupos && vista.episodios.length === 0 && vista.fora.length === 0;

  return (
    <div className="stack-lg">
      {vista.grupos ? (
        vista.grupos.map(grupo => (
          <GrupoQuadro
            key={grupo.id}
            grupo={grupo}
            serie={serie}
            series={series}
            recolhido={recolhido}
            onToggle={alternar}
            onAdd={onAdd}
            onOpen={onOpen}
          />
        ))
      ) : vista.episodios.length > 0 ? (
        <ListaEpisodios contents={vista.episodios} serie={serie} series={series} onOpen={onOpen} />
      ) : null}

      {vista.fora.length > 0 ? (
        <section className="stack-sm">
          <div className="flex items-center justify-between gap-3">
            <Text variant="itemTitle" as="h2">Temporada de outro escopo</Text>
            <Text variant="meta">Reorganizar</Text>
          </div>
          <ListaEpisodios contents={vista.fora} serie={serie} series={series} onOpen={onOpen} />
        </section>
      ) : null}

      {semEpisodio ? (
        <EmptyState
          compact
          title="Nenhum episódio"
          description="Adicione um episódio com título e texto quando quiser começar."
          action={
            <button
              type="button"
              onClick={onBulk}
              className="text-sm font-medium text-[var(--brand-accent-text)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Adicionar em massa
            </button>
          }
        />
      ) : null}
    </div>
  );
}
