import { useEffect, useState } from 'react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { DestinationChips } from '../../../editorial/components/DestinationChips';
import {
  publicacoesDoEpisodioNaTemporada,
  ROTULO_ORIGEM_DOS_DESTINOS,
  sugestaoDoFoco,
  textoDaSugestaoDoFoco,
  type OrigemDosDestinos,
} from '../../../editorial/lib/focoTemporada';
import type { WritingMode } from '../../../../lib/database';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SegmentTabs } from '../../../../components/ui/SegmentTabs';
import { Text } from '../../../../components/ui/Text';
import type { ContentPlataforma, Platform } from '../../../../lib/database';
import type { RedeDoFiltro } from '../../../contas/lib/contas';
import { cn } from '../../../../lib/utils';
import { generateUUID } from '../../../../utils/uuid';
import type { ModoBloco } from '../../lib/seriesBulkDraft';

export type PedidoNovoConteudo = {
  id: string;
  modo: ModoBloco;
  titulo: string;
  /** Anotação ou roteiro colado. Vazio quando nada foi escrito. */
  texto: string;
  plataformas: ContentPlataforma[];
  /** Sugestão do foco de redes; ausente quando não há foco. */
  writingMode?: WritingMode;
  formatoVisual?: string | null;
  /** true: abre a pagina do conteudo; false: fica na serie. */
  abrir: boolean;
};

const inputClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Um episódio só, sem sair da série: ideia ou roteiro, título e uma anotação.
 * O editor completo fica em "Criar e abrir". Vários de uma vez ficam no "Em massa".
 */
export function NovoConteudoDialog({
  open,
  ondeVaiFicar,
  contas,
  destinosPadrao,
  focoRedes,
  destinosIniciais,
  onClose,
  onCreate,
}: {
  open: boolean;
  /** "A Ciência Explica · Temporada 1". */
  ondeVaiFicar: string;
  contas: readonly Platform[];
  destinosPadrao: readonly string[];
  focoRedes?: readonly RedeDoFiltro[] | null;
  /** Seleção inicial já resolvida (temporada → quadro → série → padrão). Continua editável. */
  destinosIniciais?: { publicacoes: ContentPlataforma[]; origem: OrigemDosDestinos } | null;
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
    setPlataformas(destinosIniciais
      ? destinosIniciais.publicacoes.map(item => ({ ...item }))
      : publicacoesDoEpisodioNaTemporada({
        contentId: '',
        focoRedes,
        contas,
        destinosPadrao,
      }));
    setErro(null);
    // A seleção inicial só é refeita ao abrir: mexer nos chips não volta ao padrão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Enter continua criando e abrindo.
  const criar = (abrir = true) => {
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo && plataformas.length === 0) {
      setErro('Escolha uma plataforma ou dê um título.');
      return;
    }
    const sugestao = sugestaoDoFoco(focoRedes);
    onCreate({
      id,
      modo,
      titulo: tituloLimpo || (modo === 'roteiro' ? 'Novo roteiro' : 'Ideia sem título'),
      texto,
      plataformas,
      writingMode: sugestao?.writingMode,
      formatoVisual: sugestao?.formatoVisual ?? null,
      abrir,
    });
  };

  const sugestao = sugestaoDoFoco(focoRedes);

  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-xl" ariaLabel="Novo episódio">
      <OverlayHeader title="Novo episódio" subtitle={`Em ${ondeVaiFicar}`} onClose={onClose} />
      <OverlayBody className="stack-md">
        <div className="stack-xs">
          <SegmentTabs<ModoBloco>
            ariaLabel="Etapa do episódio"
            value={modo}
            onChange={setModo}
            options={[
              { id: 'ideia', label: 'Ideia' },
              { id: 'roteiro', label: 'Roteiro' },
            ]}
          />
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            {modo === 'ideia'
              ? 'Entra na lista como ideia. A anotação fica nas notas.'
              : 'Entra como roteiro. Criar e abrir leva para a página de escrita.'}
          </Text>
        </div>

        <div className="stack-xs">
          <label htmlFor="novo-episodio-titulo">
            <Text variant="label" as="span">
              Título <span className="text-[var(--text-tertiary)]">· opcional</span>
            </Text>
          </label>
          <input
            id="novo-episodio-titulo"
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
            aria-describedby={erro ? 'novo-episodio-erro' : undefined}
            placeholder={modo === 'ideia' ? 'A ideia em uma frase' : 'Nome do episódio'}
            className={inputClass}
          />
          {erro ? (
            <p id="novo-episodio-erro" className="t-meta" style={{ color: 'var(--danger)' }}>{erro}</p>
          ) : null}
        </div>

        <div className="stack-xs">
          <label htmlFor="novo-episodio-texto">
            <Text variant="label" as="span">
              Texto <span className="text-[var(--text-tertiary)]">· opcional</span>
            </Text>
          </label>
          <textarea
            id="novo-episodio-texto"
            value={texto}
            onChange={event => setTexto(event.target.value)}
            rows={4}
            placeholder={modo === 'ideia' ? 'Anote ou cole a ideia…' : 'Escreva ou cole o roteiro…'}
            className={cn(inputClass, 'min-h-28 resize-y leading-relaxed')}
          />
        </div>

        <div className="stack-xs">
          <DestinationChips
            rotulo="Publicar em"
            platforms={contas.filter(conta => conta.ativo)}
            publications={plataformas}
            contentId=""
            onChange={setPlataformas}
          />
          {destinosIniciais ? (
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              {ROTULO_ORIGEM_DOS_DESTINOS[destinosIniciais.origem]}, sem data. Vale só para este episódio.
            </Text>
          ) : null}
          {sugestao ? (
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              {textoDaSugestaoDoFoco(sugestao)}
            </Text>
          ) : null}
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
