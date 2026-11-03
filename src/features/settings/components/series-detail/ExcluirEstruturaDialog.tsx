import { useEffect, useMemo, useState } from 'react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import type { Serie, Temporada } from '../../../../lib/database';
import {
  bloqueioAoExcluirQuadro,
  destinosAoExcluirQuadro,
  destinosAoExcluirTemporada,
  episodiosDaTemporada,
  episodiosDoQuadro,
  planoAoExcluirQuadro,
  planoAoExcluirTemporada,
} from '../../lib/estruturaSerie';
import { colunaDeOrdemDisponivel } from '../../lib/seriesLista';
import { textoQuantidade } from '../../lib/selecaoEpisodios';

export type AlvoExclusao =
  | { tipo: 'quadro'; quadro: Serie; serieId: string }
  | { tipo: 'temporada'; temporada: Temporada };

const SEM = '__sem__';
const episodios = (n: number) => textoQuantidade(n, 'episódio', 'episódios');

/**
 * Excluir quadro ou temporada sem apagar roteiro: primeiro os episódios vão para o destino escolhido
 * (mover_episodios, tudo ou nada); só depois de dar certo o quadro ou a temporada é excluído.
 */
export function ExcluirEstruturaDialog({ alvo, onClose }: { alvo: AlvoExclusao | null; onClose: () => void }) {
  const { state, dispatch } = useAppContext();
  const [destino, setDestino] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const nome = alvo?.tipo === 'quadro' ? alvo.quadro.name?.trim() || 'Sem nome' : alvo?.temporada.nome ?? '';
  const bloqueio = alvo?.tipo === 'quadro' ? bloqueioAoExcluirQuadro(alvo.quadro.id, state.series) : null;
  const quantos = !alvo ? 0 : alvo.tipo === 'quadro'
    ? episodiosDoQuadro(alvo.quadro.id, state.contents).length
    : episodiosDaTemporada(alvo.temporada.id, state.contents).length;
  const destinos = useMemo(() => {
    if (!alvo) return [];
    return alvo.tipo === 'quadro'
      ? destinosAoExcluirQuadro(alvo.quadro.id, alvo.serieId, state.series)
      : destinosAoExcluirTemporada(alvo.temporada, state.temporadas).map(item => ({ id: item.id ?? SEM, label: item.label }));
  }, [alvo, state.series, state.temporadas]);

  useEffect(() => {
    if (!alvo) return;
    setErro(null);
    setSalvando(false);
    setDestino(destinos[0]?.id ?? '');
    // Só ao abrir para outro alvo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo]);

  const plano = useMemo(() => {
    if (!alvo || quantos === 0 || !destino) return null;
    const agora = new Date().toISOString();
    return alvo.tipo === 'quadro'
      ? planoAoExcluirQuadro({
        quadroId: alvo.quadro.id,
        destinoId: destino,
        serieId: alvo.serieId,
        series: state.series,
        temporadas: state.temporadas,
        contents: state.contents,
        agora,
        comOrdem: colunaDeOrdemDisponivel(state.contents),
      })
      : planoAoExcluirTemporada({ temporadaId: alvo.temporada.id, destinoId: destino === SEM ? null : destino, contents: state.contents, agora });
  }, [alvo, destino, quantos, state.contents, state.series, state.temporadas]);

  const fechar = () => { if (!salvando) onClose(); };

  const confirmar = async () => {
    if (!alvo || salvando || bloqueio) return;
    setSalvando(true);
    setErro(null);
    if (plano && plano.conteudos.length > 0) {
      try {
        await dispatch({ type: 'MOVER_EPISODIOS', payload: { conteudos: plano.conteudos, ordem: plano.ordem } }, { silent: true });
      } catch {
        setErro('Não foi possível mover os episódios. Nada foi excluído; tente de novo.');
        setSalvando(false);
        return;
      }
    }
    try {
      await dispatch(alvo.tipo === 'quadro'
        ? { type: 'DELETE_SERIE', payload: alvo.quadro.id }
        : { type: 'DELETE_TEMPORADA', payload: alvo.temporada.id });
      setSalvando(false);
      onClose();
    } catch {
      setErro(quantos > 0
        ? 'Os episódios já foram movidos, mas não foi possível excluir. Tente excluir de novo.'
        : 'Não foi possível excluir. Tente de novo.');
      setSalvando(false);
    }
  };

  const titulo = alvo?.tipo === 'quadro' ? 'Excluir quadro' : 'Excluir temporada';
  const nomeDestino = destinos.find(item => item.id === destino)?.label ?? '';

  return (
    <BottomSheetModal open={Boolean(alvo)} onClose={fechar} desktopMaxW="max-w-md" ariaLabel={titulo}>
      <OverlayHeader title={titulo} subtitle={nome} onClose={fechar} />
      <OverlayBody className="stack-md">
        {bloqueio ? (
          <Text variant="body" as="p" role="alert">{bloqueio}</Text>
        ) : quantos === 0 ? (
          <Text variant="body" as="p">{`Excluir “${nome}”? Não há episódios aqui.`}</Text>
        ) : (
          <>
            <Text variant="body" as="p">
              {`“${nome}” tem ${episodios(quantos)}. Nenhum roteiro é apagado: escolha para onde ${quantos === 1 ? 'ele vai' : 'eles vão'} antes de excluir.`}
            </Text>
            <div className="stack-xs">
              <Text variant="label" as="p">Mover para</Text>
              <SelectField ariaLabel="Mover para" value={destino} onChange={setDestino} options={destinos.map(item => ({ value: item.id, label: item.label }))} block />
            </div>
            {plano && plano.perdemTemporada > 0 ? (
              <Text variant="meta" as="p" role="alert">
                {`Atenção: ${episodios(plano.perdemTemporada)} ${plano.perdemTemporada === 1 ? 'vai sair da temporada' : 'vão sair da temporada'}, porque ela não vale em ${nomeDestino}.`}
              </Text>
            ) : null}
            {alvo?.tipo === 'quadro' ? (
              <Text variant="meta" as="p">Roteiro, legendas, contas, datas e etapa não mudam. Pilar e objetivo escolhidos à mão continuam; os herdados passam a vir do destino.</Text>
            ) : null}
          </>
        )}
        {erro ? <Text variant="meta" as="p" role="alert">{erro}</Text> : null}
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={fechar} disabled={salvando}>{bloqueio ? 'Fechar' : 'Cancelar'}</AppButton>
        {bloqueio ? null : (
          <AppButton variant="primary" onClick={() => void confirmar()} disabled={salvando || (quantos > 0 && !destino)} aria-busy={salvando}>
            {salvando ? 'Excluindo…' : quantos > 0 ? `Mover e excluir` : titulo}
          </AppButton>
        )}
      </OverlayFooter>
    </BottomSheetModal>
  );
}
