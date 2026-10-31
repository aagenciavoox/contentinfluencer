import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { LibraryFormatFilter } from '../../analytics/lib/libraryPeriodAnalysis';
import { CARD_CLASS, FormatIcon, FormatTag, IconTile, LibraryFormatChips } from '../../analytics/components/LibraryAnalysisSections';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Todas as anotações da Biblioteca, com o item de origem, das mais recentes para as mais antigas. */
export function LibraryAnnotationsPage() {
  const { state } = useAppContext();
  const ready = useDomainsReady(['library']);
  const [format, setFormat] = useState<LibraryFormatFilter>('todos');

  const notes = useMemo(() => state.bibliotecaItems
    .filter(item => !item.deletedAt && (format === 'todos' || item.tipo === format))
    .flatMap(item => item.anotacoes
      .filter(note => !note.deletedAt)
      .map(note => ({ note, item })))
    .sort((a, b) => b.note.createdAt.localeCompare(a.note.createdAt)), [state.bibliotecaItems, format]);

  const itemCount = new Set(notes.map(entry => entry.item.id)).size;
  // O formato só ajuda a distinguir quando a lista mistura livros, filmes, séries…
  const variosFormatos = new Set(notes.map(entry => entry.item.tipo)).size > 1;

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Anotações"
          backLabel="Biblioteca"
          backTo="/biblioteca/analise"
        />
      )}
    >
      <div className="stack-lg">
        <LibraryFormatChips value={format} onChange={setFormat} />
        {!ready ? (
          <div className="stack-md" aria-busy="true">
            {['a', 'b', 'c'].map(key => <Skeleton key={key} className="h-20 w-full" />)}
          </div>
        ) : notes.length === 0 ? (
          <Surface variant="outlined" padding="lg" className={CARD_CLASS}>
            <Text variant="bodyStrong">Nenhuma anotação por aqui ainda.</Text>
            <Text variant="meta" className="mt-1 block">As anotações que você registra aparecem aqui.</Text>
          </Surface>
        ) : (
          <>
            <Text variant="meta">
              {notes.length.toLocaleString('pt-BR')} {notes.length === 1 ? 'anotação' : 'anotações'} em {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </Text>
            <ul className="stack-md">
              {notes.map(({ note, item }) => (
                <li key={note.id}>
                  <Surface variant="outlined" padding="md" className={CARD_CLASS}>
                    <Link to={`/biblioteca/${item.id}`} className="flex items-center gap-3 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                      <IconTile><FormatIcon tipo={item.tipo} /></IconTile>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)] hover:underline">{item.titulo}</span>
                      {variosFormatos ? <FormatTag tipo={item.tipo} /> : null}
                    </Link>
                    <p className="mt-3 whitespace-pre-line text-sm text-[var(--text-primary)]">{note.texto}</p>
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      {[note.tipo === 'Anotação' ? null : note.tipo, note.capituloRef, formatDate(note.createdAt)].filter(Boolean).join(' · ')}
                    </p>
                  </Surface>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PageLayout>
  );
}
