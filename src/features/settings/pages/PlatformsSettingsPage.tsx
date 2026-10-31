import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {AlertCircle, ArrowUpRight, Plus} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {Content, ContentPlataforma, Platform, RedeSocial} from '../../../lib/database';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {DisclosureButton} from '../../../components/ui/DisclosureButton';
import {PlatformTile} from '../../../components/ui/PlatformIcon';
import {MoreMenu} from '../../../components/ui/MoreMenu';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {PostingTimesOverview} from '../components/PostingTimesOverview';
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
  iconeDaConta,
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

/** Colunas da tabela de contas: conta, integração, na criação e o menu. No celular, uma coluna só. */
const LINHA_CONTA =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_2.5rem]';

const RASCUNHO_NOVO: Rascunho = { id: null, rede: 'instagram', nome: '', handle: '' };

export function PlatformsSettingsPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [revisaoAberta, setRevisaoAberta] = useState(true);

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
    const executar = () => {
      void dispatch({ type: 'UPDATE_CONTENT', payload: atualizado }).catch(() => {
        // O AppContext já mostra o erro.
      });
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
    void dispatch({ type: 'UPDATE_CONTENT', payload: atualizado }).catch(() => {
      // O AppContext já mostra o erro.
    });
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

    fechar();
    void dispatch({ type: atual ? 'UPDATE_PLATFORM' : 'ADD_PLATFORM', payload: platform }).catch(() => {
      // O AppContext já mostra o erro, inclusive @ repetido na mesma plataforma.
    });
  };

  const toggleAtivo = (platform: Platform) => {
    if (platform.userId === null || !user?.id) return;
    void dispatch({ type: 'UPDATE_PLATFORM', payload: { ...platform, ativo: !platform.ativo } }).catch(() => {
      // feedback já exibido pelo AppContext
    });
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
                  if (rede !== 'instagram' && rede !== 'tiktok' && rede !== 'youtube' && rede !== 'blog' && rede !== 'outra') return;
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
                <AppButton onClick={salvar} disabled={!rascunho.nome.trim() || !user?.id} variant="primary">
                  Salvar conta
                </AppButton>
              </div>
            </div>
          ) : null}
        </OverlayBody>
      </Dialog>

      <div className="stack-xl">
        {revisoes.length > 0 ? (
          <section
            className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--warning)_40%,var(--border-color))] bg-[color-mix(in_srgb,var(--warning)_10%,var(--bg-elevated))] p-2"
            aria-label="Pendências para revisar"
          >
            <DisclosureButton
              open={revisaoAberta}
              onToggle={() => setRevisaoAberta(aberta => !aberta)}
              controls="contas-revisao"
              className="min-h-14 items-start py-2 hover:bg-[color-mix(in_srgb,var(--warning)_14%,var(--bg-elevated))]"
            >
              <span className="flex min-w-0 items-start gap-3">
                <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-[var(--warning)]" aria-hidden />
                <span className="min-w-0">
                  <Text variant="bodyStrong" as="span" className="block">
                    {revisoes.length === 1 ? '1 pendência para revisar' : `${revisoes.length} pendências para revisar`}
                  </Text>
                  <Text variant="secondary" as="span" className="block text-[var(--text-secondary)]">
                    Escolha a publicação correta para os links antigos.
                  </Text>
                </span>
              </span>
            </DisclosureButton>
            {revisaoAberta ? (
              <ul id="contas-revisao" className="mt-2 stack-xs px-1 pb-1">
                {revisoes.map(item => {
                  const conteudo = item.caso === 'link_sem_publicacao' && item.contentId
                    ? state.contents.find(content => content.id === item.contentId)
                    : null;
                  const link = conteudo?.link?.trim() ?? '';
                  const publicacoes = conteudo?.plataformas ?? [];
                  return (
                    <li key={item.id} className="min-w-0 stack-sm rounded-[var(--radius-input)] border border-[color-mix(in_srgb,var(--warning)_25%,var(--border-color))] bg-[var(--bg-elevated)] px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <div className="min-w-0 flex-1">
                          <Text variant="bodyStrong" as="p">{item.titulo}</Text>
                          <Text variant="secondary" className="text-[var(--text-secondary)]">{item.detalhe}</Text>
                        </div>
                        {item.contentId ? (
                          <Link
                            to={`/conteudos/${item.contentId}?tab=publicacao`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] t-secondary text-[var(--text-primary)] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          >
                            Abrir roteiro
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        ) : null}
                      </div>
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
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="stack-sm" aria-labelledby="contas-titulo">
          <div className="flex flex-wrap items-center gap-3">
            <Text variant="sectionTitle" as="h2"><span id="contas-titulo">Contas</span></Text>
            <Badge variant="neutral">
              {contasAtivas(contas).length === 1 ? '1 ativa' : `${contasAtivas(contas).length} ativas`}
            </Badge>
          </div>
          {contas.length === 0 ? (
            <Surface padding="sm">
              <Text variant="secondary">Nenhuma conta ainda. Cadastre a primeira para escolher o destino dos roteiros.</Text>
            </Surface>
          ) : (
            <Surface padding="none" className="overflow-hidden">
              <div className={`${LINHA_CONTA} hidden border-b border-[var(--border-color)] bg-[var(--surface-subtle)] py-2.5 md:grid`} aria-hidden>
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">Conta</Text>
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">Integração</Text>
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">Usar ao criar</Text>
                <span />
              </div>
              <ul>
                {contas.map(platform => {
                  const compartilhada = platform.userId === null;
                  const estado = estadoCadastro(platform);
                  const handle = exibirHandle(platform.handle);
                  const usada = emUso(platform.id);
                  const rede = redeDaConta(platform);
                  const rotulo = rotuloConta(platform);
                  return (
                    <li key={platform.id} className={`${LINHA_CONTA} border-b border-[var(--border-color)] py-3 last:border-b-0`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <PlatformTile platform={iconeDaConta(platform)} />
                        <div className="min-w-0">
                          <Text variant="body" truncate>{rede && rede !== 'outra' ? REDE_ROTULO[rede] : platform.nome}</Text>
                          {handle ? (
                            <Text variant="secondary" truncate className="text-[var(--text-secondary)]">
                              {handle}
                              {platform.nome.trim() && platform.nome.trim() !== REDE_ROTULO[rede ?? 'outra'] ? ` · ${platform.nome.trim()}` : ''}
                            </Text>
                          ) : compartilhada ? (
                            <Text variant="secondary" className="text-[var(--text-secondary)]">sem @</Text>
                          ) : (
                            <AppButton
                              variant="secondary"
                              size="xs"
                              className="mt-1 h-7 px-2"
                              aria-label={`Adicionar @ em ${rotulo}`}
                              onClick={() => abrirEdicao(platform)}
                            >
                              Adicionar @
                            </AppButton>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="neutral">{rotuloConexao(platform)}</Badge>
                        {estado === 'revisar' ? <Badge variant="neutral">{ESTADO_CADASTRO_ROTULO[estado]}</Badge> : null}
                        {compartilhada ? <Badge variant="neutral">Cadastro compartilhado</Badge> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <ToggleSwitch
                          id={`conta-${platform.id}`}
                          enabled={platform.ativo}
                          onToggle={() => { void toggleAtivo(platform); }}
                          label={`Usar ${rotulo} ao criar`}
                          disabled={compartilhada}
                        />
                        <label htmlFor={`conta-${platform.id}`}>
                          <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">{platform.ativo ? 'Ativa' : 'Inativa'}</Text>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        {compartilhada ? null : (
                          <MoreMenu
                            size="sm"
                            label={`Mais opções de ${rotulo}`}
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
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          )}
          <Text variant="secondary" className="text-[var(--text-secondary)]">
            Conta em uso não pode ser excluída. Desative para tirar da criação sem perder o histórico.
          </Text>
        </section>

        <PostingTimesOverview />
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
