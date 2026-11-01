import { useEffect, useState } from 'react';
import { RichTextEditor } from '../../../../components/editors/RichTextEditor';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SegmentTabs } from '../../../../components/ui/SegmentTabs';
import { Text } from '../../../../components/ui/Text';
import { generateUUID } from '../../../../utils/uuid';
import type { ModoBloco } from '../../lib/seriesBulkDraft';

export type PedidoNovoConteudo = {
  id: string;
  modo: ModoBloco;
  titulo: string;
  /** HTML do editor; vazio quando nada foi colado. */
  texto: string;
};

const inputClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Um conteúdo só, sem sair da série: ideia ou roteiro, título e o texto colado.
 * Criar já abre a página do conteúdo; vários de uma vez ficam no "Em massa".
 */
export function NovoConteudoDialog({
  open,
  ondeVaiFicar,
  onClose,
  onCreate,
}: {
  open: boolean;
  /** "A Ciência Explica · Temporada 1". */
  ondeVaiFicar: string;
  onClose: () => void;
  onCreate: (pedido: PedidoNovoConteudo) => void;
}) {
  const [id, setId] = useState(generateUUID);
  const [modo, setModo] = useState<ModoBloco>('ideia');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setId(generateUUID());
    setModo('ideia');
    setTitulo('');
    setTexto('');
    setErro(null);
  }, [open]);

  const criar = () => {
    if (!titulo.trim()) {
      setErro('Dê um título ao conteúdo.');
      return;
    }
    onCreate({ id, modo, titulo: titulo.trim(), texto });
  };

  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-xl" ariaLabel="Novo conteúdo">
      <OverlayHeader title="Novo conteúdo" subtitle={`Em ${ondeVaiFicar}`} onClose={onClose} />
      <OverlayBody className="stack-md">
        <SegmentTabs<ModoBloco>
          ariaLabel="Tipo do conteúdo"
          value={modo}
          onChange={setModo}
          options={[
            { id: 'ideia', label: 'Ideia' },
            { id: 'roteiro', label: 'Roteiro' },
          ]}
        />
        <div className="stack-xs">
          <label htmlFor="novo-conteudo-titulo">
            <Text variant="label" as="span">
              Título <span className="text-[var(--brand-accent-text)]">*</span>
            </Text>
          </label>
          <input
            id="novo-conteudo-titulo"
            autoFocus
            value={titulo}
            onChange={event => {
              setTitulo(event.target.value);
              if (erro) setErro(null);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                criar();
              }
            }}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? 'novo-conteudo-erro' : undefined}
            className={inputClass}
          />
          {erro ? (
            <p id="novo-conteudo-erro" className="t-meta" style={{ color: 'var(--danger)' }}>{erro}</p>
          ) : null}
        </div>
        <div className="stack-xs">
          <Text variant="label" as="p">Texto <span className="text-[var(--text-tertiary)]">· opcional</span></Text>
          <RichTextEditor
            documentId={id}
            content={texto}
            onChange={setTexto}
            formatBar="writing"
            meter="none"
            placeholder={modo === 'ideia' ? 'Anote ou cole a ideia…' : 'Escreva ou cole o roteiro…'}
            editorViewportClassName="max-h-72 min-h-28"
          />
        </div>
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>Cancelar</AppButton>
        <AppButton variant="primary" onClick={criar}>Criar e abrir</AppButton>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
