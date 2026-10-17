import type { ConexaoStatus, Platform, RedeSocial } from '../../../lib/database.ts';
import { platformKey } from '../../../components/ui/platformName.ts';

/**
 * Contas de publicação. Cada linha de `platforms` é uma conta: o `id` é o vínculo
 * estável usado por publicações, horários, hashtags e métricas. Nome e @ só
 * identificam na tela e podem mudar sem quebrar nada.
 */

export type ContaRef = Pick<Platform, 'id' | 'nome'>
  & Partial<Pick<Platform, 'rede' | 'handle' | 'ativo' | 'userId' | 'conexao'>>;

export const REDES_PRINCIPAIS = ['instagram', 'tiktok', 'youtube'] as const satisfies readonly RedeSocial[];
export const REDES: readonly RedeSocial[] = ['instagram', 'tiktok', 'youtube', 'blog', 'outra'];

export const REDE_ROTULO: Record<RedeSocial, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  blog: 'Blog/site',
  outra: 'Outra plataforma',
};

/**
 * Nomes que indicam a plataforma sem dúvida, já normalizados por `platformKey`
 * (minúsculas, sem acento e sem espaço). A migração 20261017120000 usa a mesma lista.
 */
const NOMES_DE_REDE: Record<string, RedeSocial> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
  blog: 'blog',
  site: 'blog',
  'blog/site': 'blog',
  blogsite: 'blog',
  'blog-site': 'blog',
};

/** Só nomes inequívocos. "Insta da Diza" não vira Instagram: fica para a pessoa escolher. */
export function inferirRedePeloNome(nome: string | null | undefined): RedeSocial | null {
  if (!nome) return null;
  return NOMES_DE_REDE[platformKey(nome)] ?? null;
}

/** O nome da conta é Blog, Site ou Blog/site (com qualquer grafia). */
export function nomeIndicaBlog(nome: string | null | undefined): boolean {
  return inferirRedePeloNome(nome) === 'blog';
}

/**
 * A plataforma gravada; no banco antigo, a que o nome indica sem dúvida.
 * Antes da migração do Blog/site, a conta "Blog" estava gravada como `outra`: o nome decide.
 */
export function redeDaConta(conta: Pick<ContaRef, 'nome' | 'rede'> | null | undefined): RedeSocial | null {
  if (!conta) return null;
  if (conta.rede === 'outra' && nomeIndicaBlog(conta.nome)) return 'blog';
  return conta.rede ?? inferirRedePeloNome(conta.nome);
}

export function ehRedePrincipal(rede: RedeSocial | null | undefined): rede is (typeof REDES_PRINCIPAIS)[number] {
  return rede === 'instagram' || rede === 'tiktok' || rede === 'youtube';
}

/** O @ é guardado sem arroba e sem espaços. Vazio vira null. */
export function normalizarHandle(valor: string | null | undefined): string | null {
  const limpo = (valor ?? '').trim().replace(/^@+/, '').replace(/\s+/g, '');
  return limpo ? limpo : null;
}

export function exibirHandle(handle: string | null | undefined): string | null {
  const limpo = normalizarHandle(handle);
  return limpo ? `@${limpo}` : null;
}

/** O nome que aparece na tela quando o nome da conta é só o nome da plataforma. */
function nomeRepeteAPlataforma(conta: Pick<ContaRef, 'nome'>, rede: RedeSocial | null): boolean {
  if (!rede || rede === 'outra') return false;
  return platformKey(conta.nome) === platformKey(REDE_ROTULO[rede]);
}

/** Curto, para chips e cabeçalhos estreitos: o @ quando houver, senão o nome. */
export function rotuloCurtoConta(conta: ContaRef): string {
  return exibirHandle(conta.handle) ?? conta.nome.trim();
}

/**
 * Plataforma e @, para distinguir duas contas da mesma rede.
 * Ex.: "Instagram @dizaianne", "TikTok · Leituras", "Blog".
 */
export function rotuloConta(conta: ContaRef): string {
  const rede = redeDaConta(conta);
  const handle = exibirHandle(conta.handle);
  const nome = conta.nome.trim();
  if (!ehRedePrincipal(rede)) return handle ? `${nome} ${handle}` : nome;
  const plataforma = REDE_ROTULO[rede];
  if (handle) return `${plataforma} ${handle}`;
  return nomeRepeteAPlataforma(conta, rede) ? plataforma : `${plataforma} · ${nome}`;
}

/** Segunda linha de um seletor: o que separa esta conta das outras da mesma plataforma. */
export function detalheConta(conta: ContaRef): string {
  const rede = redeDaConta(conta);
  const handle = exibirHandle(conta.handle);
  const partes: string[] = [];
  if (handle) partes.push(handle);
  if (!nomeRepeteAPlataforma(conta, rede) || !handle) partes.push(conta.nome.trim());
  if (!handle && ehRedePrincipal(rede)) partes.push('sem @');
  return [...new Set(partes)].join(' · ');
}

/**
 * O que `rotuloConta` ainda não mostra, para ir na mesma linha sem repetir
 * plataforma, nome ou @. Sem @ numa rede principal, o aviso é "sem @".
 */
export function complementoDoRotulo(conta: ContaRef): string | null {
  const rede = redeDaConta(conta);
  const handle = exibirHandle(conta.handle);
  const partes: string[] = [];
  if (handle && ehRedePrincipal(rede) && !nomeRepeteAPlataforma(conta, rede)) {
    partes.push(conta.nome.trim());
  }
  if (!handle && ehRedePrincipal(rede)) partes.push('sem @');
  return partes.join(' · ') || null;
}

/**
 * Rótulo do vínculo de uma publicação. Sem conta encontrada (dado antigo ou
 * conta apagada), mostra o próprio texto do vínculo.
 */
export function rotuloDaRef(ref: string | null | undefined, contas: readonly ContaRef[]): string {
  const conta = contaDaRef(ref, contas);
  return conta ? rotuloConta(conta) : (ref ?? '');
}

/** Valor para o `PlatformIcon`: a rede quando conhecida, senão o nome. */
export function iconeDaConta(conta: Pick<ContaRef, 'nome' | 'rede'>): string {
  const rede = redeDaConta(conta);
  return ehRedePrincipal(rede) ? rede : conta.nome;
}

export type ResolucaoConta<T> = { conta: T | null; ambigua: boolean };

/**
 * Acha a conta de um vínculo. O app grava o id; o nome só aparece em dado antigo
 * (cache, preferência) e só resolve quando uma única conta tem aquele nome.
 * Com duas, devolve `ambigua` e nenhuma conta: quem chama decide mostrar a revisão.
 */
export function resolverConta<T extends ContaRef>(
  ref: string | null | undefined,
  contas: readonly T[],
): ResolucaoConta<T> {
  if (!ref) return { conta: null, ambigua: false };
  const porId = contas.find(conta => conta.id === ref);
  if (porId) return { conta: porId, ambigua: false };
  const chave = platformKey(ref);
  const porNome = contas.filter(conta => platformKey(conta.nome) === chave);
  if (porNome.length === 1) return { conta: porNome[0], ambigua: false };
  return { conta: null, ambigua: porNome.length > 1 };
}

export function contaDaRef<T extends ContaRef>(ref: string | null | undefined, contas: readonly T[]): T | null {
  return resolverConta(ref, contas).conta;
}

/** Rede de um vínculo de publicação. Sem conta encontrada, tenta o próprio texto (dado antigo). */
export function redeDaRef(ref: string | null | undefined, contas: readonly ContaRef[]): RedeSocial | null {
  const conta = contaDaRef(ref, contas);
  if (conta) return redeDaConta(conta);
  return inferirRedePeloNome(ref);
}

export type EstadoCadastro = 'ativa' | 'inativa' | 'incompleta' | 'revisar';

export const ESTADO_CADASTRO_ROTULO: Record<EstadoCadastro, string> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  incompleta: 'Sem @',
  revisar: 'Plataforma a definir',
};

/** Estado de cadastro mostrado na tela. Não diz nada sobre conexão. */
export function estadoCadastro(conta: ContaRef): EstadoCadastro {
  if (conta.ativo === false) return 'inativa';
  const rede = redeDaConta(conta);
  if (!rede) return 'revisar';
  if (ehRedePrincipal(rede) && !normalizarHandle(conta.handle)) return 'incompleta';
  return 'ativa';
}

export const CONEXAO_ROTULO: Record<ConexaoStatus, string> = {
  nao_conectada: 'Não conectada',
  conectada: 'Conectada',
  expirada: 'Conexão expirada',
  erro: 'Erro na conexão',
};

/** Só a integração muda a conexão. Cadastro, @ ou link não contam como conectada. */
export function rotuloConexao(conta: Pick<ContaRef, 'conexao'>): string {
  return CONEXAO_ROTULO[conta.conexao?.status ?? 'nao_conectada'];
}

export function contaConectada(conta: Pick<ContaRef, 'conexao'>): boolean {
  return conta.conexao?.status === 'conectada';
}

const ORDEM_REDE: Record<RedeSocial, number> = { instagram: 0, tiktok: 1, youtube: 2, blog: 3, outra: 4 };

/** Instagram, TikTok, YouTube, outras e, por último, as sem plataforma definida. */
export function ordenarContas<T extends ContaRef>(contas: readonly T[]): T[] {
  return [...contas].sort((esquerda, direita) => {
    const redeEsquerda = redeDaConta(esquerda);
    const redeDireita = redeDaConta(direita);
    const ordemEsquerda = redeEsquerda ? ORDEM_REDE[redeEsquerda] : 9;
    const ordemDireita = redeDireita ? ORDEM_REDE[redeDireita] : 9;
    if (ordemEsquerda !== ordemDireita) return ordemEsquerda - ordemDireita;
    return rotuloConta(esquerda).localeCompare(rotuloConta(direita), 'pt-BR');
  });
}

export function contasAtivas<T extends ContaRef>(contas: readonly T[]): T[] {
  return ordenarContas(contas.filter(conta => conta.ativo !== false));
}

export type GrupoDeContas<T> = { rede: RedeSocial | null; contas: T[] };

export function agruparPorRede<T extends ContaRef>(contas: readonly T[]): GrupoDeContas<T>[] {
  const grupos: GrupoDeContas<T>[] = [];
  for (const conta of ordenarContas(contas)) {
    const rede = redeDaConta(conta);
    const grupo = grupos.find(item => item.rede === rede);
    if (grupo) grupo.contas.push(conta);
    else grupos.push({ rede, contas: [conta] });
  }
  return grupos;
}

/** Chave da plataforma padrão: as três redes e o Blog/site. */
function chavePadrao(conta: ContaRef): string | null {
  const rede = redeDaConta(conta);
  if (ehRedePrincipal(rede)) return rede;
  return rede === 'blog' || platformKey(conta.nome) === 'blog' ? 'blog' : null;
}

/**
 * Regra antiga: Instagram, TikTok, YouTube e Blog ficavam sempre ligados.
 * Com várias contas, cada uma dessas plataformas mantém pelo menos uma conta ativa.
 * Devolve o motivo do bloqueio, ou null quando a conta pode ser desativada.
 */
export function travaDaContaPadrao(conta: ContaRef, contas: readonly ContaRef[]): string | null {
  if (conta.ativo === false) return null;
  const chave = chavePadrao(conta);
  if (!chave) return null;
  const outrasAtivas = contas.filter(item => item.id !== conta.id && item.ativo !== false && chavePadrao(item) === chave);
  if (outrasAtivas.length > 0) return null;
  const nome = ehRedePrincipal(redeDaConta(conta)) ? REDE_ROTULO[redeDaConta(conta) as RedeSocial] : conta.nome;
  return `Única conta ativa de ${nome}: continua ligada para criação e leitura do histórico.`;
}

export type ContaDraft = {
  rede: RedeSocial | null;
  nome: string;
  handle: string;
};

export type ErrosConta = Partial<Record<keyof ContaDraft, string>>;

const HANDLE_VALIDO = /^[A-Za-z0-9._-]+$/;

export function validarConta(
  draft: ContaDraft,
  contas: readonly ContaRef[],
  editandoId: string | null = null,
): ErrosConta {
  const erros: ErrosConta = {};
  if (!draft.rede) erros.rede = 'Escolha a plataforma.';
  if (!draft.nome.trim()) erros.nome = 'Dê um nome para identificar a conta.';
  const handle = normalizarHandle(draft.handle);
  if (!handle) {
    if (ehRedePrincipal(draft.rede)) erros.handle = 'Informe o @ da conta.';
  } else if (!HANDLE_VALIDO.test(handle)) {
    erros.handle = 'Use só letras, números, ponto, traço e sublinhado.';
  } else if (draft.rede) {
    const repetida = contas.find(conta =>
      conta.id !== editandoId
      && redeDaConta(conta) === draft.rede
      && normalizarHandle(conta.handle)?.toLocaleLowerCase('pt-BR') === handle.toLocaleLowerCase('pt-BR'),
    );
    if (repetida) erros.handle = `Já existe uma conta de ${REDE_ROTULO[draft.rede]} com @${handle}.`;
  }
  return erros;
}

export function contaValida(erros: ErrosConta): boolean {
  return Object.keys(erros).length === 0;
}
