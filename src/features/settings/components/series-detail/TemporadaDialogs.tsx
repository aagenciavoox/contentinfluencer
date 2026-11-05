import { useEffect, useState } from 'react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Platform, Temporada } from '../../../../lib/database';
import type { RedeDoFiltro } from '../../../contas/lib/contas';
import { acharTemporadaPorNome } from '../../../editorial/lib/temporadas';
import { RedeChips } from '../../../planejamento/components/RedeChips';
import { normalizarRedesPostIt } from '../../../planejamento/lib/redesPostIt';
import { textoConteudos } from '../../lib/serieAgrupamento';
import { ROTULO_STATUS, STATUS_SERIE, statusDaOnda, textoDaAtivacao, type StatusSerie } from '../../lib/statusSerie';

export type EdicaoTemporada = { modo: 'criar' } | { modo: 'renomear'; temporada: Temporada };

const campoClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Criar, editar e excluir temporada a partir do grupo da página. Temporadas moram na série e
 * os quadros dela usam as mesmas. O foco de redes é opcional: sem ele, a temporada só agrupa.
 */
export function TemporadaDialogs({
  escopoId,
  escopoNome,
  temporadas,
  plataformas,
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
  plataformas: readonly Platform[];
  edicao: EdicaoTemporada | null;
  excluir: Temporada | null;
  /** Conteúdos ativos da temporada. */
  contagem: (temporadaId: string) => number;
  onFecharEdicao: () => void;
  onFecharExcluir: () => void;
  onCriar: (nome: string, descricao: string | null, focoRedes: RedeDoFiltro[], status: StatusSerie) => void;
  onRenomear: (temporada: Temporada, nome: string, descricao: string | null, focoRedes: RedeDoFiltro[], status: StatusSerie) => void;
  onExcluir: (temporada: Temporada) => void;
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [redes, setRedes] = useState<RedeDoFiltro[]>([]);
  const [status, setStatus] = useState<StatusSerie>('ativa');

  useEffect(() => {
    if (!edicao) return;
    setNome(edicao.modo === 'renomear' ? edicao.temporada.nome : '');
    setDescricao(edicao.modo === 'renomear' ? edicao.temporada.descricao || '' : '');
    setRedes(normalizarRedesPostIt(edicao.modo === 'renomear' ? edicao.temporada.focoRedes ?? [] : []));
    setStatus(edicao.modo === 'renomear' ? statusDaOnda(edicao.temporada) : 'ativa');
  }, [edicao]);

  const limpo = nome.trim();
  const descricaoLimpa = descricao.trim() || null;
  const foco = normalizarRedesPostIt(redes);
  const repetida = limpo ? acharTemporadaPorNome(escopoId, limpo, temporadas) : null;
  const conflito = repetida && (edicao?.modo !== 'renomear' || repetida.id !== edicao.temporada.id);
  const podeSalvar = Boolean(limpo) && !conflito;

  const salvar = () => {
    if (!edicao || !podeSalvar) return;
    if (edicao.modo === 'criar') onCriar(limpo, descricaoLimpa, foco, status);
    else onRenomear(edicao.temporada, limpo, descricaoLimpa, foco, status);
    onFecharEdicao();
  };

  // Wave que sai do rascunho (ou do arquivo): avisa quanto vai pedir por semana neste mês.
  const avisoAtivacao = edicao?.modo === 'renomear' && status === 'ativa' && statusDaOnda(edicao.temporada) !== 'ativa'
    ? textoDaAtivacao({
      name: limpo || edicao.temporada.nome,
      frequenciaVezes: edicao.temporada.frequenciaVezes ?? null,
      frequenciaUnidade: edicao.temporada.frequenciaUnidade ?? null,
    })
    : null;

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
              placeholder="Ex.: Redes curtas, ou YouTube · Temporada 1"
              aria-invalid={conflito ? true : undefined}
              className={campoClass}
            />
            {conflito ? (
              <p className="t-meta" style={{ color: 'var(--danger)' }}>Já existe uma temporada com esse nome nesta série.</p>
            ) : null}
          </div>

          <div className="stack-xs">
            <Text variant="label" as="p" id="temporada-redes-rotulo">
              Redes <span className="font-normal text-[var(--text-tertiary)]">· opcional</span>
            </Text>
            <RedeChips value={redes} onChange={setRedes} platforms={plataformas} />
            <Text variant="meta" as="p">
              Sem redes, a temporada só agrupa episódios de qualquer quadro, sem ordem. Com redes, os episódios novos já nascem nelas — por exemplo Instagram, TikTok e Shorts numa, e só YouTube longo em outra.
            </Text>
          </div>

          <div className="stack-xs">
            <label htmlFor="temporada-status">
              <Text variant="label" as="span">Status</Text>
            </label>
            <SelectField
              id="temporada-status"
              block
              value={status}
              describedBy="temporada-status-hint"
              onChange={valor => setStatus(STATUS_SERIE.includes(valor as StatusSerie) ? valor as StatusSerie : 'ativa')}
              options={STATUS_SERIE.map(valor => ({ value: valor, label: ROTULO_STATUS[valor] }))}
            />
            <Text variant="meta" as="p" id="temporada-status-hint">
              {avisoAtivacao ?? 'Em rascunho, a wave organiza episódios sem entrar na Saúde nem na conta da série.'}
            </Text>
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
