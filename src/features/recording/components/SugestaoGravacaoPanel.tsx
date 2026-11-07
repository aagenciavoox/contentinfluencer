import {useEffect, useMemo, useRef, useState} from 'react';
import {format} from 'date-fns';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {AppDataDomain, Cenario, Look} from '../../../lib/database';
import {SidePanel} from '../../../components/layout/SidePanel';
import {AppButton} from '../../../components/ui/AppButton';
import {ChoiceChips} from '../../../components/ui/ChoiceChips';
import {SelectField} from '../../../components/ui/SelectField';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {SkeletonList} from '../../../components/ui/Skeleton';
import {useHydrateContentBodies} from '../../../hooks/useHydrateContentBodies';
import {isContentBodyLoaded} from '../../contents/lib/contentBody';
import {getErrorMessage} from '../../../lib/saveFeedback';
import {generateUUID} from '../../../utils/uuid';
import {entraNoBloco, prontoParaGravar} from '../lib/blocoDeGravacao';
import {
  montarBlocoComEnergia, nomeDoLook, primeirosParaBloco, sugerirGravacao,
  type EscolhaDeGravacao, type SugestaoDeGravacao,
} from '../lib/sugestaoDeGravacao';

const DOMINIOS: readonly AppDataDomain[] = ['bootstrap', 'production', 'content', 'recording', 'planejamento'];

/** Conteúdo compartilhado pelo painel desktop/mobile, sem alterar o filtro exato da tela. */
export function SugestaoGravacaoConteudo({
  escolha, onEscolha, looks, cenarios, sugestoes, quantidade, ocupado, erro, onCriar,
}: {
  escolha: EscolhaDeGravacao;
  onEscolha: (escolha: EscolhaDeGravacao) => void;
  looks: readonly Look[];
  cenarios: readonly Cenario[];
  sugestoes: readonly SugestaoDeGravacao[];
  quantidade: number;
  ocupado: boolean;
  erro: string | null;
  onCriar: () => void;
}) {
  return (
    <div className="stack-lg">
      <fieldset disabled={ocupado} className="stack-sm">
      <Text variant="label" as="legend">Energia de hoje</Text>
      <ChoiceChips<EscolhaDeGravacao['energia']>
        label="Energia de hoje"
        value={escolha.energia}
        onChange={energia => {if (energia) onEscolha({...escolha, energia});}}
        options={[
          {value: 'baixa', label: 'Baixa'}, {value: 'média', label: 'Média'}, {value: 'alta', label: 'Alta'},
        ]}
      />
      </fieldset>
      <Text variant="secondary" as="p">Baixa inclui os leves; média inclui baixa e média; alta inclui todos. Sem energia definida aparece no fim.</Text>
      <div className="grid-form">
        <div className="stack-xs">
          <Text variant="label" as="span" id="energia-look-label">Look opcional</Text>
          <SelectField ariaLabel="Look opcional" value={escolha.lookId ?? ''} disabled={ocupado}
            onChange={lookId => onEscolha({...escolha, lookId: lookId || null})}
            options={[{value: '', label: 'Sem preferência'}, ...looks.filter(look => look.ativo).map(look => ({value: look.id, label: nomeDoLook(look)}))]} />
        </div>
        <div className="stack-xs">
          <Text variant="label" as="span">Cenário opcional</Text>
          <SelectField ariaLabel="Cenário opcional" value={escolha.cenarioId ?? ''} disabled={ocupado}
            onChange={cenarioId => onEscolha({...escolha, cenarioId: cenarioId || null})}
            options={[{value: '', label: 'Sem preferência'}, ...cenarios.filter(cenario => cenario.ativo).map(cenario => ({value: cenario.id, label: cenario.nome}))]} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AppButton variant="primary" count={quantidade || undefined} aria-busy={ocupado}
          disabled={ocupado || quantidade === 0} disabledReason="Nenhum roteiro compatível com esta escolha."
          onClick={onCriar}>Montar bloco com estes</AppButton>
      </div>
      <Text variant="secondary" as="p">O bloco usa os primeiros compatíveis com o look e o cenário. Roteiros sem look ou cenário definido também cabem.</Text>
      {erro ? <Text variant="secondary" as="p" role="alert">{erro}</Text> : null}
      {sugestoes.length === 0 ? <Text variant="body" as="p">Nenhum roteiro disponível com esta energia.</Text> : (
        <ul className="stack-sm">
          {sugestoes.map(({content, energia, motivos}) => (
            <li key={content.id}>
              <Surface variant="info" padding="sm" className="stack-xs">
                <Text variant="itemTitle" as="h3">{content.title || 'Sem título'}</Text>
                <Text variant="meta" as="p">{energia ? `Energia ${energia}` : 'Sem energia definida'}</Text>
                <Text variant="secondary" as="p">{motivos.join(' · ') || 'Disponível para gravação'}</Text>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Montado só quando acionado: carrega o contexto e os textos antes de sugerir e gravar. */
export function SugestaoGravacaoPanel({onClose, onCriado}: {onClose: () => void; onCriado: () => void}) {
  const {state, dispatch, ensureDataDomains, isDomainReady} = useAppContext();
  const {user} = useAuth();
  const [escolha, setEscolha] = useState<EscolhaDeGravacao>({energia: 'média', lookId: null, cenarioId: null});
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [hoje, setHoje] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const salvando = useRef(false);
  const blocoPendente = useRef<ReturnType<typeof montarBlocoComEnergia> | null>(null);
  const prontos = DOMINIOS.every(isDomainReady);
  useEffect(() => {
    let ativo = true;
    void ensureDataDomains(DOMINIOS).catch(() => {}).finally(() => {if (ativo) setCarregando(false);});
    return () => {ativo = false;};
  }, [ensureDataDomains]);
  // Atualiza o dia local se o painel atravessar a meia-noite, sem passar por UTC.
  useEffect(() => {
    const timer = window.setInterval(() => setHoje(format(new Date(), 'yyyy-MM-dd')), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const candidatos = state.contents.filter(content => entraNoBloco(content, state.recordingBlocks));
  const ids = useMemo(() => candidatos.map(content => content.id), [state.contents, state.recordingBlocks]);
  const {hasHydrationError, retryHydration} = useHydrateContentBodies(prontos ? ids : []);
  const semCorpo = candidatos.filter(content => !isContentBodyLoaded(content));
  const textosComErro = semCorpo.filter(content => hasHydrationError(content.id));
  const contexto = {
    contents: state.contents, blocks: state.recordingBlocks, series: state.series, postIts: state.postIts ?? [],
    settings: state.editorial, platforms: state.platforms, temporadas: state.temporadas, hoje,
  };
  const sugestoes = prontos && semCorpo.length === 0 ? sugerirGravacao({...contexto, ...escolha}) : [];
  const escolhidos = primeirosParaBloco(sugestoes, escolha, state.editorial.preferencias.limiteGravacoesDia);
  const criar = async () => {
    if (salvando.current || !prontos || !user || (escolhidos.length === 0 && !blocoPendente.current)) return;
    salvando.current = true;
    setOcupado(true);
    setErro(null);
    try {
      if (!blocoPendente.current) {
        const agora = new Date().toISOString();
        for (const content of escolhidos) {
          const pronto = prontoParaGravar(content, agora);
          if (pronto !== content) await dispatch({type: 'UPDATE_CONTENT', payload: pronto});
        }
        const montado = montarBlocoComEnergia({
          ...escolha, id: generateUUID(), userId: user.id, hoje, contents: escolhidos,
          looks: state.looks, cenarios: state.cenarios, now: agora,
        });
        blocoPendente.current = montado;
      }
      const {block, blockContents} = blocoPendente.current;
      await dispatch({type: 'ADD_RECORDING_BLOCK', payload: {...block, contents: blockContents}});
      onCriado();
      onClose();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      salvando.current = false;
      setOcupado(false);
    }
  };
  return (
    <SidePanel open title="Gravar com esta energia" onClose={() => {if (!salvando.current) onClose();}}>
      {carregando ? <SkeletonList count={3} /> : !prontos ? (
        <div className="stack-sm">
          <Text variant="body" as="p">Não foi possível carregar os dados da gravação.</Text>
          <AppButton variant="secondary" onClick={() => {
            setCarregando(true);
            void ensureDataDomains(DOMINIOS, {force: true}).catch(() => {}).finally(() => setCarregando(false));
          }}>Tentar novamente</AppButton>
        </div>
      ) : semCorpo.length > 0 && !blocoPendente.current ? (
        <div className="stack-sm">
          <Text variant="body" as="p">{textosComErro.length ? 'Não foi possível carregar alguns textos.' : 'Carregando os textos dos roteiros…'}</Text>
          {textosComErro.length > 0 ? <AppButton variant="secondary" onClick={() => textosComErro.forEach(content => retryHydration(content.id))}>Tentar novamente</AppButton> : <SkeletonList count={3} />}
        </div>
      ) : blocoPendente.current ? (
        <div className="stack-sm">
          <Text variant="body" as="p" role="alert">{erro || 'Concluindo o bloco…'}</Text>
          <AppButton variant="secondary" aria-busy={ocupado} disabled={ocupado} onClick={() => void criar()}>Tentar novamente</AppButton>
        </div>
      ) : (
        <SugestaoGravacaoConteudo escolha={escolha} onEscolha={setEscolha} looks={state.looks} cenarios={state.cenarios}
          sugestoes={sugestoes} quantidade={escolhidos.length} ocupado={ocupado || !user} erro={erro} onCriar={() => void criar()} />
      )}
    </SidePanel>
  );
}
