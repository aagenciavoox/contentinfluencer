import assert from 'node:assert/strict';
import test from 'node:test';
import { initialState } from '../../../app/providers/appState.ts';
import { appReducer, type AppAction } from '../../../context/reducer.ts';
import type { Anotacao, BibliotecaItem } from '../../../lib/database.ts';
import { createAnnotationDraft, persistAnnotationDraft, readAnnotationDraft, writeAnnotationDraft, type AnnotationDraft } from './annotationDraft.ts';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function draft(): AnnotationDraft {
  return { ...createAnnotationDraft(), texto: '  Minha anotação\ncom duas linhas  ', tipo: 'Trecho', capituloRef: ' pág. 42 ', createdAt: '2020-01-01T00:00:00.000Z' };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test('recupera texto, categoria, referência e id sem expiração, por usuário e obra', () => {
  const storage = memoryStorage();
  const original = draft();
  assert.equal(writeAnnotationDraft('user', 'book', original, storage), true);
  assert.deepEqual(readAnnotationDraft('user', 'book', storage), original);
  assert.equal(readAnnotationDraft('other-user', 'book', storage), null);
  assert.equal(readAnnotationDraft('user', 'other-book', storage), null);
  assert.equal(readAnnotationDraft(null, 'book', storage), null);
});

test('armazenamento bloqueado ou corrompido não derruba o formulário', () => {
  const storage = memoryStorage();
  storage.setItem('annotation-draft:v1:user:book', '{');
  assert.equal(readAnnotationDraft('user', 'book', storage), null);
  storage.setItem('annotation-draft:v1:user:book', JSON.stringify({ ...draft(), tipo: 'inválido' }));
  assert.equal(readAnnotationDraft('user', 'book', storage), null);
  const blocked = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.equal(readAnnotationDraft('user', 'book', blocked), null);
  assert.equal(writeAnnotationDraft('user', 'book', draft(), blocked), false);
  assert.equal(writeAnnotationDraft('user', 'book', draft(), null), false);
});

test('mantém rascunho até a confirmação do salvamento', async () => {
  const storage = memoryStorage();
  const original = draft();
  const confirmation = deferred();
  let submitted: Anotacao | undefined;
  const pending = persistAnnotationDraft({ userId: 'user', itemId: 'book', draft: original, storage,
    save: async annotation => { submitted = annotation; await confirmation.promise; },
  });
  assert.deepEqual(readAnnotationDraft('user', 'book', storage), original);
  assert.equal(submitted?.texto, original.texto.trim());
  assert.equal(submitted?.capituloRef, 'pág. 42');
  assert.equal(submitted?.userId, 'user');
  assert.equal(submitted?.itemId, 'book');
  confirmation.resolve();
  await pending;
  assert.equal(readAnnotationDraft('user', 'book', storage), null);
});

test('falha mantém texto completo; tentar novamente reutiliza o id e limpa após sucesso', async () => {
  const storage = memoryStorage();
  const original = draft();
  const ids: string[] = [];
  await assert.rejects(persistAnnotationDraft({ userId: 'user', itemId: 'book', draft: original, storage,
    save: async annotation => { ids.push(annotation.id); throw new Error('offline'); },
  }), /offline/);
  const recovered = readAnnotationDraft('user', 'book', storage);
  assert.deepEqual(recovered, original);
  await persistAnnotationDraft({ userId: 'user', itemId: 'book', draft: recovered!, storage,
    save: async annotation => { ids.push(annotation.id); },
  });
  assert.deepEqual(ids, [original.id, original.id]);
  assert.equal(readAnnotationDraft('user', 'book', storage), null);
});

test('confirmação atrasada não apaga uma versão nova escrita em outra aba', async () => {
  const storage = memoryStorage();
  const original = draft();
  const confirmation = deferred();
  const pending = persistAnnotationDraft({ userId: 'user', itemId: 'book', draft: original, storage,
    save: () => confirmation.promise,
  });
  const next = { ...original, texto: 'Mais texto digitado na outra aba' };
  writeAnnotationDraft('user', 'book', next, storage);
  confirmation.resolve();
  await pending;
  assert.deepEqual(readAnnotationDraft('user', 'book', storage), next);
});

test('sessão ausente não simula um salvamento confirmado', async () => {
  let called = false;
  await assert.rejects(persistAnnotationDraft({ userId: null, itemId: 'book', draft: draft(), storage: memoryStorage(),
    save: async () => { called = true; },
  }), /Entre novamente/);
  assert.equal(called, false);
});

for (const type of ['ADD_ANNOTATION', 'ADD_ANOTACAO'] as const) {
  test(type + ': nova tentativa não duplica a anotação otimista após perda da confirmação', () => {
    const annotation: Anotacao = { ...draft(), userId: 'user', itemId: 'book', capituloRef: null, contentPotential: false, deletedAt: null };
    const other = { ...annotation, id: 'other' };
    const state = { ...initialState, bibliotecaItems: [{ id: 'book', anotacoes: [other] } as BibliotecaItem] };
    const action = (note: Anotacao): AppAction => type === 'ADD_ANNOTATION'
      ? { type, payload: note }
      : { type, payload: { itemId: 'book', anotacao: note } };
    const optimistic = appReducer(state, action(annotation));
    const retried = appReducer(optimistic, action({ ...annotation, texto: 'Texto revisado antes da nova tentativa' }));
    const notes = retried.bibliotecaItems[0].anotacoes;
    assert.equal(notes.length, 2);
    assert.equal(notes.filter(note => note.id === annotation.id).length, 1);
    assert.equal(notes.find(note => note.id === annotation.id)?.texto, 'Texto revisado antes da nova tentativa');
    assert.deepEqual(notes.find(note => note.id === other.id), other);
  });
}
