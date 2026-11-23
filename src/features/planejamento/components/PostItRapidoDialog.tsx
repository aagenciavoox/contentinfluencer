import {useEffect, useRef, useState} from 'react';
import {AppButton} from '../../../components/ui/AppButton';
import {PropertyDatePicker} from '../../../components/ui/PropertyDatePicker';
import {SelectField} from '../../../components/ui/SelectField';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {cn} from '../../../lib/utils';
import type {Pilar, Platform, Serie} from '../../../lib/database';
import {opcoesSerieDoPostIt} from '../lib/opcoesSerieDoPostIt';
import {escolherSerieNoPostIt, type PostItEdit} from '../lib/postIt';
import {postItRapidoPodeSalvar} from '../lib/redesPostIt';
import {RedeChips} from './RedeChips';

function rascunhoVazio(date: string | null): PostItEdit {
  return {texto: '', date, serieId: null, pilarId: null, objetivo: null, redes: []};
}

export function PostItRapidoDialog({
  open,
  date,
  initialSerieId,
  series,
  platforms = [],
  onClose,
  onSalvar,
}: {
  open: boolean;
  /** Dia clicado. Null fica fora do calendário (Sem data). */
  date: string | null;
  initialSerieId?: string | null;
  series: readonly Serie[];
  pilares?: readonly Pilar[];
  platforms?: readonly Platform[];
  onClose: () => void;
  onSalvar: (draft: PostItEdit) => void;
  onMaisOpcoes?: (draft: PostItEdit) => void;
}) {
  const [draft, setDraft] = useState<PostItEdit>(() => {
    const base = rascunhoVazio(date);
    if (initialSerieId) {
      const serie = series.find(s => s.id === initialSerieId) ?? null;
      return escolherSerieNoPostIt(base, serie, series);
    }
    return base;
  });
  // Recarregar as séries (Editorial) não pode apagar o que está sendo digitado.
  const sessao = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      sessao.current = null;
      return;
    }
    const chave = `${date ?? ''}|${initialSerieId ?? ''}`;
    const serie = initialSerieId ? series.find(s => s.id === initialSerieId) ?? null : null;
    if (sessao.current === chave) {
      setDraft(atual => {
        if (!serie || atual.serieId || atual.texto.trim() || (atual.redes?.length ?? 0) > 0) return atual;
        return escolherSerieNoPostIt(atual, serie, series);
      });
      return;
    }
    sessao.current = chave;
    const base = rascunhoVazio(date);
    setDraft(serie ? escolherSerieNoPostIt(base, serie, series) : base);
  }, [open, date, initialSerieId, series]);

  const podeSalvar = postItRapidoPodeSalvar(draft);
  const salvar = () => {
    if (!podeSalvar) return;
    onSalvar({...draft, texto: draft.texto.trim()});
  };

  const opcoesDeSerie = [
    {value: '', label: 'Sem série'},
    ...opcoesSerieDoPostIt(series, draft.serieId ?? initialSerieId).map(opcao => ({
      value: opcao.value,
      label: opcao.label ?? opcao.value,
    })),
  ];

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="max-w-lg" ariaLabel="Criar post-it">
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title="Criar post-it"
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
                <Text variant="label" as="span">
                  Pauta ou ideia
                  <span className="text-[var(--brand-accent-text)]"> *</span>
                </Text>
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
                aria-required="true"
                placeholder="Ex: Resenha rápida ou bastidores"
                className="input h-11 w-full"
              />
            </div>

            {/* Série e Data lado a lado */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div className="min-w-0">
                <label htmlFor="postit-rapido-serie" className="mb-1.5 block">
                  <Text variant="label" as="span">Série ou quadro</Text>
                </label>
                <SelectField
                  id="postit-rapido-serie"
                  block
                  ariaLabel="Série ou quadro"
                  value={draft.serieId ?? ''}
                  options={opcoesDeSerie}
                  className="min-h-11 md:min-h-11"
                  onChange={value => {
                    const serieEscolhida = series.find(s => s.id === value) ?? null;
                    setDraft(atual => escolherSerieNoPostIt(atual, serieEscolhida, series));
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Text variant="label" as="span">Data</Text>
                  {draft.date ? (
                    <button
                      type="button"
                      onClick={() => setDraft(atual => ({...atual, date: null}))}
                      className="t-meta rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      Sem data
                    </button>
                  ) : null}
                </div>
                <PropertyDatePicker
                  variant="field"
                  ariaLabel="Data do post-it"
                  placeholder="Sem data"
                  value={draft.date}
                  onChange={next => setDraft(atual => ({...atual, date: next}))}
                  className={cn(
                    'input flex h-11 items-center py-0',
                    !draft.date && 'text-[var(--text-tertiary)]',
                  )}
                />
              </div>
            </div>

            {/* Onde publicar */}
            <div className="stack-xs">
              <Text variant="label" as="span">Onde publicar</Text>
              <RedeChips
                value={draft.redes ?? []}
                onChange={redes => setDraft(atual => ({...atual, redes}))}
                platforms={platforms}
              />
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
