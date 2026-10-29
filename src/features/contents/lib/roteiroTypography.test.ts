import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  DEFAULT_ROTEIRO_TYPOGRAPHY,
  normalizeRoteiroTypography,
  ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY,
} from './roteiroTypography.ts';

describe('normalizeRoteiroTypography', () => {
  it('usa o padrão quando o valor é inválido', () => {
    assert.deepEqual(normalizeRoteiroTypography(null), DEFAULT_ROTEIRO_TYPOGRAPHY);
    assert.deepEqual(normalizeRoteiroTypography({font: 'nope', size: 99}), {
      font: 'default',
      size: 16,
    });
  });

  it('mantém fonte e tamanho válidos', () => {
    assert.deepEqual(normalizeRoteiroTypography({font: 'roboto-mono', size: 12}), {
      font: 'roboto-mono',
      size: 12,
    });
  });
});

describe('ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY', () => {
  it('é a chave de preferência compartilhada entre roteiros', () => {
    assert.equal(ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY, 'roteiro_typography');
  });
});
