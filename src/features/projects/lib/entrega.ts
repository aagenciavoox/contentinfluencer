import type {AgendaItem, Projeto} from '../../../lib/database.ts';

export type EntregaDoProjeto = {
  /** `passou`: a última data combinada já foi e o projeto segue aberto. */
  tipo: 'proxima' | 'passou';
  data: string;
  titulo: string;
};

type Marco = {data: string; titulo: string};

export function projetoConcluido(status: string | null | undefined): boolean {
  const normalized = (status ?? '').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return normalized === 'concluido' || normalized === 'concluida';
}

/**
 * A data que importa num projeto aberto: o evento, etapa ou data final mais perto a partir de hoje.
 * Sem nada à frente, o último marco que passou é lembrado, para o projeto não ficar "Em aberto" calado.
 */
export function entregaDoProjeto(
  projeto: Pick<Projeto, 'status' | 'dataFim' | 'etapas'>,
  eventos: readonly Pick<AgendaItem, 'date' | 'title'>[],
  hoje: string,
): EntregaDoProjeto | null {
  if (projetoConcluido(projeto.status)) return null;

  const marcos: Marco[] = [
    ...eventos
      .filter(evento => Boolean(evento.date))
      .map(evento => ({data: evento.date.slice(0, 10), titulo: evento.title.trim() || 'Evento'})),
    ...projeto.etapas
      .filter(etapa => etapa.dataPrazo && !projetoConcluido(etapa.status))
      .map(etapa => ({data: etapa.dataPrazo!.slice(0, 10), titulo: etapa.nome.trim() || 'Etapa'})),
    ...(projeto.dataFim ? [{data: projeto.dataFim.slice(0, 10), titulo: 'Data final'}] : []),
  ];

  const proximo = marcos
    .filter(marco => marco.data >= hoje)
    .sort((left, right) => left.data.localeCompare(right.data))[0];
  if (proximo) return {tipo: 'proxima', ...proximo};

  const ultimo = marcos
    .filter(marco => marco.data < hoje)
    .sort((left, right) => right.data.localeCompare(left.data))[0];
  return ultimo ? {tipo: 'passou', ...ultimo} : null;
}
