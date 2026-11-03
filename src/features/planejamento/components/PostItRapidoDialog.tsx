import {useEffect, useState} from 'react';
import {Calendar, StickyNote} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {dia} from '../../../lib/dates';
import type {Pilar, Platform, Serie} from '../../../lib/database';
import {escolherSerieNoPostIt, type PostItEdit} from '../lib/postIt';
import {postItRapidoPodeSalvar} from '../lib/redesPostIt';
import {RedeChips} from './RedeChips';

function rascunhoVazio(date: string | null): PostItEdit {
  return {texto: '', date, serieId: null, pilarId: null, objetivo: null, redes: []};
}

export function PostItRapidoDialog({
  open,
  date,
  series,
  pilares,
  platforms = [],
  onClose,
  onSalvar,
}: {
  open: boolean;
  /** Dia clicado. Null fica fora do calendário (Sem data). */
  date: string | null;
  series: readonly Serie[];
  pilares: readonly Pilar[];
  platforms?: readonly Platform[];
  onClose: () => void;
  onSalvar: (draft: PostItEdit) => void;
  onMaisOpcoes?: (draft: PostItEdit) => void;
}) {
  const [draft, setDraft] = useState<PostItEdit>(() => rascunhoVazio(date));

  useEffect(() => {
    if (open) setDraft(rascunhoVazio(date));
  }, [open, date]);

  const podeSalvar = postItRapidoPodeSalvar(draft);
  const salvar = () => {
    if (!podeSalvar) return;
    onSalvar({...draft, texto: draft.texto.trim()});
  };

  const seriesAtivas = series.filter(s => s.ativa);
  const opcoesDeSerie = [
    {value: '', label: 'Sem série (pauta avulsa)'},
    ...seriesAtivas.map(s => ({
      value: s.id,
      label: s.name,
    })),
  ];

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="max-w-md" ariaLabel="Criar post-it">
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title="Criar post-it"
          subtitle={draft.date ? dia(draft.date) : 'Sem data definida'}
          icon={<StickyNote className="h-6 w-6 text-[var(--brand-accent-text)]" />}
          onClose={onClose}
        />
        <OverlayBody>
          <form
            id="postit-rapido"
            className="stack-md"
            onSubmit={event => {
              event.preventDefault();
              salvar();
            }}
          >
            {/* Título / Pauta */}
            <div className="stack-xs">
              <label htmlFor="postit-rapido-titulo">
                <Text variant="label" as="span">Pauta ou ideia</Text>
              </label>
              <input
                id="postit-rapido-titulo"
                type="text"
                value={draft.texto}
                onChange={event => setDraft(atual => ({...atual, texto: event.target.value}))}
                onKeyDown={event => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    salvar();
                  }
                }}
                autoFocus
                required
                placeholder="Ex: Resenha rápida ou bastidores"
                className="w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              />
            </div>

            {/* Agrupamento Editorial (Série ou Quadro) */}
            <div className="stack-xs">
              <Text variant="label" as="span" aria-hidden>Série ou quadro</Text>
              <TagSelect
                id="postit-rapido-serie"
                label="Série ou quadro"
                hideLabel
                placeholder="Sem série (cor neutra)"
                maxSelections={1}
                values={draft.serieId ? [draft.serieId] : []}
                options={opcoesDeSerie}
                onChange={values => {
                  const serieEscolhida = series.find(s => s.id === values[0]) ?? null;
                  setDraft(atual => escolherSerieNoPostIt(atual, serieEscolhida));
                }}
              />
            </div>

            {/* Conta de Destino */}
            <div className="stack-xs">
              <Text variant="label" as="span">Conta de publicação</Text>
              <RedeChips
                value={draft.redes ?? []}
                onChange={redes => setDraft(atual => ({...atual, redes}))}
                platforms={platforms}
              />
            </div>

            {/* Data e Alternar Sem Data */}
            <div className="flex items-center justify-between pt-1 t-secondary text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                {draft.date ? dia(draft.date) : 'Sem data definida'}
              </span>
              {draft.date ? (
                <button
                  type="button"
                  onClick={() => setDraft(atual => ({...atual, date: null}))}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                >
                  Mover para Sem data
                </button>
              ) : date ? (
                <button
                  type="button"
                  onClick={() => setDraft(atual => ({...atual, date}))}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                >
                  Usar data {dia(date)}
                </button>
              ) : null}
            </div>
          </form>
        </OverlayBody>
        <OverlayFooter className="justify-end gap-2">
          <AppButton variant="secondary" onClick={onClose}>
            Cancelar
          </AppButton>
          <AppButton variant="primary" type="submit" form="postit-rapido" disabled={!podeSalvar}>
            Criar post-it
          </AppButton>
        </OverlayFooter>
      </div>
    </Dialog>
  );
}
