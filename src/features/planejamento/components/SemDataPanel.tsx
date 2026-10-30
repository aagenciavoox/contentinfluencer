import {AppButton} from '../../../components/ui/AppButton';
import {SegmentTabs} from '../../../components/ui/SegmentTabs';
import {EmptyState} from '../../../components/ui/EmptyState';
import {useMemo, useState, type ReactNode} from 'react';
import {Search} from 'lucide-react';
import {SelectField} from '../../../components/ui/SelectField';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {Content, Serie, Tema} from '../../../lib/database';
import {postItKind, postItTitle, type PlanejamentoPostIt, type PostItKind} from '../lib/postIt';
import {KIND_LABEL} from './PostItNote';
import {normalizeContentStatus} from '../../contents/lib/contentPipeline';

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
  candidatos = [],
  onPuxar,
  onMoverContent,
  contents,
  series,
  temas = [],
  pileOver,
  onDragOver,
  onDragLeave,
  onDrop,
  renderPostIt,
  renderContent,
  className,
}: {
  candidatos?: readonly Content[];
  onPuxar?: (content: Content) => void;
  onMoverContent?: (content: Content) => void;
  undated: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  temas?: readonly Pick<Tema, 'id' | 'nome'>[];
  pileOver?: boolean;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  renderPostIt: (postIt: PlanejamentoPostIt) => ReactNode;
  renderContent: (content:Content) => ReactNode;
  className?: string;
}) {
  const [busca, setBusca] = useState('');
  const [aba,setAba] = useState<'pautas'|'conteudos'>('pautas');
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
    candidatos.forEach(content => {if (content.seriesId) ids.add(content.seriesId);});
    return [
      {value: 'todos', label: 'Quadro'},
      ...series
        .filter(serie => ids.has(serie.id))
        .map(serie => ({value: serie.id, label: serie.name.trim() || 'Sem nome'})),
    ];
  }, [undated, candidatos, series, contentById]);

  const assuntoOptions = useMemo(() => {
    const usados = new Set<string>();
    for (const postIt of undated) {
      const content = postIt.contentId ? contentById.get(postIt.contentId) : null;
      for (const id of content?.temaIds ?? []) usados.add(id);
    }
    candidatos.forEach(content => (content.temaIds ?? []).forEach(id => usados.add(id)));
    return [
      {value: 'todos', label: 'Assunto'},
      ...temas
        .filter(tema => usados.has(tema.id))
        .map(tema => ({value: tema.id, label: tema.nome.trim() || 'Assunto'})),
    ];
  }, [undated, candidatos, contentById, temas]);

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

  const pautas = undated.filter(postIt => !postIt.contentId);
  const conteudosLigados = undated.filter(postIt => Boolean(postIt.contentId));
  const etapaSelecionada = ETAPA_OPCOES.find(option => option.value === etapa)?.label;
  const roteiros = candidatos.filter(content => {
    if (etapa !== 'todas' && normalizeContentStatus(content.status) !== etapaSelecionada) return false;
    if (quadroId !== 'todos' && content.seriesId !== quadroId) return false;
    if (assuntoId !== 'todos' && !(content.temaIds ?? []).includes(assuntoId)) return false;
    return !busca.trim() || content.title.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'));
  });
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
          Pautas e conteúdos para encaixar no calendário.
        </Text>
      </div>

      <SegmentTabs<'pautas'|'conteudos'> value={aba} onChange={setAba} ariaLabel="Itens sem data" options={[{id:'pautas',label:'Pautas',count:pautas.length},{id:'conteudos',label:'Conteúdos',count:conteudosLigados.length+candidatos.length}]} />
      <label className="relative block">
        <span className="sr-only">Buscar itens sem data</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
        <input
          type="search"
          value={busca}
          onChange={event => setBusca(event.target.value)}
          placeholder={aba === 'pautas' ? 'Buscar pautas…' : 'Buscar conteúdos…'}
          className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] py-2 pl-8 pr-3 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        />
      </label>

      <div className="flex flex-wrap gap-1.5">
        <SelectField
          ariaLabel="Filtrar por quadro"
          value={quadroId}
          onChange={setQuadroId}
          options={quadroOptions}
          className="min-h-8 t-meta"
        />
        <SelectField
          ariaLabel="Filtrar por assunto"
          value={assuntoId}
          onChange={setAssuntoId}
          options={assuntoOptions.length > 1 ? assuntoOptions : [{value: 'todos', label: 'Assunto'}]}
          className="min-h-8 t-meta"
        />
        <SelectField
          ariaLabel="Filtrar por etapa"
          value={etapa}
          onChange={value => setEtapa(value as PostItKind | 'todas')}
          options={ETAPA_OPCOES}
          className="min-h-8 t-meta"
        />
      </div>

      <div className="stack-sm">
        <ul className="stack-sm">
          {filtrados.filter(postIt => aba === 'pautas' ? !postIt.contentId : Boolean(postIt.contentId)).map(postIt => (
            <li key={postIt.id}>{renderPostIt(postIt)}</li>
          ))}
        </ul>
        {aba === 'conteudos' ? roteiros.map(content => <div key={content.id} className="stack-sm">
          {renderContent(content)}
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary" size="sm" onClick={() => onMoverContent?.(content)}>Mover para data</AppButton>
            <AppButton variant="secondary" size="xs" onClick={() => onPuxar?.(content)}>Incluir sem data</AppButton>
          </div>
        </div>) : null}
        {!filtrados.some(postIt => aba === 'pautas' ? !postIt.contentId : Boolean(postIt.contentId)) && (aba === 'pautas' || !roteiros.length) ?
          <EmptyState compact title={aba === 'pautas' ? 'Nenhuma pauta encontrada' : 'Nenhum conteúdo encontrado'} description="Altere a busca ou os filtros para ver outros itens." /> : null}
      </div>

    </Surface>
  );
}
