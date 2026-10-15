import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {AtSign, Plus} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {Content, ContentPlataforma, Platform, RedeSocial} from '../../../lib/database';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu} from '../../../components/ui/MoreMenu';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {PostingTimesEditor} from '../components/PostingTimesEditor';
import {ToggleSwitch} from '../../../components/ui/ToggleSwitch';
import {generateUUID} from '../../../utils/uuid';
import {notifySaveFeedback} from '../../../lib/saveFeedback';
import {CONFIRM, type ConfirmState} from '../../../lib/uiCopy';
import {
  ESTADO_CADASTRO_ROTULO,
  REDES,
  REDE_ROTULO,
  contasAtivas,
  estadoCadastro,
  exibirHandle,
  normalizarHandle,
  ordenarContas,
  redeDaConta,
  rotuloConexao,
  rotuloConta,
  rotuloDaRef,
  complementoDoRotulo,
  contaDaRef,
} from '../../contas/lib/contas';
import {anexarPublicacaoComLink, contasParaLinkAntigo, moverLinkParaPublicacao, revisoesDeContas} from '../../contas/lib/revisaoContas';
import {parsePostCode} from '../../editorial/lib/postCode';

const CAMPO =
  'min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

type Rascunho = {
  id: string | null;
  rede: RedeSocial;
  nome: string;
  handle: string;
};

const RASCUNHO_NOVO: Rascunho = { id: null, rede: 'instagram', nome: '', handle: '' };

export function PlatformsSettingsPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [salvandoLink, setSalvandoLink] = useState<string | null>(null);

  const contas = useMemo(() => ordenarContas(state.platforms), [state.platforms]);
  const revisoes = useMemo(
    () => revisoesDeContas({
      contas: state.platforms,
      contents: state.contents,
      metricas: state.contentMetrics,
    }),
    [state.contentMetrics, state.contents, state.platforms],
  );

  const emUso = (platformId: string) => (
    state.contents.some(content => content.plataformas.some(item => item.platformId === platformId))
    || state.series.some(serie => serie.plataformas.some(item => item.platformId === platformId))
    || state.pilares.some(pilar => pilar.plataformas.some(item => item.platformId === platformId))
    || (state.postingTimeEntries ?? []).some(entry => entry.platformId === platformId)
  );

  const fechar = () => setRascunho(null);

  const colocarLink = async (contentId: string, publicacaoId: string) => {
    const content = state.contents.find(item => item.id === contentId);
    if (!content) return;
    const atualizado = moverLinkParaPublicacao(content, publicacaoId);
    if (!atualizado) return;
    const destino = content.plataformas.find(item => item.id === publicacaoId);
    const outro = destino?.postUrl?.trim();
    const executar = async () => {
      setSalvandoLink(contentId);
      try {
        await dispatch({ type: 'UPDATE_CONTENT', payload: atualizado });
      } catch {
        // O AppContext já mostra o erro.
      } finally {
        setSalvandoLink(null);
      }
    };
    if (outro && outro !== content.link?.trim()) {
      setConfirm({
        message: 'Esta publicação já tem outro link. Substituir por este?',
        confirmLabel: 'Substituir',
        cancelLabel: 'Manter o link atual',
        onConfirm: () => { void executar(); },
      });
      return;
    }
    await executar();
  };

  const criarPublicacaoComLink = async (content: Content, contaId: string) => {
    const link = content.link?.trim();
    if (!link) return;
    const publicacao: ContentPlataforma = {
      id: generateUUID(),
      contentId: content.id,
      platformId: contaId,
      legenda: '',
      hashtags: '',
      publishDate: content.postedAt?.slice(0, 10) ?? content.publishDate,
      publicationKind: 'post',
      status: 'publicada',
      realizadaManualEm: content.postedAt,
      postUrl: link,
      postCodigo: parsePostCode(link),
      contaNaGrade: content.contaNaGrade !== false,
    };
    const atualizado = anexarPublicacaoComLink(content, publicacao);
    if (!atualizado) return;
    setSalvandoLink(content.id);
    try {
      await dispatch({ type: 'UPDATE_CONTENT', payload: atualizado });
    } catch {
      // O AppContext já mostra o erro.
    } finally {
      setSalvandoLink(null);
    }
  };

  const abrirEdicao = (platform: Platform) => {
    setRascunho({
      id: platform.id,
      rede: redeDaConta(platform) ?? 'instagram',
      nome: platform.nome,
      handle: platform.handle ?? '',
    });
  };

  const salvar = async () => {
    if (!rascunho) return;
    const nome = rascunho.nome.trim();
    if (!nome) return;
    if (!user?.id) {
      notifySaveFeedback({ status: 'error', message: 'Entre na conta para salvar.' });
      return;
    }
    const handle = normalizarHandle(rascunho.handle);
    const atual = rascunho.id ? state.platforms.find(item => item.id === rascunho.id) : null;
    if (atual?.userId === null) return;

    const platform: Platform = {
      id: atual?.id ?? generateUUID(),
      userId: atual?.userId ?? user.id,
      nome,
      ativo: atual?.ativo ?? true,
      createdAt: atual?.createdAt ?? new Date().toISOString(),
      rede: rascunho.rede,
      handle,
      conexao: atual?.conexao ?? {
        status: 'nao_conectada',
        provedor: null,
        contaExternaId: null,
        atualizadaEm: null,
      },
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await dispatch({ type: atual ? 'UPDATE_PLATFORM' : 'ADD_PLATFORM', payload: platform });
      fechar();
    } catch {
      // O AppContext já mostra o erro, inclusive @ repetido na mesma plataforma.
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAtivo = async (platform: Platform) => {
    if (platform.userId === null || !user?.id) return;
    try {
      await dispatch({ type: 'UPDATE_PLATFORM', payload: { ...platform, ativo: !platform.ativo } });
    } catch {
      // feedback já exibido pelo AppContext
    }
  };

  const pedirExclusao = (platform: Platform) => {
    if (emUso(platform.id)) return;
    setConfirm({
      ...CONFIRM.excluirPlataforma,
      onConfirm: () => {
        void dispatch({ type: 'DELETE_PLATFORM', payload: platform.id });
      },
    });
  };

  return (
    <PageLayout
      variant="settings"
      header={
        <DesktopPageHeader
          section="Criação"
          title="Contas e horários"
          icon={AtSign}
          backLabel="Criação"
          backTo="/criacao"
          actions={
            <AppButton
              onClick={() => setRascunho(RASCUNHO_NOVO)}
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nova conta
            </AppButton>
          }
        />
      }
    >
      <Dialog open={rascunho != null} onClose={fechar} desktopMaxW="max-w-md">
        <OverlayHeader title={rascunho?.id ? 'Editar conta' : 'Nova conta'} onClose={fechar} />
        <OverlayBody>
          {rascunho ? (
            <div className="stack-sm">
              <TagSelect
                id="conta-rede"
                label="Plataforma"
                maxSelections={1}
                values={[rascunho.rede]}
                options={REDES.map(rede => ({ value: rede, label: REDE_ROTULO[rede] }))}
                onChange={values => {
                  const rede = values[0];
                  if (rede !== 'instagram' && rede !== 'tiktok' && rede !== 'youtube' && rede !== 'outra') return;
                  setRascunho({ ...rascunho, rede });
                }}
              />
              <label className="flex flex-col gap-1" htmlFor="conta-nome">
                <Text variant="label" as="span">Nome de identificação</Text>
                <input
                  id="conta-nome"
                  autoFocus
                  value={rascunho.nome}
                  onChange={event => setRascunho({ ...rascunho, nome: event.target.value })}
                  placeholder="Ex.: Diza principal"
                  className={CAMPO}
                />
              </label>
              <label className="flex flex-col gap-1" htmlFor="conta-handle">
                <Text variant="label" as="span">@</Text>
                <input
                  id="conta-handle"
                  value={rascunho.handle}
                  onChange={event => setRascunho({ ...rascunho, handle: event.target.value })}
                  placeholder="@dizaianne"
                  className={CAMPO}
                />
                <Text variant="meta">O @ identifica a conta na tela e pode mudar. Os vínculos usam o identificador interno. Informar o @ não conecta a conta.</Text>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <AppButton type="button" onClick={fechar} variant="secondary">Cancelar</AppButton>
                <AppButton onClick={() => void salvar()} disabled={!rascunho.nome.trim() || isSaving || !user?.id} variant="primary">
                  {isSaving ? 'Salvando…' : 'Salvar conta'}
                </AppButton>
              </div>
            </div>
          ) : null}
        </OverlayBody>
      </Dialog>

      <div className="stack-lg">
        <Text variant="secondary" className="max-w-2xl">
          Cada linha é uma conta. Dá para ter mais de um Instagram, TikTok ou YouTube. O estado de cadastro é independente de uma integração: nenhuma conta fica conectada só por estar cadastrada.
        </Text>

        {revisoes.length > 0 ? (
          <Surface padding="sm" className="stack-sm">
            <Text variant="bodyStrong">Para revisar</Text>
            <Text variant="secondary">Estes casos não foram resolvidos sozinhos, para não apontar uma publicação para a conta errada.</Text>
            <ul className="stack-sm">
              {revisoes.map(item => {
                const conteudo = item.caso === 'link_sem_publicacao' && item.contentId
                  ? state.contents.find(content => content.id === item.contentId)
                  : null;
                const link = conteudo?.link?.trim() ?? '';
                const publicacoes = conteudo?.plataformas ?? [];
                return (
                  <li key={item.id} className="min-w-0 stack-xs">
                    <Text variant="bodyStrong" as="p">{item.titulo}</Text>
                    <Text variant="secondary">{item.detalhe}</Text>
                    {link ? (
                      <Text variant="meta" as="p" className="break-all">
                        <a href={link} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {link}
                        </a>
                      </Text>
                    ) : null}
                    {conteudo ? (
                      publicacoes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {publicacoes.map(publicacao => {
                            const conta = contaDaRef(publicacao.platformId, state.platforms);
                            const extra = conta ? complementoDoRotulo(conta) : null;
                            const nome = `${rotuloDaRef(publicacao.platformId, state.platforms)}${extra ? ` · ${extra}` : ''}`;
                            const rotulo = publicacao.publicationKind === 'repost' ? `${nome} (repost)` : nome;
                            return (
                              <AppButton
                                key={publicacao.id}
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={salvandoLink === conteudo.id}
                                onClick={() => { void colocarLink(conteudo.id, publicacao.id); }}
                              >
                                {`Colocar em ${rotulo}`}
                              </AppButton>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="stack-xs">
                          <Text variant="meta">
                            Este roteiro não tem publicação. A conta escolhida recebe o link numa publicação já marcada como feita.
                          </Text>
                          <div className="flex flex-wrap gap-2">
                            {contasParaLinkAntigo(link, state.platforms).map(conta => {
                              const extra = complementoDoRotulo(conta);
                              const nome = `${rotuloConta(conta)}${extra ? ` · ${extra}` : ''}`;
                              return (
                                <AppButton
                                  key={conta.id}
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={salvandoLink === conteudo.id}
                                  onClick={() => { void criarPublicacaoComLink(conteudo, conta.id); }}
                                >
                                  {`Criar em ${nome}`}
                                </AppButton>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ) : null}
                    {item.contentId ? (
                      <Link
                        to={`/conteudos/${item.contentId}?tab=publicacao`}
                        className="text-sm text-[var(--text-primary)] underline underline-offset-2"
                      >
                        Abrir o roteiro
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Surface>
        ) : null}

        <section className="stack-sm">
          <Text variant="eyebrow">Contas</Text>
          {contas.length === 0 ? (
            <Surface padding="sm">
              <Text variant="secondary">Nenhuma conta ainda. Cadastre a primeira para escolher o destino dos roteiros.</Text>
            </Surface>
          ) : (
            <div className="stack-sm">
              {contas.map(platform => {
                const compartilhada = platform.userId === null;
                const estado = estadoCadastro(platform);
                const handle = exibirHandle(platform.handle);
                const usada = emUso(platform.id);
                return (
                  <Surface key={platform.id} padding="sm" className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Text variant="bodyStrong" truncate>{rotuloConta(platform)}</Text>
                      <Text variant="meta" className="mt-0.5">
                        {REDE_ROTULO[redeDaConta(platform) ?? 'outra']}
                        {handle ? ` · ${handle}` : ' · sem @'}
                        {platform.nome.trim() && handle ? ` · ${platform.nome.trim()}` : ''}
                      </Text>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="neutral">{ESTADO_CADASTRO_ROTULO[estado]}</Badge>
                        <Badge variant="neutral">{rotuloConexao(platform)}</Badge>
                        {compartilhada ? <Badge variant="neutral">Cadastro compartilhado</Badge> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Text variant="meta" as="span">{platform.ativo ? 'Ativa' : 'Inativa'}</Text>
                      <ToggleSwitch
                        id={`conta-${platform.id}`}
                        enabled={platform.ativo}
                        onToggle={() => { void toggleAtivo(platform); }}
                        label={rotuloConta(platform)}
                        disabled={compartilhada}
                      />
                    </div>
                    {compartilhada ? null : (
                      <MoreMenu
                        size="sm"
                        items={[
                          { label: 'Editar conta', onClick: () => abrirEdicao(platform) },
                          ...(usada ? [] : [{
                            label: CONFIRM.excluirPlataforma.confirmLabel,
                            tone: 'danger' as const,
                            onClick: () => pedirExclusao(platform),
                          }]),
                        ]}
                      />
                    )}
                    {usada ? (
                      <Text variant="meta" className="w-full">Em uso por publicações, séries, pilares ou horários. Inative para tirar da criação; os vínculos permanecem.</Text>
                    ) : null}
                  </Surface>
                );
              })}
            </div>
          )}
          <Text variant="meta">
            {contasAtivas(contas).length === 1 ? '1 conta ativa na criação.' : `${contasAtivas(contas).length} contas ativas na criação.`}
            {' '}Contas inativas continuam disponíveis para ler o que já foi publicado.
          </Text>
        </section>

        <section className="stack-sm">
          <Text variant="eyebrow">Horários de postagem</Text>
          <Text variant="secondary">O mesmo cadastro usado no Editorial. Cada conta pode ter horários diferentes; o dia sem horário próprio usa o Global.</Text>
          <PostingTimesEditor />
        </section>
      </div>

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </PageLayout>
  );
}
