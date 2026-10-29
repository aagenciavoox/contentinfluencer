import {useEffect, useState} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {StickyNote} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {RedeChips} from './RedeChips';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import type {Pilar, Serie} from '../../../lib/database';
import {FUNCAO_LABELS, FUNCOES, isFuncaoEditorial} from '../../editorial/lib/funcoes';
import {sortPilares} from '../../settings/lib/activePilares';
import {escolherSerieNoPostIt, type PostItEdit} from '../lib/postIt';
import {postItRapidoPodeSalvar} from '../lib/redesPostIt';

function rascunhoVazio(date: string | null): PostItEdit {
  return {texto: '', date, serieId: null, pilarId: null, objetivo: null, redes: []};
}

/**
 * Post-it rápido: nota, objetivo, série, pilar e rede. A data vem do dia clicado, sem campo.
 * "Mais opções" leva o que já foi escrito para o editor completo.
 */
export function PostItRapidoDialog({
  open,
  date,
  series,
  pilares,
  onClose,
  onSalvar,
  onMaisOpcoes,
}: {
  open: boolean;
  /** Dia clicado. Null fica fora do calendário. */
  date: string | null;
  series: readonly Serie[];
  pilares: readonly Pilar[];
  onClose: () => void;
  onSalvar: (draft: PostItEdit) => void;
  onMaisOpcoes: (draft: PostItEdit) => void;
}) {
  const [draft, setDraft] = useState<PostItEdit>(() => rascunhoVazio(date));

  useEffect(() => {
    if (open) setDraft(rascunhoVazio(date));
  }, [open, date]);

  const podeSalvar = postItRapidoPodeSalvar(draft);
  const opcoesDeSerie = [...series]
    .filter(serie => serie.ativa || serie.id === draft.serieId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(serie => ({value: serie.id, label: serie.name}));
  const opcoesDePilar = sortPilares([...pilares])
    .filter(pilar => pilar.ativo || pilar.id === draft.pilarId)
    .map(pilar => ({value: pilar.id, label: pilar.nome}));

  const salvar = () => {
    if (!podeSalvar) return;
    onSalvar({...draft, texto: draft.texto.trim()});
  };

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="max-w-md" ariaLabel="Novo post-it">
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title="Novo post-it"
          subtitle={date ? format(new Date(`${date}T12:00:00`), "d 'de' MMMM", {locale: ptBR}) : 'Sem data'}
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
            <label className="stack-sm">
              <Text variant="label" as="span">Nota</Text>
              <textarea
                value={draft.texto}
                onChange={event => setDraft(atual => ({...atual, texto: event.target.value}))}
                onKeyDown={event => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    salvar();
                  }
                }}
                rows={3}
                autoFocus
                required
                placeholder="O que vai entrar aqui?"
                className="w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              />
            </label>
            <TagSelect
              id="postit-rapido-objetivo"
              label="Objetivo"
              placeholder="Sem objetivo"
              maxSelections={1}
              values={draft.objetivo ? [draft.objetivo] : []}
              options={FUNCOES.map(funcao => ({value: funcao, label: FUNCAO_LABELS[funcao]}))}
              onChange={values => setDraft(atual => ({
                ...atual,
                objetivo: isFuncaoEditorial(values[0]) ? values[0] : null,
              }))}
            />
            <TagSelect
              id="postit-rapido-serie"
              label="Série"
              placeholder="Sem série"
              searchable
              maxSelections={1}
              values={draft.serieId ? [draft.serieId] : []}
              options={opcoesDeSerie}
              onChange={values => setDraft(atual => escolherSerieNoPostIt(
                atual,
                series.find(serie => serie.id === values[0]) ?? null,
              ))}
            />
            <TagSelect
              id="postit-rapido-pilar"
              label="Pilar"
              placeholder="Sem pilar"
              maxSelections={1}
              values={draft.pilarId ? [draft.pilarId] : []}
              options={opcoesDePilar}
              onChange={values => setDraft(atual => ({...atual, pilarId: values[0] ?? null}))}
            />
            <div className="stack-sm">
              <Text variant="label" as="span">Rede</Text>
              <RedeChips value={draft.redes ?? []} onChange={redes => setDraft(atual => ({...atual, redes}))} />
            </div>
          </form>
        </OverlayBody>
        <OverlayFooter className="justify-between">
          <AppButton variant="ghost" onClick={() => onMaisOpcoes({...draft, texto: draft.texto.trim()})}>
            Mais opções
          </AppButton>
          <AppButton variant="primary" type="submit" form="postit-rapido" disabled={!podeSalvar}>
            Salvar post-it
          </AppButton>
        </OverlayFooter>
      </div>
    </Dialog>
  );
}
