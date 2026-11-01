import { useEffect, useState } from 'react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import type { Temporada } from '../../../../lib/database';
import { acharTemporadaPorNome } from '../../../editorial/lib/temporadas';
import { textoConteudos } from '../../lib/serieAgrupamento';

export type EdicaoTemporada = { modo: 'criar' } | { modo: 'renomear'; temporada: Temporada };

const campoClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Criar, editar e excluir temporada a partir do grupo da página. Temporadas moram na série e
 * os quadros dela usam as mesmas; excluir deixa os conteúdos na série, sem temporada.
 */
export function TemporadaDialogs({
  escopoId,
  escopoNome,
  temporadas,
  edicao,
  excluir,
  contagem,
  onFecharEdicao,
  onFecharExcluir,
  onCriar,
  onRenomear,
  onExcluir,
}: {
  /** Série que guarda as temporadas. */
  escopoId: string;
  escopoNome: string;
  temporadas: readonly Temporada[];
  edicao: EdicaoTemporada | null;
  excluir: Temporada | null;
  /** Conteúdos ativos da temporada. */
  contagem: (temporadaId: string) => number;
  onFecharEdicao: () => void;
  onFecharExcluir: () => void;
  onCriar: (nome: string, descricao: string | null) => void;
  onRenomear: (temporada: Temporada, nome: string, descricao: string | null) => void;
  onExcluir: (temporada: Temporada) => void;
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (!edicao) return;
    setNome(edicao.modo === 'renomear' ? edicao.temporada.nome : '');
    setDescricao(edicao.modo === 'renomear' ? edicao.temporada.descricao || '' : '');
  }, [edicao]);

  const limpo = nome.trim();
  const descricaoLimpa = descricao.trim() || null;
  const repetida = limpo ? acharTemporadaPorNome(escopoId, limpo, temporadas) : null;
  const conflito = repetida && (edicao?.modo !== 'renomear' || repetida.id !== edicao.temporada.id);
  const podeSalvar = Boolean(limpo) && !conflito;

  const salvar = () => {
    if (!edicao || !podeSalvar) return;
    if (edicao.modo === 'criar') onCriar(limpo, descricaoLimpa);
    else onRenomear(edicao.temporada, limpo, descricaoLimpa);
    onFecharEdicao();
  };

  const quantos = excluir ? contagem(excluir.id) : 0;

  return (
    <>
      <BottomSheetModal open={Boolean(edicao)} onClose={onFecharEdicao} desktopMaxW="max-w-md">
        <OverlayHeader
          title={edicao?.modo === 'renomear' ? 'Editar temporada' : 'Nova temporada'}
          subtitle={escopoNome}
          onClose={onFecharEdicao}
        />
        <OverlayBody className="stack-md">
          <div className="stack-xs">
            <label htmlFor="temporada-nome">
              <Text variant="label" as="span">
                Nome <span className="text-[var(--brand-accent-text)]">*</span>
              </Text>
            </label>
            <input
              id="temporada-nome"
              autoFocus
              value={nome}
              onChange={event => setNome(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  salvar();
                }
              }}
              placeholder="Ex.: Especial Projetos Secretos"
              aria-invalid={conflito ? true : undefined}
              className={campoClass}
            />
            {conflito ? (
              <p className="t-meta" style={{ color: 'var(--danger)' }}>Já existe uma temporada com esse nome nesta série.</p>
            ) : null}
          </div>

          <div className="stack-xs">
            <label htmlFor="temporada-descricao">
              <Text variant="label" as="span">
                Descrição <span className="font-normal text-[var(--text-tertiary)]">· opcional</span>
              </Text>
            </label>
            <textarea
              id="temporada-descricao"
              rows={2}
              value={descricao}
              onChange={event => setDescricao(event.target.value)}
              placeholder="O que marca esta fase de episódios da série."
              className={`${campoClass} resize-y leading-relaxed`}
            />
          </div>
        </OverlayBody>
        <OverlayFooter>
          <AppButton variant="secondary" onClick={onFecharEdicao}>Cancelar</AppButton>
          <AppButton variant="primary" onClick={salvar} disabled={!podeSalvar}>
            {edicao?.modo === 'renomear' ? 'Salvar' : 'Criar temporada'}
          </AppButton>
        </OverlayFooter>
      </BottomSheetModal>

      <ConfirmModal
        open={Boolean(excluir)}
        message={excluir
          ? `Excluir a temporada “${excluir.nome}”? ${quantos === 0 ? 'Ela não tem conteúdos.' : `${textoConteudos(quantos)} ${quantos === 1 ? 'continua' : 'continuam'} na série, sem temporada.`}`
          : ''}
        confirmLabel="Excluir temporada"
        cancelLabel="Manter"
        onConfirm={() => {
          if (excluir) onExcluir(excluir);
          onFecharExcluir();
        }}
        onCancel={onFecharExcluir}
      />
    </>
  );
}
