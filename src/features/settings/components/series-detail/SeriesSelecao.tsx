import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Check, Minus, X } from 'lucide-react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { filhosDaSerie } from '../../../editorial/lib/serieArvore';
import { escopoTemporadas, temporadasDoEscopo } from '../../../editorial/lib/temporadas';
import { plural } from '../../lib/serieAgrupamento';
import type { DestinoMover } from '../../lib/seriesGrupos';

/**
 * Barra da seleção da página da série. Fica presa ao pé da tela enquanto a lista rola
 * (acima da barra inferior no celular), como a da Criação.
 */
export function SeriesSelectionBar({
  quantidade,
  disponiveis,
  onToggleTodos,
  onMover,
  onCancelar,
}: {
  quantidade: number;
  disponiveis: number;
  onToggleTodos: () => void;
  onMover: () => void;
  onCancelar: () => void;
}) {
  const todos = disponiveis > 0 && quantidade === disponiveis;
  const parte = quantidade > 0 && !todos;
  return (
    <div
      className={cn(
        'sticky z-30',
        // Mesma conta da CreationSelectionBar: altura da barra inferior do celular + respiro.
        'bottom-[calc(3.5rem+1px+max(0.25rem,env(safe-area-inset-bottom,0px))+var(--space-sm))]',
        'lg:bottom-[var(--space-lg)]',
      )}
    >
      <section
        aria-label="Seleção"
        className={cn(
          // No celular: título e X em cima, botões embaixo; do `md:` em diante, tudo numa linha.
          'mx-auto flex w-full flex-wrap items-center gap-2 p-2 pl-4',
          'rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-dropdown)]',
          'md:w-fit md:max-w-full md:flex-nowrap md:gap-3',
        )}
      >
        <p className="t-item-title min-w-0 flex-1 truncate text-[var(--text-primary)] md:flex-none" aria-live="polite">
          {quantidade === 0 ? 'Nenhum selecionado' : plural(quantidade, 'selecionado', 'selecionados')}
        </p>
        <AppButton
          variant="ghost"
          size="sm"
          iconOnly
          className="md:order-last"
          aria-label="Cancelar seleção"
          title="Cancelar seleção"
          onClick={onCancelar}
        >
          <X className="h-4 w-4" />
        </AppButton>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <AppButton
            variant="secondary"
            size="sm"
            className="flex-1 px-3 md:flex-none"
            role="checkbox"
            aria-checked={todos ? true : parte ? 'mixed' : false}
            aria-label={`Selecionar todos (${disponiveis})`}
            leftIcon={(
              <span
                aria-hidden
                className={cn(
                  'inline-flex h-4 w-4 items-center justify-center rounded-[calc(var(--radius-sm)/2)] border transition-colors',
                  quantidade === 0
                    ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]',
                )}
              >
                {todos ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
                {parte ? <Minus className="h-3 w-3 stroke-[3px]" /> : null}
              </span>
            )}
            onClick={onToggleTodos}
          >
            Todos ({disponiveis})
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            className="flex-1 md:flex-none"
            leftIcon={<ArrowRightLeft className="h-4 w-4" />}
            disabled={quantidade === 0}
            onClick={onMover}
          >
            Mover para…
          </AppButton>
        </div>
      </section>
    </div>
  );
}

const MANTER = 'manter';
const SEM_TEMPORADA = 'nenhuma';

/** O próprio agrupamento e os de dentro dele, com o caminho no nome ("Série › Quadro"). */
function destinosDaPagina(serie: Serie, tipo: SerieTipoAgrupamento, series: readonly Serie[]) {
  const proprio = {
    value: serie.id,
    label: tipo === 'familia' ? 'Direto na família' : tipo === 'serie' ? 'Direto na série' : serie.name.trim() || 'Sem nome',
  };
  const descer = (paiId: string, prefixo: string): Array<{ value: string; label: string }> =>
    filhosDaSerie(paiId, series).flatMap(filho => {
      const nome = `${prefixo}${filho.name?.trim() || 'Sem nome'}`;
      return [{ value: filho.id, label: nome }, ...descer(filho.id, `${nome} › `)];
    });
  return [proprio, ...descer(serie.id, '')];
}

/** Para onde vão os selecionados: quadro e/ou temporada. Quem já está lá não muda. */
export function MoverConteudosSheet({
  open,
  quantidade,
  serie,
  tipo,
  series,
  temporadas,
  onClose,
  onMover,
}: {
  open: boolean;
  quantidade: number;
  serie: Serie;
  tipo: SerieTipoAgrupamento;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  onClose: () => void;
  onMover: (destino: DestinoMover) => void;
}) {
  const [quadro, setQuadro] = useState(MANTER);
  const [temporada, setTemporada] = useState(MANTER);

  useEffect(() => {
    if (!open) return;
    setQuadro(MANTER);
    setTemporada(MANTER);
  }, [open]);

  const destinos = useMemo(() => destinosDaPagina(serie, tipo, series), [serie, series, tipo]);
  const temporadasDoDestino = useMemo(() => {
    const escopo = escopoTemporadas(quadro === MANTER ? serie.id : quadro, series);
    return escopo ? temporadasDoEscopo(escopo.id, temporadas) : null;
  }, [quadro, serie.id, series, temporadas]);

  // A temporada escolhida pode não existir no escopo do novo destino.
  useEffect(() => {
    if (temporada === MANTER || temporada === SEM_TEMPORADA) return;
    if (!temporadasDoDestino?.some(item => item.id === temporada)) setTemporada(MANTER);
  }, [temporada, temporadasDoDestino]);

  const nomeDoNivel = tipo === 'familia' ? 'Série' : 'Quadro';
  const mostraQuadro = destinos.length > 1;
  const nada = quadro === MANTER && temporada === MANTER;

  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-md" ariaLabel="Mover conteúdos">
      <OverlayHeader title={`Mover ${plural(quantidade, 'conteúdo', 'conteúdos')}`} subtitle={serie.name} onClose={onClose} />
      <OverlayBody className="stack-md">
        {mostraQuadro ? (
          <div className="stack-xs">
            <Text variant="label" as="p">{nomeDoNivel}</Text>
            <SelectField
              ariaLabel={nomeDoNivel}
              value={quadro}
              onChange={setQuadro}
              options={[{ value: MANTER, label: 'Manter onde cada um está' }, ...destinos]}
            />
          </div>
        ) : null}
        {temporadasDoDestino ? (
          <div className="stack-xs">
            <Text variant="label" as="p">Temporada</Text>
            <SelectField
              ariaLabel="Temporada"
              value={temporada}
              onChange={setTemporada}
              options={[
                { value: MANTER, label: 'Manter a de cada um' },
                ...temporadasDoDestino.map(item => ({ value: item.id, label: item.nome })),
                { value: SEM_TEMPORADA, label: 'Sem temporada' },
              ]}
            />
          </div>
        ) : null}
        {!mostraQuadro && !temporadasDoDestino ? (
          <Text variant="secondary">Este agrupamento não tem quadros nem temporadas para onde mover.</Text>
        ) : (
          <Text variant="meta" as="p">
            O pilar e o objetivo escolhidos à mão continuam; o que vinha da série passa a vir do destino. As redes marcadas não mudam.
          </Text>
        )}
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>Cancelar</AppButton>
        <AppButton
          variant="primary"
          disabled={nada}
          onClick={() => onMover({ serieId: quadro === MANTER ? null : quadro, temporada })}
        >
          Mover
        </AppButton>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
