import { BibliotecaItem } from '../../../lib/database';

type BibliotecaTipo = BibliotecaItem['tipo'];
type StatusLeitura = BibliotecaItem['status'];

export const COMPLETED_STATUS_BY_TYPE: Record<BibliotecaTipo, StatusLeitura> = {
  livro: 'Lido',
  manga: 'Lido',
  filme: 'Assistido',
  'série': 'Assistido',
  anime: 'Assistido',
  outro: 'Concluído',
};

export function isCompletedStatus(status: StatusLeitura) {
  return status === 'Lido' || status === 'Assistido' || status === 'Concluído';
}
