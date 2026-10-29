import {useMemo, useState, type ReactNode} from 'react';
import {Search} from 'lucide-react';
import {SelectField} from '../../../components/ui/SelectField';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {Content, Serie, Tema} from '../../../lib/database';
import {postItKind, postItTitle, type PlanejamentoPostIt, type PostItKind} from '../lib/postIt';
import {KIND_LABEL} from './PostItNote';

const ETAPA_OPCOES: {value: PostItKind | 'todas'; label: string}[] = [
  {value: 'todas', label: 'Etapa'},
  {value: 'vazio', label: KIND_LABEL.vazio},
  {value: 'ideia', label: KIND_LABEL.ideia},
  {value: 'roteiro', label: KIND_LABEL.roteiro},
  {value: 'producao', label: KIND_LABEL.producao},
  {value: 'edicao', label: KIND_LABEL.edicao},
  {value: 'postado', label: KIND_LABEL.postado},
];

export function SemDataPanel({
  undated,
  contents,
  series,
  temas = [],
  pileOver,
  onDragOver,
  onDragLeave,
  onDrop,
  renderPostIt,
  className,
  compactHint = false,
}: {
  undated: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  temas?: readonly Pick<Tema, 'id' | 'nome'>[];
  pileOver?: boolean;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  className?: string;
  /** Celular: texto sem “arraste”. */
  compactHint?: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [quadroId, setQuadroId] = useState('todos');
  const [assuntoId, setAssuntoId] = useState('todos');
  const [etapa, setEtapa] = useState<PostItKind | 'todas'>('todas');

  const contentById = useMemo(
    () => new Map(contents.map(content => [content.id, content])),
    [contents],
  );

  const quadroOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const postIt of undated) {
      const content = postIt.contentId ? contentById.get(postIt.contentId) : null;
      const serieId = content?.seriesId ?? postIt.serieId;
      if (serieId) ids.add(serieId);
    }
    return [
      {value: 'todos', label: 'Quadro'},
      ...series
        .filter(serie => ids.has(serie.id))
        .map(serie => ({value: serie.id, label: serie.name.trim() || 'Sem nome'})),
    ];
  }, [undated, series, contentById]);

  const assuntoOptions = useMemo(() => {
    const usados = new Set<string>();
    for (const postIt of undated) {
      const content = postIt.contentId ? contentById.get(postIt.contentId) : null;
      for (const id of content?.temaIds ?? []) usados.add(id);
    }
    return [
      {value: 'todos', label: 'Assunto'},
      ...temas
        .filter(tema => usados.has(tema.id))
        .map(tema => ({value: tema.id, label: tema.nome.trim() || 'Assunto'})),
    ];
  }, [undated, contentById, temas]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase('pt-BR');
    return undated.filter(postIt => {
      const content = postIt.contentId ? contentById.get(postIt.contentId) ?? null : null;
      const kind = postItKind(postIt, content);
      if (etapa !== 'todas' && kind !== etapa) return false;
      const serieId = content?.seriesId ?? postIt.serieId ?? null;
      if (quadroId !== 'todos' && serieId !== quadroId) return false;
      if (assuntoId !== 'todos' && !(content?.temaIds ?? []).includes(assuntoId)) return false;
      if (!q) return true;
      const titulo = postItTitle(postIt, content).toLocaleLowerCase('pt-BR');
      return titulo.includes(q);
    });
  }, [undated, contentById, busca, quadroId, assuntoId, etapa]);

  return (
    <Surface
      variant="outlined"
      padding="sm"
      className={cn(
        'stack-sm',
        pileOver && 'bg-[color-mix(in_srgb,var(--accent-orange)_12%,var(--bg-elevated))] ring-2 ring-[var(--accent-orange)]',
        className,
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div>
        <Text variant="sectionTitle">Sem data</Text>
        <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
          {compactHint
            ? 'Use ⋯ no card para colocar no período.'
            : 'Arraste uma pauta para o período.'}
        </Text>
      </div>

      <label className="relative block">
        <span className="sr-only">Buscar conteúdo</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
        <input
          type="search"
          value={busca}
          onChange={event => setBusca(event.target.value)}
          placeholder="Buscar conteúdo..."
          className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        />
      </label>

      <div className="flex flex-wrap gap-1.5">
        <SelectField
          ariaLabel="Filtrar por quadro"
          value={quadroId}
          onChange={setQuadroId}
          options={quadroOptions}
          className="min-h-8 text-xs"
        />
        <SelectField
          ariaLabel="Filtrar por assunto"
          value={assuntoId}
          onChange={setAssuntoId}
          options={assuntoOptions.length > 1 ? assuntoOptions : [{value: 'todos', label: 'Assunto'}]}
          className="min-h-8 text-xs"
        />
        <SelectField
          ariaLabel="Filtrar por etapa"
          value={etapa}
          onChange={value => setEtapa(value as PostItKind | 'todas')}
          options={ETAPA_OPCOES}
          className="min-h-8 text-xs"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-8 text-center">
          <Text variant="meta" className="text-[var(--text-secondary)]">
            {undated.length === 0
              ? (compactHint ? 'Nenhuma pauta sem data.' : 'Solte aqui para deixar a pauta sem data.')
              : 'Nada combina com a busca ou os filtros.'}
          </Text>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
          {filtrados.map(postIt => (
            <li key={postIt.id}>{renderPostIt(postIt)}</li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
