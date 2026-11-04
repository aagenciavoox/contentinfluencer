import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AgendaItem, Content, ContentPlataforma, RecordingBlock } from '../../../lib/database.ts';
import type { AppAction } from '../../../context/reducer.ts';
import { createContentDraft } from '../../contents/lib/createContentDraft.ts';
import { getTodayAgenda } from './todayAgenda.ts';
import { getTodayWork } from './todayWork.ts';
import { getTodayPublications } from './todayPublications.ts';
import { buildDayPulse, localDateKey } from './dayPulse.ts';
import { buildDailySessionBlock } from './dailySession.ts';
import { saveDailySession } from './saveDailySession.ts';
import { emptyIdeaDraft, ideaDraftKey, readIdeaDraft, writeIdeaDraft } from './ideaDraft.ts';

const day = '2026-11-03';
const content = (id: string, patch: Partial<Content> = {}) => createContentDraft({
  id, title: id, status: 'Roteiro', updatedAt: day + 'T12:00:00Z', ...patch,
});
const publication = (id: string, platformId: string, patch: Partial<ContentPlataforma> = {}): ContentPlataforma => ({
  id, contentId: 'c', platformId, legenda: '', hashtags: '', publishDate: day, publishTime: '12:00', ...patch,
});
const block = (id: string, contentId: string, gravado = false): RecordingBlock => ({
  id, name: id, userId: 'u', createdAt: day + 'T12:00:00Z', contents: [{ blockId: id, contentId, gravado, ordem: 0 }],
});

describe('Hoje: agenda local e trabalho em andamento', () => {
  it('mantém compromissos à noite e filtra antes de limitar eventos longos', () => {
    const localDay = localDateKey(new Date(2026, 10, 3, 23, 30));
    const longEvents = Array.from({ length: 25 }, (_, i) => ({ id: String(i), title: 'Leitura', date: '2026-10-01', dateEnd: day, time: null } as AgendaItem));
    const items = getTodayAgenda([...longEvents, { id: 'today', title: 'Reunião', date: day, time: '18:00' } as AgendaItem,
      { id: 'tomorrow', title: 'Amanhã', date: '2026-11-04' } as AgendaItem], localDay);
    assert.equal(localDay, day);
    assert.equal(items.length, 26);
    assert.equal(items[0].id, 'today');
  });

  it('retoma a escrita recente e uma sessão pendente, excluindo conteúdo oculto e concluído', () => {
    const contents = [content('old', { updatedAt: '2026-11-01T12:00:00Z' }), content('recent'),
      content('hidden', { deletedAt: day, updatedAt: '2026-11-04T12:00:00Z' }),
      content('archived', { archivedAt: day }), content('idea', { status: 'Ideia' }),
      content('done', { status: 'Edição', edicaoConcluidaEm: day }), content('posted', { status: 'Postado' }),
      content('record', { status: 'Produção' })];
    const blocks = [block('completed', 'record', true), block('pending', 'record'), block('missing', 'gone')];
    assert.deepEqual(getTodayWork(contents, blocks, true).map(item => item.id), ['recent', 'pending']);
    assert.ok(getTodayWork(contents, blocks, false).every(item => !item.to.startsWith('/gravacao')));
    assert.deepEqual(getTodayWork([content('posted', { postedAt: day })], [], true), []);
  });

  it('não exibe atalhos de módulos desligados no resumo', () => {
    assert.deepEqual(buildDayPulse({ readyCount: 2, showCounts: true, agendaToday: [], urgentProjects: [], recordingEnabled: false, calendarEnabled: false }), []);
  });
});

describe('Hoje: publicações por conta', () => {
  const platforms = [{ id: 'ig', nome: 'Instagram' }, { id: 'tt', nome: 'TikTok' }];
  it('usa a data de cada conta e inclui reposts sem duplicar ou incluir canceladas', () => {
    const c = content('c', { status: 'Produção', publishDate: '2026-11-04', plataformas: [
      publication('original', 'ig'), publication('tomorrow', 'tt', { publishDate: '2026-11-04' }),
      publication('repost', 'tt', { publicationKind: 'repost', ciclo: 2, publishTime: '19:00' }),
      publication('cancelled', 'ig', { status: 'nao_publicada' }), publication('removed', 'tt', { status: 'removida' }),
    ] });
    const items = getTodayPublications({ contents: [c], platforms, series: [], redeReferenciaId: 'ig' }, day);
    assert.deepEqual(items.map(item => item.plataformaId), ['original', 'repost']);
  });
  it('mantém histórico na data realizada e coloca as pendentes antes das postadas', () => {
    const c = content('c', { plataformas: [publication('posted', 'ig', {
      status: 'publicada', publishDate: '2026-11-01', realizadaManualEm: day + 'T15:00:00', publishTime: '09:00',
    }), publication('pending', 'tt', { publishTime: '20:00' })] });
    const items = getTodayPublications({ contents: [c], platforms, series: [], redeReferenciaId: null }, day);
    assert.deepEqual(items.map(item => item.plataformaId), ['pending', 'posted']);
    assert.deepEqual(items.map(item => item.posted), [false, true]);
  });
  it('exclui arquivados e mantém a data de conteúdos antigos sem contas', () => {
    const items = getTodayPublications({ contents: [content('legacy', { publishDate: day }), content('archived', { publishDate: day, archivedAt: day })], platforms, series: [], redeReferenciaId: null }, day);
    assert.deepEqual(items.map(item => item.contentId), ['legacy']);
  });
});

describe('Hoje: sessão confirmada antes de navegar', () => {
  const payload = buildDailySessionBlock({ contents: [content('c')], contentIds: ['c'], userId: 'u' })!;
  it('espera criar o bloco antes de vincular os roteiros', async () => {
    const actions: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const saved = saveDailySession(payload, async action => { actions.push(action.type); if (action.type === 'ADD_RECORDING_BLOCK') await gate; });
    assert.deepEqual(actions, ['ADD_RECORDING_BLOCK']);
    release(); await saved;
    assert.deepEqual(actions, ['ADD_RECORDING_BLOCK', 'UPDATE_BLOCK_CONTENTS']);
  });
  it('não vincula roteiros quando a criação do bloco falha', async () => {
    const actions: string[] = [];
    await assert.rejects(saveDailySession(payload, async action => { actions.push(action.type); throw new Error('offline'); }), /offline/);
    assert.deepEqual(actions, ['ADD_RECORDING_BLOCK']);
  });
  it('reutiliza um bloco que permaneceu após uma falha de recuperação', async () => {
    const actions: string[] = [];
    await saveDailySession(payload, async action => { actions.push(action.type); }, true);
    assert.deepEqual(actions, ['UPDATE_RECORDING_BLOCK', 'UPDATE_BLOCK_CONTENTS']);
  });
  it('remove o bloco incompleto e permite repetir com o mesmo id', async () => {
    const actions: AppAction[] = [];
    await assert.rejects(saveDailySession(payload, async action => {
      actions.push(action); if (action.type === 'UPDATE_BLOCK_CONTENTS') throw new Error('falha no vínculo');
    }), /falha no vínculo/);
    assert.equal(actions[2].type, 'DELETE_RECORDING_BLOCK');
    const retried: AppAction[] = [];
    await saveDailySession(payload, async action => { retried.push(action); });
    assert.deepEqual(retried[0], actions[0]);
  });
});

describe('Hoje: rascunho de ideia', () => {
  it('isola por usuário, recupera os campos e remove só depois de limpar', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    const draft = { ...emptyIdeaDraft(), title: 'Uma ideia', notes: 'Texto que deve sobreviver à navegação', seriesId: 's' };
    writeIdeaDraft(storage, ideaDraftKey('a'), draft);
    assert.deepEqual(readIdeaDraft(storage, ideaDraftKey('a')), draft);
    assert.deepEqual(readIdeaDraft(storage, ideaDraftKey('b')), emptyIdeaDraft());
    writeIdeaDraft(storage, ideaDraftKey('a'), emptyIdeaDraft());
    assert.equal(storage.getItem(ideaDraftKey('a')), null);
  });
  it('tolera dados inválidos e armazenamento bloqueado', () => {
    assert.deepEqual(readIdeaDraft({ getItem: () => '{invalid' }, 'key'), emptyIdeaDraft());
    assert.doesNotThrow(() => writeIdeaDraft({ setItem: () => { throw new Error('blocked'); }, removeItem: () => {} }, 'key', { ...emptyIdeaDraft(), title: 'Texto' }));
  });
});
