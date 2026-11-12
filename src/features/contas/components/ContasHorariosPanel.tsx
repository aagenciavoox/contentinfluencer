import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {format} from 'date-fns';
import {AlertCircle, ArrowUpRight, Pencil, Plus, Undo2} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {Content, ContentPlataforma, Platform, RedeSocial} from '../../../lib/database';
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
import {PostingTimesOverview} from '../../settings/components/PostingTimesOverview';
import {PainelMetaDaConta, textoPorFormato} from '../../editorial/components/plano/ContasEFormatosCard';
import {useEditorialPlano} from '../../editorial/components/plano/useEditorialPlano';
import {diaMes} from '../../editorial/components/plano/ValeAPartirDe';
import {desfazerMudancaDaConta, metaDaContaHoje, proximaMudancaDaConta, type MetaDaContaVigencia} from '../../editorial/lib/metasPorConta';
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
} from '../lib/contas';
import {anexarPublicacaoComLink, contasParaLinkAntigo, moverLinkParaPublicacao, revisoesDeContas} from '../lib/revisaoContas';
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

function publicacoesPorSemana(total: number): string {
  return total === 1 ? '1 publicação por semana' : `${total} publicações por semana`;
}

/**
 * Aba "Contas e formatos" do Editorial: contas de cada rede, pendências de links antigos
 * e os horários de postagem. Antes era a página /contas.
 */
export function ContasHorariosPanel() {
  const {state, dispatch} = useAppContext();
  const {settings, gravar, salvarPreferencias} = useEditorialPlano();
  const {user} = useAuth();
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [revisaoAberta, setRevisaoAberta] = useState(true);
  const [metaAbertaId, setMetaAbertaId] = useState<string | null>(null);
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const linhasMeta = settings.metasDasContas ?? [];
  const referenciaId = settings.preferencias.redeReferenciaId;

  const contas = useMemo(() => ordenarContas(state.platforms), [state.platforms]);
  const listaContas = [...contas.filter(conta => conta.ativo), ...contas.filter(conta => !conta.ativo)];
  const metasAtivas = contasAtivas(contas).map(conta => metaDaContaHoje(linhasMeta, conta.id, hoje));
  const somaMetas = metasAtivas.reduce((total, linha) => total + (linha?.limiteSemanal ?? 0), 0);
  const contasSemMeta = metasAtivas.filter(linha => linha?.limiteSemanal == null).length;
  const contaDaMeta = contas.find(conta => conta.id === metaAbertaId) ?? null;
  const gravarMetas = (novas: MetaDaContaVigencia[]) => {
    void gravar({ ...settings, metasDasContas: novas });
  };
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
    <>
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 stack-xs">
              <Text variant="sectionTitle" as="h2"><span id="contas-titulo">Contas e formatos</span></Text>
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="secondary" as="span">
                  {contasAtivas(contas).length === 0 || contasSemMeta === contasAtivas(contas).length
                    ? 'Nenhuma meta definida'
                    : publicacoesPorSemana(somaMetas)}
                </Text>
                {contasSemMeta > 0 && contasSemMeta < contasAtivas(contas).length ? (
                  <Badge variant="warning">
                    {contasSemMeta === 1 ? '1 conta sem meta' : `${contasSemMeta} contas sem meta`}
                  </Badge>
                ) : null}
              </div>
            </div>
            <AppButton
              onClick={() => setRascunho(RASCUNHO_NOVO)}
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Adicionar conta
            </AppButton>
          </div>
          {contas.length === 0 ? (
            <Surface padding="sm">
              <Text variant="secondary">Adicione uma conta para cadastrar horários e metas.</Text>
            </Surface>
          ) : (
            <Surface padding="none" className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-left md:table-auto">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th scope="col" className="w-[62%] px-4 py-3 font-normal md:w-auto">
                      <Text variant="label" as="span" className="text-[var(--text-secondary)]">Conta</Text>
                    </th>
                    <th scope="col" className="w-16 px-2 py-3 font-normal md:w-auto md:px-4">
                      <Text variant="label" as="span" className="text-[var(--text-secondary)]">Meta semanal</Text>
                    </th>
                    <th scope="col" className="hidden px-4 py-3 font-normal md:table-cell">
                      <Text variant="label" as="span" className="text-[var(--text-secondary)]">Por formato</Text>
                    </th>
                    <th scope="col" className="hidden px-4 py-3 font-normal lg:table-cell">
                      <Text variant="label" as="span" className="text-[var(--text-secondary)]">Integração</Text>
                    </th>
                    <th scope="col" className="w-24 px-2 py-3 font-normal md:w-auto md:px-4">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listaContas.map(platform => {
                    const compartilhada = platform.userId === null;
                    const estado = estadoCadastro(platform);
                    const handle = exibirHandle(platform.handle);
                    const usada = emUso(platform.id);
                    const rede = redeDaConta(platform);
                    const rotulo = rotuloConta(platform);
                    const nome = rede && rede !== 'outra' ? REDE_ROTULO[rede] : platform.nome;
                    const nomeDaRede = REDE_ROTULO[rede ?? 'outra'];
                    const nomeExtra = platform.nome.trim()
                      && platform.nome.trim().toLocaleLowerCase('pt-BR') !== nomeDaRede.toLocaleLowerCase('pt-BR')
                      ? platform.nome.trim()
                      : '';
                    const atual = metaDaContaHoje(linhasMeta, platform.id, hoje);
                    const proxima = proximaMudancaDaConta(linhasMeta, platform.id, hoje);
                    const formatos = textoPorFormato(atual, rede);
                    const referencia = platform.id === referenciaId;
                    const itensMenu = [
                      ...(compartilhada ? [] : [{ label: 'Editar conta', onClick: () => abrirEdicao(platform) }]),
                      {
                        label: referencia ? 'Deixar de ser referência' : 'Definir como referência',
                        onClick: () => salvarPreferencias({ redeReferenciaId: referencia ? null : platform.id }),
                      },
                      ...(compartilhada ? [] : [{
                        label: platform.ativo ? 'Não usar ao criar' : 'Usar ao criar',
                        onClick: () => { void toggleAtivo(platform); },
                      }]),
                      ...(compartilhada || usada ? [] : [{
                        label: CONFIRM.excluirPlataforma.confirmLabel,
                        tone: 'danger' as const,
                        onClick: () => pedirExclusao(platform),
                      }]),
                    ];
                    return (
                      <tr key={platform.id} className="border-t border-[var(--border-color)]">
                        <td className="px-4 py-3 align-middle">
                          <div className="flex min-w-0 items-center gap-3">
                            <PlatformTile platform={iconeDaConta(platform)} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Text variant="body" as="span">{nome}</Text>
                                {!platform.ativo ? <Badge variant="neutral">Inativa</Badge> : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Text variant="secondary" as="span" truncate className="text-[var(--text-secondary)]">
                                  {handle ?? 'sem @'}
                                  {nomeExtra ? ` · ${nomeExtra}` : ''}
                                </Text>
                                {referencia ? <Badge variant="neutral">Referência</Badge> : null}
                              </div>
                              <div className="mt-1 stack-xs md:hidden">
                                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                                  {formatos || '—'} · {rotuloConexao(platform)}
                                </Text>
                                {proxima ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Text variant="meta" as="span">
                                      A partir de seg., {diaMes(proxima.vigenteDesde)}: {proxima.limiteSemanal == null ? 'sem meta' : `${proxima.limiteSemanal} por semana`}
                                    </Text>
                                    <AppButton
                                      variant="ghost"
                                      size="sm"
                                      leftIcon={<Undo2 className="h-4 w-4" />}
                                      onClick={() => gravarMetas(desfazerMudancaDaConta(linhasMeta, platform.id, proxima.vigenteDesde, hoje))}
                                    >
                                      Desfazer
                                    </AppButton>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 align-middle md:px-4">
                          <Text variant="bodyStrong" as="span" className="tabular-nums">
                            {atual?.limiteSemanal == null ? <span className="text-[var(--text-tertiary)]">—</span> : atual.limiteSemanal}
                          </Text>
                          {atual?.limiteSemanal == null ? <span className="sr-only">Sem meta</span> : null}
                        </td>
                        <td className="hidden px-4 py-3 align-middle md:table-cell">
                          <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">{formatos || '—'}</Text>
                          {proxima ? (
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Text variant="meta" as="span">
                                A partir de seg., {diaMes(proxima.vigenteDesde)}: {proxima.limiteSemanal == null ? 'sem meta' : `${proxima.limiteSemanal} por semana`}
                              </Text>
                              <AppButton
                                variant="ghost"
                                size="sm"
                                leftIcon={<Undo2 className="h-4 w-4" />}
                                onClick={() => gravarMetas(desfazerMudancaDaConta(linhasMeta, platform.id, proxima.vigenteDesde, hoje))}
                              >
                                Desfazer
                              </AppButton>
                            </div>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 align-middle lg:table-cell">
                          <div className="stack-xs">
                            <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">{rotuloConexao(platform)}</Text>
                            {estado === 'revisar' ? <Badge variant="neutral">{ESTADO_CADASTRO_ROTULO[estado]}</Badge> : null}
                            {compartilhada ? <Badge variant="neutral">Cadastro compartilhado</Badge> : null}
                          </div>
                        </td>
                        <td className="px-2 py-3 align-middle md:px-4">
                          <div className="flex items-center justify-end gap-1">
                            <span className="md:hidden">
                              <AppButton
                                variant="secondary"
                                size="sm"
                                iconOnly
                                aria-label={`Editar meta de ${rotulo}`}
                                onClick={() => setMetaAbertaId(platform.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </AppButton>
                            </span>
                            <span className="hidden md:inline-flex">
                              <AppButton
                                variant="secondary"
                                size="sm"
                                leftIcon={<Pencil className="h-4 w-4" />}
                                onClick={() => setMetaAbertaId(platform.id)}
                              >
                                Editar
                              </AppButton>
                            </span>
                            <MoreMenu size="sm" label={`Mais opções de ${rotulo}`} items={itensMenu} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Surface>
          )}
          <Text variant="secondary" className="text-[var(--text-secondary)]">
            Um roteiro em três contas conta como três publicações.
          </Text>
        </section>

        <PostingTimesOverview />
      </div>

      <PainelMetaDaConta conta={contaDaMeta} onClose={() => setMetaAbertaId(null)} />

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
    </>
  );
}
