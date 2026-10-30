import { ValorVazio } from '../../../../components/ui/ValorVazio';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { DisclosureButton } from '../../../../components/ui/DisclosureButton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Text } from '../../../../components/ui/Text';
import type { Content, Serie } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { getDisplayStatus, getDisplayStatusLabel } from '../../../contents/lib/contentPipeline';
import type { GrupoEpisodios } from '../../../editorial/lib/episodiosAgrupados';
import { dataDoEpisodio, type VistaEpisodios } from '../../lib/seriesEpisodeView';

function totalDoGrupo(grupo: GrupoEpisodios): number {
  return grupo.contents.length + grupo.subgrupos.reduce((soma, item) => soma + totalDoGrupo(item), 0);
}

function contagem(quantidade: number) {
  return `${quantidade} ${quantidade === 1 ? 'episódio' : 'episódios'}`;
}

function painelId(grupoId: string) {
  return `episodios-${grupoId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function LinhaEpisodio({
  content,
  indice,
  onOpen,
}: {
  content: Content;
  indice: number;
  onOpen: (content: Content) => void;
}) {
  const status = getDisplayStatus(content);
  const data = dataDoEpisodio(content);
  return (
    <button
      type="button"
      onClick={() => onOpen(content)}
      className="flex w-full items-center gap-3 border-b border-[var(--border-color)] py-3 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <span className="min-w-0 flex-1 stack-xs">
        <Text variant="meta" as="span">Episódio {indice}</Text>
        <Text variant="itemTitle" as="span" className="block truncate">{content.title?.trim() || 'Sem título'}</Text>
      </span>
      <Badge variant="status" status={status}>{getDisplayStatusLabel(content)}</Badge>
      <Text variant="meta" as="span" className="shrink-0">{data === '—' ? <ValorVazio /> : data}</Text>
    </button>
  );
}

function ListaEpisodios({
  contents,
  onOpen,
}: {
  contents: readonly Content[];
  onOpen: (content: Content) => void;
}) {
  return (
    <div>
      {contents.map((content, index) => (
        <LinhaEpisodio
          key={content.id}
          content={content}
          indice={index + 1}
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
  const idPainel = painelId(grupo.id);

  return (
    <section className={cn(aninhado && 'border-l border-[var(--border-color)] pl-3')}>
      <div className="flex items-start gap-2 border-b border-[var(--border-color)] py-1">
        <DisclosureButton
          open={aberto}
          onToggle={() => onToggle(grupo.id)}
          controls={idPainel}
          trailing={<Text variant="meta" as="span">{contagem(total)}</Text>}
          className="min-w-0 flex-1"
        >
          <span className="min-w-0 stack-xs py-1">
            <Text variant="itemTitle" as="span" className="block">{grupo.rotulo}</Text>
            {descricao ? (
              <Text variant="secondary" as="span" className="line-clamp-2 block">{descricao}</Text>
            ) : null}
          </span>
        </DisclosureButton>
        {grupo.foraDoEscopo ? (
          <Badge variant="neutral" className="mt-2 shrink-0">Em outra temporada</Badge>
        ) : (
          <AppButton
            variant="secondary"
            size="sm"
            className="mt-1 shrink-0"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => onAdd(grupo)}
          >
            Adicionar episódio
          </AppButton>
        )}
      </div>
      {aberto ? (
        <div id={idPainel} className="stack-sm">
          {grupo.contents.length > 0 ? (
            <ListaEpisodios contents={grupo.contents} onOpen={onOpen} />
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
        <ListaEpisodios contents={vista.episodios} onOpen={onOpen} />
      ) : null}

      {vista.fora.length > 0 ? (
        <section className="stack-sm">
          <div className="flex items-center justify-between gap-3">
            <Text variant="itemTitle" as="h2">Temporada de outro escopo</Text>
            <Badge variant="neutral">Em outra temporada</Badge>
          </div>
          <ListaEpisodios contents={vista.fora} onOpen={onOpen} />
        </section>
      ) : null}

      {semEpisodio ? (
        <EmptyState
          compact
          title="Nenhum episódio"
          description="Adicione um episódio com título e texto quando quiser começar."
          action={
            <AppButton variant="secondary" onClick={onBulk}>
              Adicionar em massa
            </AppButton>
          }
        />
      ) : null}
    </div>
  );
}
