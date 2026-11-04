import type { AppAction } from '../../../context/reducer.ts';
import type { buildDailySessionBlock } from './dailySession.ts';

export type DailySessionPayload = NonNullable<ReturnType<typeof buildDailySessionBlock>>;

export async function saveDailySession(payload: DailySessionPayload, dispatch: (action: AppAction, options?: { silent?: boolean }) => Promise<void>, blockExists = false) {
  await dispatch({ type: blockExists ? 'UPDATE_RECORDING_BLOCK' : 'ADD_RECORDING_BLOCK', payload: payload.block }, { silent: true });
  try {
    await dispatch({ type: 'UPDATE_BLOCK_CONTENTS', payload: { blockId: payload.block.id, contents: payload.blockContents } }, { silent: true });
  } catch (error) {
    // Só remove o bloco recém-criado. Se a remoção falhar, a tela reutiliza o mesmo id na tentativa seguinte.
    try { await dispatch({ type: 'DELETE_RECORDING_BLOCK', payload: payload.block.id }, { silent: true }); } catch { /* Preserva o erro original. */ }
    throw error;
  }
}
