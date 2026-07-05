import {describe, expect, it} from 'vitest';
import {getPostingWindowFromTime, POSTING_WINDOWS} from './postingWindow';

describe('postingWindow', () => {
  it('maps morning hours to Manhã', () => {
    expect(getPostingWindowFromTime('09:00')?.id).toBe('manha');
  });

  it('maps afternoon hours to Tarde', () => {
    expect(getPostingWindowFromTime('14:30')?.id).toBe('tarde');
  });

  it('maps evening hours to Noite', () => {
    expect(getPostingWindowFromTime('20:00')?.id).toBe('noite');
  });

  it('returns null without time', () => {
    expect(getPostingWindowFromTime(null)).toBeNull();
  });

  it('exposes default times for each window', () => {
    expect(POSTING_WINDOWS.map(window => window.defaultTime)).toEqual(['09:00', '14:00', '20:00']);
  });
});
