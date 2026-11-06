import { useEffect, useState } from 'react';
import { RichTextEditor } from '../../../../components/editors/RichTextEditor';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { DestinationChips } from '../../../editorial/components/DestinationChips';
import { publicacoesDoEpisodioNaTemporada, sugestaoDoFoco, textoDaSugestaoDoFoco } from '../../../editorial/lib/focoTemporada';
import type { WritingMode } from '../../../../lib/database';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SegmentTabs } from '../../../../components/ui/SegmentTabs';
import { Text } from '../../../../components/ui/Text';
import type { ContentPlataforma, Platform } from '../../../../lib/database';
import type { RedeDoFiltro } from '../../../contas/lib/contas';
import { generateUUID } from '../../../../utils/uuid';
import type { ModoBloco } from '../../lib/seriesBulkDraft';

export type PedidoNovoConteudo = {
  id: string;
  modo: ModoBloco;
  titulo: string;
  /** HTML do editor; vazio quando nada foi colado. */
  texto: string;
  plataformas: ContentPlataforma[];
  /** Sugestão do foco de redes; ausente quando não há foco. */
  writingMode?: WritingMode;
  formatoVisual?: string | null;
  /** true: abre a pagina do conteudo; false: fica na serie. */
  abrir: boolean;
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
  contas,
  destinosPadrao,
  focoRedes,
  onClose,
  onCreate,
}: {
  open: boolean;
  /** "A Ciência Explica · Temporada 1". */
  ondeVaiFicar: string;
  contas: readonly Platform[];
  destinosPadrao: readonly string[];
  focoRedes?: readonly RedeDoFiltro[] | null;
  onClose: () => void;
  onCreate: (pedido: PedidoNovoConteudo) => void;
}) {
  const [id, setId] = useState(generateUUID);
  const [modo, setModo] = useState<ModoBloco>('ideia');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [plataformas, setPlataformas] = useState<ContentPlataforma[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setId(generateUUID());
    setModo('ideia');
    setTitulo('');
    setTexto('');
    setPlataformas(publicacoesDoEpisodioNaTemporada({
      contentId: '',
      focoRedes,
      contas,
      destinosPadrao,
    }));
    setErro(null);
  }, [contas, destinosPadrao, focoRedes, open]);

  // Enter continua criando e abrindo.
  const criar = (abrir = true) => {
    if (!titulo.trim()) {
      setErro('Dê um título ao conteúdo.');
      return;
    }
    const sugestao = sugestaoDoFoco(focoRedes);
    onCreate({
      id,
      modo,
      titulo: titulo.trim(),
      texto,
      plataformas,
      writingMode: sugestao?.writingMode,
      formatoVisual: sugestao?.formatoVisual ?? null,
      abrir,
    });
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
        <DestinationChips
          platforms={contas.filter(conta => conta.ativo)}
          publications={plataformas}
          contentId=""
          onChange={setPlataformas}
        />

        {(() => {
          const sugestao = sugestaoDoFoco(focoRedes);
          if (!sugestao) return null;
          return (
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              {textoDaSugestaoDoFoco(sugestao)}
            </Text>
          );
        })()}
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
        <AppButton variant="secondary" onClick={() => criar(false)}>Criar</AppButton>
        <AppButton variant="primary" onClick={() => criar(true)}>Criar e abrir</AppButton>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
