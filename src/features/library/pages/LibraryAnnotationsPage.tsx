import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { PAGE_SECTION } from '../../../layouts/navigation/navConfig';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { SelectField } from '../../../components/ui/SelectField';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { dia } from '../../../lib/dates';
import { MobileFilterSelect, MobileFilterSheet } from '../../../mobile/components/MobileFilterSheet';
import { MobileSearchBar } from '../../../mobile/components/MobileSearchBar';
import type { LibraryFormatFilter } from '../../analytics/lib/libraryPeriodAnalysis';
import { CARD_CLASS, FormatIcon, FormatTag, IconTile, LibraryFormatChips } from '../../analytics/components/LibraryAnalysisSections';
import { ANNOTATION_TYPES } from '../lib/annotationDraft';
import { LibrarySectionTabs } from '../components/LibrarySectionTabs';

type TipoFiltro = 'todas' | 'destaques' | (typeof ANNOTATION_TYPES)[number];

const TIPO_OPTIONS: Array<{ value: TipoFiltro; label: string }> = [
  { value: 'todas', label: 'Todos os tipos' },
  { value: 'destaques', label: 'Só destaques' },
  ...ANNOTATION_TYPES.map(tipo => ({ value: tipo, label: tipo })),
];

const POR_PAGINA = 25;

function formatDate(value: string) {
  if (Number.isNaN(new Date(value).getTime())) return '';
  return dia(value);
}

/** Todas as anotações da Biblioteca, com busca, filtros por formato/tipo/destaques e paginação progressiva. */
export function LibraryAnnotationsPage() {
  const { state } = useAppContext();
  const ready = useDomainsReady(['library']);
  const [format, setFormat] = useState<LibraryFormatFilter>('todos');
  const [tipo, setTipo] = useState<TipoFiltro>('todas');
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [filtrosMobileAbertos, setFiltrosMobileAbertos] = useState(false);

  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const activeFilterCount = Number(format !== 'todos') + Number(tipo !== 'todas');

  const notes = useMemo(() => state.bibliotecaItems
    .filter(item => !item.deletedAt && (format === 'todos' || item.tipo === format))
    .flatMap(item => item.anotacoes
      .filter(note => !note.deletedAt)
      .filter(note => {
        if (tipo === 'destaques') return Boolean(note.contentPotential);
        if (tipo !== 'todas') return note.tipo === tipo;
        return true;
      })
      .filter(note => {
        if (!termo) return true;
        return (
          note.texto.toLocaleLowerCase('pt-BR').includes(termo)
          || item.titulo.toLocaleLowerCase('pt-BR').includes(termo)
          || (note.capituloRef ?? '').toLocaleLowerCase('pt-BR').includes(termo)
        );
      })
      .map(note => ({ note, item })))
    .sort((a, b) => b.note.createdAt.localeCompare(a.note.createdAt)), [state.bibliotecaItems, format, tipo, termo]);

  const itemCount = new Set(notes.map(entry => entry.item.id)).size;
  const variosFormatos = new Set(notes.map(entry => entry.item.tipo)).size > 1;
  const visiveis = notes.slice(0, limite);
  const restantes = notes.length - visiveis.length;
  const temFiltro = Boolean(termo) || activeFilterCount > 0;

  const limparFiltros = () => {
    setFormat('todos');
    setTipo('todas');
    setBusca('');
    setLimite(POR_PAGINA);
  };

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader
          section={PAGE_SECTION.biblioteca}
          title="Anotações"
          backLabel="Biblioteca"
          backTo="/biblioteca"
        />
      )}
      navigation={<LibrarySectionTabs />}
      toolbar={(
        <PageToolbar
          search={(
            <FilterBar
              size="default"
              searchValue={busca}
              onSearchChange={valor => {
                setBusca(valor);
                setLimite(POR_PAGINA);
              }}
              searchPlaceholder="Buscar por texto, obra ou capítulo…"
            />
          )}
          chips={(
            <LibraryFormatChips
              value={format}
              onChange={next => {
                setFormat(next);
                setLimite(POR_PAGINA);
              }}
            />
          )}
          filters={(
            <SelectField
              ariaLabel="Filtrar por tipo de anotação"
              value={tipo}
              onChange={value => {
                setTipo(value as TipoFiltro);
                setLimite(POR_PAGINA);
              }}
              options={TIPO_OPTIONS}
            />
          )}
        />
      )}
      mobileHeader={(
        <div className="stack-sm">
          <LibrarySectionTabs />
          <MobileSearchBar
            value={busca}
            onChange={valor => {
              setBusca(valor);
              setLimite(POR_PAGINA);
            }}
            placeholder="Buscar texto, obra ou capítulo"
            onFilterClick={() => setFiltrosMobileAbertos(true)}
            activeFilterCount={activeFilterCount}
            filterLabel="Filtrar anotações"
          />
        </div>
      )}
    >
      <div className="stack-md">
        {!ready ? (
          <div className="stack-md" aria-busy="true">
            {['a', 'b', 'c'].map(key => <Skeleton key={key} className="h-20 w-full" />)}
          </div>
        ) : notes.length === 0 ? (
          <Surface variant="outlined" padding="lg" className={CARD_CLASS}>
            <div className="stack-sm">
              <div>
                <Text variant="bodyStrong">
                  {temFiltro ? 'Nenhuma anotação encontrada.' : 'Nenhuma anotação por aqui ainda.'}
                </Text>
                <Text variant="meta" className="mt-1 block">
                  {temFiltro
                    ? 'Tente outro termo de busca ou limpe os filtros.'
                    : 'As anotações que você registra aparecem aqui.'}
                </Text>
              </div>
              {temFiltro ? (
                <div>
                  <AppButton variant="secondary" size="sm" onClick={limparFiltros}>
                    Limpar filtros
                  </AppButton>
                </div>
              ) : null}
            </div>
          </Surface>
        ) : (
          <>
            <Text variant="meta" className="tabular-nums">
              {notes.length.toLocaleString('pt-BR')} {notes.length === 1 ? 'anotação' : 'anotações'} em {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </Text>
            <ul className="stack-sm">
              {visiveis.map(({ note, item }) => (
                <li key={note.id}>
                  <Surface variant="outlined" padding="md" className={CARD_CLASS}>
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/biblioteca/${item.id}`}
                        className="flex min-w-0 flex-1 items-center gap-2.5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <IconTile><FormatIcon tipo={item.tipo} /></IconTile>
                        <Text variant="itemTitle" as="span" className="min-w-0 flex-1 truncate text-[var(--text-primary)] hover:underline">
                          {item.titulo}
                        </Text>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {note.contentPotential ? <Badge variant="warning">Destaque</Badge> : null}
                        {variosFormatos ? <FormatTag tipo={item.tipo} /> : null}
                      </div>
                    </div>
                    <Text variant="body" as="p" className="mt-2.5 line-clamp-4 whitespace-pre-line text-[var(--text-primary)]">
                      {note.texto}
                    </Text>
                    <Text variant="meta" as="p" className="mt-2 text-[var(--text-tertiary)]">
                      {[note.tipo === 'Anotação' ? null : note.tipo, note.capituloRef, formatDate(note.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </Surface>
                </li>
              ))}
            </ul>

            {restantes > 0 ? (
              <div className="flex justify-center pt-2">
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setLimite(atual => atual + POR_PAGINA)}
                >
                  Mostrar mais {Math.min(restantes, POR_PAGINA)} de {restantes}
                </AppButton>
              </div>
            ) : null}
          </>
        )}
      </div>

      <MobileFilterSheet
        open={filtrosMobileAbertos}
        title="Filtrar anotações"
        onClose={() => setFiltrosMobileAbertos(false)}
        onClear={() => {
          limparFiltros();
          setFiltrosMobileAbertos(false);
        }}
      >
        <div className="stack-md">
          <div className="stack-xs">
            <Text variant="label" as="p" className="text-[var(--text-tertiary)]">
              Formato
            </Text>
            <LibraryFormatChips
              value={format}
              onChange={next => {
                setFormat(next);
                setLimite(POR_PAGINA);
              }}
            />
          </div>
          <MobileFilterSelect
            label="Tipo de anotação"
            value={tipo}
            onChange={value => {
              setTipo(value as TipoFiltro);
              setLimite(POR_PAGINA);
            }}
            options={TIPO_OPTIONS}
          />
        </div>
      </MobileFilterSheet>
    </PageLayout>
  );
}
