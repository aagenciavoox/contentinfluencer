import {useState} from 'react';
import {Plus} from 'lucide-react';
import {RichTextEditor} from '../../../../../components/editors/RichTextEditor';
import {MobileScriptEditor} from '../../../../../mobile/components/MobileScriptEditor';
import {MobileScriptReader} from '../../../../../mobile/components/MobileScriptReader';
import {htmlToReadableText} from '../../../../../lib/utils';
import {VISUAL_FORMATS} from '../../../../../constants';
import type {Content, Pilar, Serie} from '../../../../../lib/database';
import {cn} from '../../../../../lib/utils';

type ScriptDraft = {
  title: string;
  seriesId: string | null;
  pilarId: string | null;
  slotType: Content['slotType'];
  formatoVisual: string | null;
  script: string | null;
  scriptNotes: Content['scriptNotes'];
  referencias: string | null;
  notes: string | null;
};

interface RoteiroSectionProps {
  draft: ScriptDraft;
  series: Serie[];
  pilares: Pilar[];
  authorName: string;
  onChange: (updates: Partial<ScriptDraft>) => void;
  mobileComposer?: boolean;
  autoFocusScript?: boolean;
}

export function RoteiroSection({
  draft,
  series,
  pilares,
  authorName,
  onChange,
  mobileComposer = false,
  autoFocusScript = false,
}: RoteiroSectionProps) {
  const hasScript = htmlToReadableText(draft.script).trim().length > 0;
  const [mobileMode, setMobileMode] = useState<'read' | 'edit'>(autoFocusScript || !hasScript ? 'edit' : 'read');

  const sectionLabel =
    'mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]';
  const fieldClass =
    'w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30';

  const detailsFields = (
    <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className={sectionLabel}>Titulo</span>
            <input
              value={draft.title}
              onChange={event => onChange({title: event.target.value})}
              className={cn(fieldClass, 'text-base font-black')}
              placeholder="Titulo do conteudo"
            />
          </label>

          <label className="block">
            <span className={sectionLabel}>Serie</span>
            <select
              value={draft.seriesId ?? ''}
              onChange={event => onChange({seriesId: event.target.value || null})}
              className={fieldClass}
            >
              <option value="">Sem serie</option>
              {series.map(serie => (
                <option key={serie.id} value={serie.id}>
                  {serie.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={sectionLabel}>Pilar</span>
            <select
              value={draft.pilarId ?? ''}
              onChange={event => onChange({pilarId: event.target.value || null})}
              className={fieldClass}
            >
              <option value="">Sem pilar</option>
              {pilares
                .filter(pilar => pilar.ativo)
                .map(pilar => (
                  <option key={pilar.id} value={pilar.id}>
                    {pilar.nome}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className={sectionLabel}>Slot</span>
            <select
              value={draft.slotType ?? ''}
              onChange={event => onChange({slotType: (event.target.value || null) as Content['slotType']})}
              className={fieldClass}
            >
              <option value="">Sem slot</option>
              <option value="ÃšNICO">Unico</option>
              <option value="SÃ‰RIE">Serie</option>
              <option value="JANELA">Janela</option>
            </select>
          </label>

          <label className="block">
            <span className={sectionLabel}>Formato visual</span>
            <select
              value={draft.formatoVisual ?? ''}
              onChange={event => onChange({formatoVisual: event.target.value || null})}
              className={fieldClass}
            >
              <option value="">Sem formato</option>
              {VISUAL_FORMATS.map(format => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={sectionLabel}>Notas rapidas</span>
            <textarea
              value={draft.notes ?? ''}
              onChange={event => onChange({notes: event.target.value})}
              className={cn(fieldClass, 'min-h-[110px] resize-none')}
              placeholder="Observacoes editoriais"
            />
          </label>
        </div>
      </section>
  );

  const scriptEditor = (
      <section className={cn(
        'rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7',
        mobileComposer && 'border-0 bg-transparent p-0 shadow-none'
      )}>
        {!mobileComposer ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Roteiro
              </p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Escrita central do conteudo
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <Plus className="h-3.5 w-3.5" />
              Fonte de verdade
            </span>
          </div>
        ) : null}

        {mobileComposer ? (
          mobileMode === 'read' ? (
            <MobileScriptReader
              content={draft.script || ''}
              title={draft.title?.trim() || 'Roteiro'}
              onEdit={() => setMobileMode('edit')}
            />
          ) : (
            <MobileScriptEditor
              content={draft.script || ''}
              onChange={html => onChange({script: html})}
              placeholder="Abra o seu coracao e escreva o roteiro..."
              documentTitle={draft.title?.trim() || 'Novo roteiro'}
              autoFocus={autoFocusScript || mobileMode === 'edit'}
            />
          )
        ) : (
          <RichTextEditor
            content={draft.script || ''}
            onChange={html => onChange({script: html})}
            placeholder="Abra o seu coracao e escreva o roteiro..."
            authorName={authorName}
            documentTitle={draft.title?.trim() || 'Novo roteiro'}
            annotations={draft.scriptNotes || []}
            onAddAnnotation={(text, selection, comment) =>
              onChange({
                scriptNotes: [
                  ...(draft.scriptNotes || []),
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    text,
                    selection,
                    comment,
                    color: '#F5C543',
                    createdAt: new Date().toISOString(),
                  },
                ],
              })
            }
            onRemoveAnnotation={id =>
              onChange({
                scriptNotes: (draft.scriptNotes || []).filter(note => note.id !== id),
              })
            }
            onUpdateAnnotation={(id, comment, color) =>
              onChange({
                scriptNotes: (draft.scriptNotes || []).map(note =>
                  note.id === id ? {...note, comment, color} : note
                ),
              })
            }
          />
        )}
      </section>
  );

  const references = (
      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <label className="block">
          <span className={sectionLabel}>Referencias</span>
          <textarea
            value={draft.referencias ?? ''}
            onChange={event => onChange({referencias: event.target.value})}
            className={cn(fieldClass, 'min-h-[140px] resize-none')}
            placeholder="Links, observacoes, referencias e contexto do roteiro"
          />
        </label>
      </section>
  );

  if (mobileComposer) {
    return (
      <div className="grid gap-3">
        <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
          <label className="block">
            <span className={sectionLabel}>Titulo</span>
            <input
              value={draft.title}
              onChange={event => onChange({title: event.target.value})}
              className={cn(fieldClass, 'rounded-lg text-base font-black')}
              placeholder="Titulo do conteudo"
            />
          </label>
        </section>

        {mobileMode === 'edit' && hasScript ? (
          <button
            type="button"
            onClick={() => setMobileMode('read')}
            className="text-left text-[11px] font-black uppercase tracking-[0.14em] text-[var(--accent-blue)]"
          >
            Voltar para leitura
          </button>
        ) : null}

        {scriptEditor}

        <details className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
          <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Detalhes editoriais
          </summary>
          <div className="mt-4 grid gap-4">
            {detailsFields}
            {references}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {detailsFields}
      {scriptEditor}
      {references}
    </div>
  );
}
