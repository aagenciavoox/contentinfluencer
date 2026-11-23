import { ERRORS } from './uiCopy.ts';

export type SaveFeedbackStatus = 'idle' | 'saving' | 'success' | 'error' | 'info';

export type SaveFeedbackState = {
  status: SaveFeedbackStatus;
  message: string;
  detail?: string;
  href?: string;
  actionLabel?: string;
  /** Reversible action undo handler (cleared when toast hides). */
  onUndo?: () => void;
  undoLabel?: string;
  /** Não some sozinho (ex.: aviso de nova versão). */
  persistent?: boolean;
  updatedAt: number;
};

const AUTO_HIDE_MS = 3200;

let state: SaveFeedbackState = {
  status: 'idle',
  message: '',
  updatedAt: 0,
};

const listeners = new Set<() => void>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach(listener => listener());
}

export function getSaveFeedbackState(): SaveFeedbackState {
  return state;
}

export function subscribeSaveFeedback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSaveFeedback(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  state = { status: 'idle', message: '', updatedAt: Date.now() };
  emit();
}

export function pauseSaveFeedbackHide(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export function resumeSaveFeedbackHide(): void {
  if (state.status !== 'success' && state.status !== 'error') return;
  if (state.persistent) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    state = { status: 'idle', message: '', updatedAt: Date.now() };
    emit();
    hideTimer = null;
  }, AUTO_HIDE_MS);
}

export function notifySaveFeedback(
  next: Pick<
    SaveFeedbackState,
    'status' | 'message' | 'detail' | 'href' | 'actionLabel' | 'onUndo' | 'undoLabel' | 'persistent'
  >,
): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  state = {
    ...next,
    updatedAt: Date.now(),
  };
  emit();

  if (!next.persistent && (next.status === 'success' || next.status === 'error')) {
    // Keep undo toasts visible longer.
    const hideMs = next.onUndo ? AUTO_HIDE_MS + 2000 : AUTO_HIDE_MS;
    hideTimer = setTimeout(() => {
      state = { status: 'idle', message: '', updatedAt: Date.now() };
      emit();
      hideTimer = null;
    }, hideMs);
  }
}

/** Erro com texto escrito para a pessoa ler. Os outros (banco, rede) ficam só no console. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

function userFacingText(error: unknown): string | undefined {
  if (error instanceof UserFacingError && error.message.trim()) return error.message;
  return undefined;
}

/** Texto pronto do erro; sem ele, a frase nomeia a ação e a causa (ver mensagemDeErro). */
export function getErrorMessage(error: unknown, acao = 'salvar'): string {
  return userFacingText(error) ?? `Não foi possível ${acao}. ${ERRORS.porCausa[causaDoErro(error)]}`;
}

const SINAIS_DE_REDE = /failed to fetch|fetch failed|networkerror|network error|network request failed|load failed|err_network|err_internet_disconnected|err_connection|timeout|timed out|aborterror|etimedout|econnreset|econnrefused|enotfound|offline/;

/**
 * Falha de rede: aparelho sem internet, pedido que não chegou ao servidor ou tempo esgotado.
 * O resto (o servidor respondeu e não aceitou, coluna que falta, regra do banco) não é conexão.
 */
export function ehErroDeRede(error: unknown, online: boolean | undefined = typeof navigator === 'undefined' ? undefined : navigator.onLine): boolean {
  if (online === false) return true;
  return SINAIS_DE_REDE.test(sinaisDoErro(error).texto);
}

/** Sinais claros de sessão vencida ou ausente (token JWT, refresh token, HTTP 401). RLS sozinho não entra: é ambíguo. */
const SINAIS_DE_SESSAO = /jwt expired|invalid jwt|jwt is expired|jwserror|auth session missing|authsessionmissingerror|invalid refresh token|refresh token not found|refresh_token_not_found|session_expired|session_not_found/;
const CODIGOS_DE_SESSAO = new Set(['PGRST301', 'PGRST302', 'PGRST303']);

function sinaisDoErro(error: unknown): { texto: string; codigos: string[]; status: number[] } {
  const partes: string[] = [];
  const codigos: string[] = [];
  const status: number[] = [];
  let atual: unknown = error;
  for (let nivel = 0; nivel < 4 && atual != null; nivel += 1) {
    if (typeof atual === 'string') {
      partes.push(atual);
      break;
    }
    if (typeof atual !== 'object') break;
    const item = atual as { name?: unknown; message?: unknown; code?: unknown; status?: unknown; cause?: unknown };
    for (const valor of [item.name, item.message, item.code]) {
      if (typeof valor === 'string') partes.push(valor);
    }
    if (typeof item.code === 'string') codigos.push(item.code);
    if (typeof item.status === 'number') status.push(item.status);
    atual = item.cause;
  }
  return { texto: partes.join(' ').toLowerCase(), codigos, status };
}

/** Sessão vencida ou ausente, só quando o erro diz isso com clareza. */
export function ehErroDeSessao(error: unknown): boolean {
  const { texto, codigos, status } = sinaisDoErro(error);
  return status.includes(401) || codigos.some(codigo => CODIGOS_DE_SESSAO.has(codigo)) || SINAIS_DE_SESSAO.test(texto);
}

export type CausaDoErro = keyof typeof ERRORS.porCausa;

/**
 * Por que a ação não foi feita: rede (pedido não chegou), sessão (precisa entrar de novo)
 * ou servidor (respondeu e não aceitou: regra do banco, dado inválido, permissão).
 */
export function causaDoErro(
  error: unknown,
  online: boolean | undefined = typeof navigator === 'undefined' ? undefined : navigator.onLine,
): CausaDoErro {
  if (online === false) return 'rede';
  if (ehErroDeSessao(error)) return 'sessao';
  // Tempo esgotado do próprio banco (57014) é resposta do servidor, não da conexão.
  if (sinaisDoErro(error).codigos.includes('57014')) return 'servidor';
  if (ehErroDeRede(error, online)) return 'rede';
  return 'servidor';
}

/**
 * "Não foi possível <ação>. <o que houve>" — a ação vem de quem chama ("criar o roteiro", "excluir o item").
 * Erro com texto próprio (UserFacingError) fica só com a ação: o motivo vai no detalhe (getErrorDetail).
 * Sem espaço para detalhe, use getErrorMessage(error, ação).
 */
export function mensagemDeErro(
  acao: string,
  error: unknown,
  online: boolean | undefined = typeof navigator === 'undefined' ? undefined : navigator.onLine,
): string {
  if (userFacingText(error)) return `Não foi possível ${acao}.`;
  return `Não foi possível ${acao}. ${ERRORS.porCausa[causaDoErro(error, online)]}`;
}

const ACAO_POR_TIPO: Record<string, string> = {
  ARCHIVE_CONTENTS: 'arquivar os roteiros',
  RESTORE_CONTENTS: 'restaurar os roteiros',
  DELETE_MULTIPLE_CONTENTS: 'mover os roteiros para a lixeira',
  DELETE_CONTENT: 'mover o roteiro para a lixeira',
  DEMOTE_CONTENTS_TO_IDEAS: 'mover os roteiros para Ideias',
  PROMOTE_IDEA: 'transformar a ideia em roteiro',
  CONVERT_POST_IT: 'transformar o post-it',
  SET_CONTENT_STATUS: 'mudar a etapa',
  MOVER_EPISODIOS: 'mover os episódios',
  MOVER_CONTEUDOS_CLUBE: 'mover os conteúdos do clube',
  REORDENAR_CLUBE: 'salvar a nova ordem',
  VINCULAR_CLUBE: 'vincular ao clube',
  VINCULAR_SERIE_CLUBE: 'vincular a série ao clube',
  DESVINCULAR_CLUBE: 'desvincular do clube',
  DESVINCULAR_SERIE_CLUBE: 'desvincular a série do clube',
  LOG_ENERGY: 'registrar a energia',
  ADD_CONTA_METRICA: 'registrar a leitura da conta',
  UPDATE_CONTA_METRICA: 'registrar a leitura da conta',
  ADD_PERIODO_ANALISE: 'salvar o período',
  UPDATE_PERIODO_ANALISE: 'salvar o período',
  ADD_CONTENT_METRIC: 'salvar as métricas da publicação',
  UPDATE_CONTENT_METRIC: 'salvar as métricas da publicação',
};

/** Verbo da ação gravada, para a mensagem de erro nomear o que a pessoa fez. */
export function acaoDoTipo(tipo: string): string {
  const conhecida = ACAO_POR_TIPO[tipo];
  if (conhecida) return conhecida;
  if (tipo.startsWith('ADD_')) return 'criar o item';
  if (tipo.startsWith('DELETE_')) return 'excluir o item';
  return 'salvar a alteração';
}

/** Detalhe do aviso de erro: só aparece quando há algo útil a dizer além da mensagem principal. */
export function getErrorDetail(error: unknown): string | undefined {
  return userFacingText(error);
}
