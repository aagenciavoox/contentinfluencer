import {BookOpen, CalendarDays, Flag, Megaphone, Pencil, Send, Users, type LucideIcon} from 'lucide-react';
import type {AgendaTipo} from '../lib/agendaEventos';

const ICONE: Record<AgendaTipo, LucideIcon> = {
  'Reunião': Users,
  'Escrever roteiro': Pencil,
  'Enviar roteiro': Send,
  'Publicação': Megaphone,
  'Período de leitura': BookOpen,
  'Outro': CalendarDays,
  'Entrega': Flag,
};

export function AgendaTipoIcon({
  tipo,
  className = 'h-3.5 w-3.5',
}: {
  tipo: string | null | undefined;
  className?: string;
}) {
  const Icone = ICONE[tipo as AgendaTipo] ?? CalendarDays;
  return <Icone className={className} aria-hidden />;
}
