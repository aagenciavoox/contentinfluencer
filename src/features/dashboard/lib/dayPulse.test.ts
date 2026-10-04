import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDayPulse, formatDayTitle, localDateKey } from './dayPulse.ts';

describe('dayPulse', () => {
  it('formats the weekday and the date in Portuguese', () => {
    assert.equal(formatDayTitle(new Date(2026, 9, 2)), 'Sexta, 2 de outubro');
    assert.equal(localDateKey(new Date(2026, 9, 2, 23, 30)), '2026-10-02');
  });

  it('describes an empty day', () => {
    assert.deepEqual(
      buildDayPulse({ readyCount: 0, showCounts: true, agendaToday: [], urgentProjects: [] }),
      [
        { label: 'Nenhum roteiro pronto' },
        { label: 'nada na agenda', to: '/calendario' },
      ],
    );
  });

  it('puts the first appointment and a near deadline on the same line', () => {
    const segments = buildDayPulse({
      readyCount: 13,
      showCounts: true,
      agendaToday: [
        { title: 'Lançamento', time: '15:00' },
        { title: 'Call', time: null },
      ],
      urgentProjects: [{ id: 'p1', nome: 'Campanha', dataFim: '2026-10-08' }],
    });

    assert.deepEqual(segments, [
      { label: '13 roteiros prontos' },
      { label: 'Lançamento · 15:00 e mais 1', to: '/calendario' },
      { label: 'Campanha · 8 de outubro', to: '/projetos/p1' },
    ]);
  });

  it('does not claim an empty day while the domains are still loading', () => {
    const segments = buildDayPulse({
      readyCount: 0,
      showCounts: true,
      agendaToday: [],
      urgentProjects: [],
      dataReady: false,
    });

    assert.deepEqual(segments, [
      { label: 'Roteiros prontos para gravar' },
      { label: 'Agenda do dia', to: '/calendario' },
    ]);
  });

  it('hides raw counts when the gentle setting is off', () => {
    const segments = buildDayPulse({
      readyCount: 4,
      showCounts: false,
      agendaToday: [
        { title: 'A', time: null },
        { title: 'B', time: null },
      ],
      urgentProjects: [
        { id: 'p1', nome: 'Um', dataFim: '2026-10-03' },
        { id: 'p2', nome: 'Dois', dataFim: '2026-10-04' },
      ],
    });

    assert.equal(segments[0]?.label, 'Roteiros prontos para gravar');
    assert.equal(segments[1]?.label, 'Compromissos na agenda');
    assert.equal(segments[2]?.label, 'Prazos esta semana');
  });
});
