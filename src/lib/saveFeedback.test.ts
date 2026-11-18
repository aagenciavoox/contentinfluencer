import assert from 'node:assert/strict';
import { normalizeProfileAuthError } from '../features/settings/lib/profileAuth.ts';
import { acaoDoTipo, causaDoErro, ehErroDeRede, ehErroDeSessao, getErrorMessage, mensagemDeErro, UserFacingError } from './saveFeedback.ts';

// Rede: sem internet, pedido que não saiu ou tempo esgotado.
assert.equal(ehErroDeRede(new TypeError('Failed to fetch'), true), true);
assert.equal(ehErroDeRede(new Error('contents: TypeError: Failed to fetch'), true), true);
assert.equal(ehErroDeRede(new TypeError('Load failed'), true), true, 'Safari');
assert.equal(ehErroDeRede({ message: 'fetch failed', cause: { code: 'ECONNRESET' } }, true), true);
assert.equal(ehErroDeRede(new Error('qualquer coisa'), false), true, 'aparelho offline');
const abortado = new Error('signal is aborted');
abortado.name = 'AbortError';
assert.equal(ehErroDeRede(abortado, true), true);
// Servidor respondeu e não aceitou: não é conexão.
assert.equal(ehErroDeRede(new Error('planejamento_post_its: column "redes" does not exist'), true), false);
assert.equal(ehErroDeRede({ message: 'new row violates row-level security policy', code: '42501' }, true), false);
assert.equal(ehErroDeRede(undefined, true), false);

// Sessão: só com sinal claro (JWT, refresh token, 401). RLS sozinho não conta.
assert.equal(ehErroDeSessao({ message: 'JWT expired', code: 'PGRST301' }), true);
assert.equal(ehErroDeSessao(new Error('update content: JWT expired')), true, 'mensagem embrulhada');
assert.equal(ehErroDeSessao({ name: 'AuthSessionMissingError', message: 'Auth session missing!' }), true);
assert.equal(ehErroDeSessao({ message: 'Unauthorized', status: 401 }), true);
assert.equal(ehErroDeSessao({ message: 'new row violates row-level security policy', code: '42501' }), false);
assert.equal(ehErroDeSessao(new TypeError('Failed to fetch')), false);

// Causa: offline vence; sessão antes de rede; tempo esgotado do banco é servidor.
assert.equal(causaDoErro(new Error('JWT expired'), false), 'rede');
assert.equal(causaDoErro(new Error('JWT expired'), true), 'sessao');
assert.equal(causaDoErro(new TypeError('Failed to fetch'), true), 'rede');
assert.equal(causaDoErro({ message: 'canceling statement due to statement timeout', code: '57014' }, true), 'servidor');
assert.equal(causaDoErro(new Error('column "redes" does not exist'), true), 'servidor');

// Mensagem: nomeia a ação e a causa certa.
assert.equal(mensagemDeErro('criar o roteiro', new TypeError('Failed to fetch'), true), 'Não foi possível criar o roteiro. Verifique sua conexão e tente de novo.');
assert.equal(mensagemDeErro('criar o roteiro', new Error('violates check constraint'), true), 'Não foi possível criar o roteiro. O servidor não aceitou o pedido.');
assert.equal(mensagemDeErro('salvar o roteiro', { message: 'JWT expired' }, true), 'Não foi possível salvar o roteiro. Sua sessão terminou. Entre de novo para continuar.');
assert.equal(mensagemDeErro('salvar a alteração', new UserFacingError('Tema não pode ser uma série.'), true), 'Não foi possível salvar a alteração.', 'o motivo vai no detalhe');
assert.equal(getErrorMessage(new UserFacingError('Tema não pode ser uma série.'), 'criar o bloco'), 'Tema não pode ser uma série.');
assert.match(getErrorMessage(new Error('qualquer'), 'criar o bloco'), /^Não foi possível criar o bloco\./);
assert.match(getErrorMessage(new Error('qualquer')), /^Não foi possível salvar\./);

// Ação pelo tipo gravado.
assert.equal(acaoDoTipo('DELETE_MULTIPLE_CONTENTS'), 'mover os roteiros para a lixeira');
assert.equal(acaoDoTipo('DELETE_CONTENT'), 'mover o roteiro para a lixeira');
assert.equal(acaoDoTipo('ADD_SERIE'), 'criar o item');
assert.equal(acaoDoTipo('DELETE_PILAR'), 'excluir o item');
assert.equal(acaoDoTipo('MOVER_EPISODIOS'), 'mover os episódios');
assert.equal(acaoDoTipo('UPDATE_SERIE'), 'salvar a alteração');
// Perfil: rede culpa a conexão; o resto não.
assert.equal(normalizeProfileAuthError('Failed to fetch'), 'Não foi possível salvar a alteração. Verifique sua conexão e tente de novo.');
assert.equal(normalizeProfileAuthError('Database error saving new user'), 'Não foi possível salvar a alteração. O servidor não aceitou o pedido.');
console.log('saveFeedback (erro de rede, sessão e mensagem): ok');
