import { Text } from '../../../components/ui/Text';
import type { ReactNode } from 'react';
import { Ban, BookOpen, BookOpenText, Check, Clapperboard, Clock, Film, LucideIcon, MessageSquare, Tv } from 'lucide-react';
import type { BibliotecaItem } from '../../../lib/database';
import { TagSelect, type TagSelectOption } from '../../../components/ui/TagSelect';
import { cn } from '../../../lib/utils';
import { CoverUploadField } from './CoverUploadField';

type BibliotecaTipo = BibliotecaItem['tipo'];
type StatusLeitura = BibliotecaItem['status'];

const CREATE_TYPES: { tipo: BibliotecaTipo; label: string; icon: LucideIcon }[] = [
  { tipo: 'livro', label: 'Livro', icon: BookOpen },
  { tipo: 'filme', label: 'Filme', icon: Film },
  { tipo: 'série', label: 'Série', icon: Tv },
  { tipo: 'anime', label: 'Anime', icon: Clapperboard },
  { tipo: 'manga', label: 'Mangá', icon: BookOpenText },
  { tipo: 'quadrinho', label: 'Quadrinho', icon: MessageSquare },
];

const STATUS_ICONS: Partial<Record<StatusLeitura, LucideIcon>> = {
  'Quero ler': BookOpen,
  'Quero ver': BookOpen,
  'Quero consumir': BookOpen,
  Lendo: Clock,
  Assistindo: Clock,
  Consumindo: Clock,
  Lido: Check,
  Assistido: Check,
  'Concluído': Check,
  Abandonado: Ban,
};

const SELECTED = 'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-soft)] text-[var(--brand-accent-text)]';
const IDLE = 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]';

export interface LibraryCreateFormValue {
  tipo: BibliotecaTipo;
  titulo: string;
  autor: string;
  capaUrl: string;
  statusLeitura: StatusLeitura;
  generos: string[];
  tagsPersonalizadas: string[];
}

interface LibraryCreateFormProps {
  value: LibraryCreateFormValue;
  onTipoChange: (tipo: BibliotecaTipo) => void;
  onPatch: (patch: Partial<LibraryCreateFormValue>) => void;
  statusOptions: StatusLeitura[];
  genreOptions: TagSelectOption[];
  titlePlaceholder: string;
  creatorLabel: string;
  creatorPlaceholder: string;
  typeLabel: string;
}

function FieldLabel({ children, optional, htmlFor }: { children: ReactNode; optional?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block t-label text-[var(--text-primary)]">
      {children}
      {optional ? <Text variant="meta" as="span" className="ml-1.5 font-normal text-[var(--text-tertiary)]">(opcional)</Text> : null}
    </label>
  );
}

const INPUT = 'w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand-accent-strong)] focus:outline-none';

export function LibraryCreateForm({
  value,
  onTipoChange,
  onPatch,
  statusOptions,
  genreOptions,
  titlePlaceholder,
  creatorLabel,
  creatorPlaceholder,
  typeLabel,
}: LibraryCreateFormProps) {
  return (
    <div className="stack-lg">
      <div>
        <FieldLabel>Tipo de obra</FieldLabel>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3" role="radiogroup" aria-label="Tipo de obra">
          {CREATE_TYPES.map(({ tipo, label, icon: Icon }) => {
            const active = value.tipo === tipo;
            return (
              <button
                key={tipo}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onTipoChange(tipo)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border px-2 py-4 t-body-strong transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  active ? SELECTED : IDLE,
                )}
              >
                {active ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="library-create-title">Título *</FieldLabel>
          <input
            id="library-create-title"
            type="text"
            value={value.titulo}
            onChange={event => onPatch({ titulo: event.target.value })}
            placeholder={titlePlaceholder}
            autoFocus
            className={INPUT}
          />
        </div>
        <div>
          <FieldLabel htmlFor="library-create-creator">{creatorLabel}</FieldLabel>
          <input
            id="library-create-creator"
            type="text"
            value={value.autor}
            onChange={event => onPatch({ autor: event.target.value })}
            placeholder={creatorPlaceholder}
            className={INPUT}
          />
        </div>
      </div>

      <CoverUploadField
        value={value.capaUrl}
        onChange={capaUrl => onPatch({ capaUrl })}
        title={value.titulo || titlePlaceholder}
        typeLabel={typeLabel}
        appearance="create"
      />

      <div>
        <FieldLabel>Status</FieldLabel>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
          {statusOptions.map(status => {
            const active = value.statusLeitura === status;
            const Icon = STATUS_ICONS[status] ?? Check;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPatch({ statusLeitura: status })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 t-body-strong transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  active ? SELECTED : IDLE,
                )}
              >
                <Icon className="h-4 w-4" />
                {status}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <FieldLabel optional>Gêneros</FieldLabel>
        <Text variant="meta" as="p" className="mb-2 text-[var(--text-secondary)]">Selecione um ou mais gêneros.</Text>
        <TagSelect
          label="Gêneros"
          hideLabel
          values={value.generos}
          onChange={generos => onPatch({ generos })}
          options={genreOptions}
          creatable
          searchable
          placeholder="Digite e selecione gêneros"
        />
      </div>

      <div>
        <FieldLabel optional>Tags personalizadas</FieldLabel>
        <Text variant="meta" as="p" className="mb-2 text-[var(--text-secondary)]">Organize o acervo com tags próprias.</Text>
        <TagSelect
          label="Tags personalizadas"
          hideLabel
          values={value.tagsPersonalizadas}
          onChange={tagsPersonalizadas => onPatch({ tagsPersonalizadas })}
          creatable
          placeholder="Ex.: comfort read, favorito de infância…"
        />
      </div>
    </div>
  );
}
