import assert from 'node:assert/strict';
import type { PostingTimeEntry } from '../../../lib/database.ts';
import {
  formatCrossedPostingSummary,
  getCrossedPostingTimesForPilarPlatform,
  isTimeWithinWindow,
} from './pilarPostingSchedule.ts';

const entries: PostingTimeEntry[] = [
  {
    id: '1',
    userId: 'user',
    platformId: 'platform-ig',
    weekday: 2,
    time: '09:00',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    userId: 'user',
    platformId: 'platform-ig',
    weekday: 2,
    time: '18:30',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '3',
    userId: 'user',
    platformId: 'platform-ig',
    weekday: 4,
    time: '12:00',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

{
  assert.equal(isTimeWithinWindow('10:00', '09:00', '12:00'), true);
  assert.equal(isTimeWithinWindow('08:59', '09:00', '12:00'), false);
  assert.equal(isTimeWithinWindow('12:01', '09:00', '12:00'), false);
}

{
  const times = getCrossedPostingTimesForPilarPlatform(
    {
      melhoresDias: [2],
      janelaHorarioInicio: '08:00',
      janelaHorarioFim: '10:00',
    },
    entries,
    'platform-ig',
    2,
  );
  assert.deepEqual(times, ['09:00']);
}

{
  const times = getCrossedPostingTimesForPilarPlatform(
    {
      melhoresDias: [4],
      janelaHorarioInicio: null,
      janelaHorarioFim: null,
    },
    entries,
    'platform-ig',
    2,
  );
  assert.deepEqual(times, []);
}

{
  const summary = formatCrossedPostingSummary(
    {
      melhoresDias: [2, 4],
      janelaHorarioInicio: '08:00',
      janelaHorarioFim: '13:00',
    },
    entries,
    'platform-ig',
    [2, 4],
  );
  assert.match(summary, /Ter/);
  assert.match(summary, /Qui/);
  assert.doesNotMatch(summary, /Nenhum horário de/);
}

console.log('pilarPostingSchedule.test.ts passed');

// --- Programação: horários do pilar naquela conta primeiro; sem eles, os horários gerais da conta.
{
  const { horariosDaProgramacao } = await import('./pilarPostingSchedule.ts');
  const platforms = [{ id: 'platform-ig', nome: 'Instagram', ativo: true }] as unknown as Parameters<typeof horariosDaProgramacao>[0]['platforms'];
  const pilar = { plataformas: [{ pilarId: 'p', platformId: 'platform-ig', hashtags: '', melhoresDias: [2 as const], janelaHorarioInicio: '09:00', janelaHorarioFim: '12:00' }] };
  assert.deepEqual(horariosDaProgramacao({ pilar, postingTimeEntries: entries, platforms, platformId: 'platform-ig', weekday: 2 }), { horarios: ['09:00'], origem: 'pilar' });
  assert.deepEqual(horariosDaProgramacao({ pilar, postingTimeEntries: entries, platforms, platformId: 'platform-ig', weekday: 4 }), { horarios: ['12:00'], origem: 'conta' }, 'dia fora do pilar usa o horário da conta');
  assert.deepEqual(horariosDaProgramacao({ pilar: { plataformas: [] }, postingTimeEntries: entries, platforms, platformId: 'platform-ig', weekday: 2 }).horarios, ['09:00', '18:30']);
}