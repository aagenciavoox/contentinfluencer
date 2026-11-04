import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {CheckCircle2, Clapperboard, Loader2} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {Surface} from '../../../components/ui/Surface';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {Content, RecordingBlock} from '../../../lib/database';
import {fetchContentsByIds} from '../../../lib/database';
import {getErrorMessage} from '../../../lib/saveFeedback';
import {generateUUID} from '../../../utils/uuid';
import {isContentBodyLoaded, upsertContents} from '../../contents/lib/contentBody';
import {normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {
  ROTULO_FORA_DO_BLOCO,
  montarBlocoDeGravacao,
  motivoForaDoBloco,
  prontoParaGravar,
} from '../../recording/lib/blocoDeGravacao';
import {addBlockContent, getOrderedBlockContents, normalizeRecordingTags} from '../../recording/lib/recordingWorkflow';

type Resultado = {blockId: string; nome: string; entraram: number; ficaramSemTexto: string[]};

/**
 * Cria um bloco de gravação (ou completa um existente) com os roteiros escolhidos no Planejamento.
 * Roteiro com texto sobe para Produção ao entrar, como no "Mandar para gravação" do roteiro.
 */
export function CriarBlocoDialog({
  open,
  contents,
  onClose,
  onCriado,
}: {
  open: boolean;
  /** Conteúdos candidatos, na ordem em que devem entrar no bloco. */
  contents: readonly Content[];
  onClose: () => void;
  /** Chamado quando os roteiros entraram num bloco (novo ou existente). */
  onCriado?: () => void;
}) {
  const {state, dispatch, ensureDataDomains} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;

  const [nome, setNome] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [blocoId, setBlocoId] = useState('');
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [blocosCarregando, setBlocosCarregando] = useState(false);

  useEffect(() => {
    if (!open) {
      setNome('');
      setTags([]);
      setBlocoId('');
      setDesmarcados(new Set());
      setOcupado(false);
      setErro(null);
      setResultado(null);
      return;
    }
    let cancelado = false;
    setBlocosCarregando(true);
    void ensureDataDomains(['recording']).finally(() => {
      if (!cancelado) setBlocosCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [open, ensureDataDomains]);

  const linhas = useMemo(
    () => contents.map(content => ({content, motivo: motivoForaDoBloco(content, state.recordingBlocks)})),
    [contents, state.recordingBlocks],
  );
  const elegiveis = linhas.filter(linha => linha.motivo === null).map(linha => linha.content);
  const escolhidos = elegiveis.filter(content => !desmarcados.has(content.id));
  const tagsSugeridas = useMemo(
    () => normalizeRecordingTags(escolhidos.flatMap(content => content.tags || [])).map(tag => ({value: tag, label: tag})),
    [escolhidos],
  );
  const blocosDisponiveis = state.recordingBlocks;
  const podeCriar = escolhidos.length > 0 && (blocoId ? true : nome.trim().length > 0);

  const alternar = (id: string) => setDesmarcados(atual => {
    const proximo = new Set(atual);
    if (proximo.has(id)) proximo.delete(id);
    else proximo.add(id);
    return proximo;
  });

  const criar = async () => {
    if (ocupado || !podeCriar || !user) return;
    setErro(null);
    setOcupado(true);
    try {
      // O calendário carrega o select leve: busca o corpo para saber se o roteiro tem texto.
      const semCorpo = escolhidos.filter(content => !isContentBodyLoaded(content)).map(content => content.id);
      let completos = escolhidos;
      if (semCorpo.length > 0) {
        const buscados = await fetchContentsByIds(user.id, semCorpo);
        const porId = new Map(buscados.map(content => [content.id, content]));
        completos = escolhidos.map(content => porId.get(content.id) ?? content);
        if (buscados.length > 0) {
          await dispatch({type: 'SET_DATA', payload: {contents: upsertContents(contentsRef.current, buscados)}});
        }
      }
      const entram = completos.filter(content => motivoForaDoBloco(content, state.recordingBlocks) === null);
      const ficaramSemTexto = completos
        .filter(content => !entram.includes(content))
        .map(content => content.title?.trim() || 'Sem título');
      if (entram.length === 0) {
        setErro('Nenhum dos escolhidos tem texto para gravar ainda.');
        return;
      }

      const agora = new Date().toISOString();
      for (const content of entram) {
        const pronto = prontoParaGravar(content, agora);
        if (pronto !== content) await dispatch({type: 'UPDATE_CONTENT', payload: pronto});
      }

      if (blocoId) {
        const bloco = blocosDisponiveis.find(item => item.id === blocoId);
        if (!bloco) {
          setErro('Esse bloco ainda não carregou. Espere um instante e tente de novo.');
          return;
        }
        let linhasDoBloco = getOrderedBlockContents(bloco);
        for (const content of entram) linhasDoBloco = addBlockContent(linhasDoBloco, bloco.id, content);
        await dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: bloco.id, contents: linhasDoBloco}});
        setResultado({blockId: bloco.id, nome: bloco.name, entraram: entram.length, ficaramSemTexto});
        onCriado?.();
        return;
      }

      const {block, blockContents} = montarBlocoDeGravacao({
        id: generateUUID(),
        userId: user.id,
        nome,
        tags,
        contents: entram,
        now: agora,
      });
      await dispatch({type: 'ADD_RECORDING_BLOCK', payload: block});
      await dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: block.id, contents: blockContents}});
      setResultado({blockId: block.id, nome: block.name, entraram: entram.length, ficaramSemTexto});
      onCriado?.();
    } catch (error) {
      setErro(getErrorMessage(error));
    } finally {
      setOcupado(false);
    }
  };

  const fechar = () => {
    if (ocupado) return;
    onClose();
  };

  const verBloco = () => {
    if (!resultado) return;
    onClose();
    navigate(`/gravacao/${resultado.blockId}?tab=blocks`);
  };

  const rotuloDoBloco = (bloco: RecordingBlock) => `${bloco.name}${bloco.contents.length > 0 ? ` · ${bloco.contents.length}` : ''}`;

  return (
    <Dialog open={open} onClose={fechar} desktopMaxW="max-w-lg" zIndex="z-[140]" ariaLabel="Bloco de gravação">
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title={resultado ? 'Bloco pronto' : 'Mandar para gravação'}
          subtitle={resultado
            ? undefined
            : 'Crie um bloco novo ou complete um existente. Roteiro com texto passa para Produção.'}
          icon={<Clapperboard className="h-6 w-6 text-[var(--brand-accent-text)]" />}
          onClose={fechar}
        />
        <OverlayBody>
          {resultado ? (
            <div className="stack-md">
              <Surface variant="info" padding="md" className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-green)]" aria-hidden />
                <div className="stack-xs">
                  <Text variant="itemTitle" as="p">
                    {resultado.entraram === 1 ? '1 roteiro' : `${resultado.entraram} roteiros`} no bloco “{resultado.nome}”
                  </Text>
                  {resultado.ficaramSemTexto.length > 0 ? (
                    <Text variant="secondary" className="text-[var(--text-secondary)]">
                      Ficaram de fora por não terem texto: {resultado.ficaramSemTexto.join(', ')}.
                    </Text>
                  ) : null}
                </div>
              </Surface>
            </div>
          ) : (
            <div className="stack-lg">
              <section className="stack-xs" aria-labelledby="bloco-roteiros">
                <Text variant="label" as="h3" id="bloco-roteiros" className="text-[var(--text-secondary)]">
                  {linhas.length === 1 ? 'Roteiro' : `Roteiros (${escolhidos.length} de ${linhas.length})`}
                </Text>
                <ul className="stack-xs">
                  {linhas.map(({content, motivo}) => {
                    const status = normalizeContentStatus(content.status);
                    const marcado = motivo === null && !desmarcados.has(content.id);
                    const id = `bloco-item-${content.id}`;
                    return (
                      <li key={content.id}>
                        <label
                          htmlFor={id}
                          className="flex items-start gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2"
                        >
                          <input
                            id={id}
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-[var(--brand-accent)]"
                            checked={marcado}
                            disabled={motivo !== null || ocupado}
                            onChange={() => alternar(content.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate t-body-strong text-[var(--text-primary)]">
                              {content.title?.trim() || 'Sem título'}
                            </span>
                            {motivo ? (
                              <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                                {ROTULO_FORA_DO_BLOCO[motivo]}
                              </Text>
                            ) : null}
                          </span>
                          <Badge variant="status" status={status}>{status}</Badge>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <div className="stack-xs">
                <label htmlFor="bloco-nome" className="t-label text-[var(--text-secondary)]">Nome do bloco novo</label>
                <input
                  id="bloco-nome"
                  className="input"
                  value={nome}
                  placeholder="Ex.: Quinta à tarde"
                  disabled={ocupado || Boolean(blocoId)}
                  onChange={event => setNome(event.target.value)}
                />
              </div>
              <TagSelect
                id="bloco-tags"
                label="Tags de gravação"
                hint="Look, cenário, figurino. Sem escolha, valem as dos roteiros."
                creatable
                values={tags}
                options={tagsSugeridas}
                disabled={ocupado || Boolean(blocoId)}
                placeholder="Opcional"
                onChange={setTags}
              />
              <TagSelect
                id="bloco-existente"
                label="Ou completar um bloco existente"
                maxSelections={1}
                values={blocoId ? [blocoId] : []}
                options={blocosDisponiveis.map(bloco => ({value: bloco.id, label: rotuloDoBloco(bloco)}))}
                disabled={ocupado || (blocosCarregando && blocosDisponiveis.length === 0)}
                placeholder={blocosCarregando && blocosDisponiveis.length === 0 ? 'Carregando blocos…' : 'Nenhum: criar bloco novo'}
                onChange={valores => setBlocoId(valores[0] ?? '')}
              />
              {erro ? <Text variant="secondary" className="text-[var(--danger)]">{erro}</Text> : null}
            </div>
          )}
        </OverlayBody>
        <OverlayFooter className="justify-end gap-2">
          {resultado ? (
            <>
              <AppButton variant="secondary" onClick={fechar}>Fechar</AppButton>
              <AppButton variant="primary" onClick={verBloco}>Ver bloco</AppButton>
            </>
          ) : (
            <>
              <AppButton variant="secondary" onClick={fechar} disabled={ocupado}>Cancelar</AppButton>
              <AppButton
                variant="primary"
                disabled={!podeCriar || ocupado}
                leftIcon={ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                onClick={() => void criar()}
              >
                {ocupado ? 'Salvando…' : blocoId ? 'Adicionar ao bloco' : 'Criar bloco'}
              </AppButton>
            </>
          )}
        </OverlayFooter>
      </div>
    </Dialog>
  );
}
