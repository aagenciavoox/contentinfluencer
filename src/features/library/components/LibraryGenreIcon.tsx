import {
  BookHeart, Church, Sprout, Brain, Briefcase, Compass, Drama, Feather, FlaskConical, Ghost, Heart, Landmark,
  Laugh, Music, Rocket, Search, Skull, Sparkles, Swords, Tag, Trophy, Baby, type LucideIcon,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { genreIconKey, type LibraryGenreIconKey } from '../lib/libraryGenreIcons';

const ICONS: Record<LibraryGenreIconKey, LucideIcon> = {
  fantasia: Sparkles,
  ficcao: Rocket,
  romance: Heart,
  terror: Ghost,
  suspense: Skull,
  misterio: Search,
  historico: Landmark,
  drama: Drama,
  comedia: Laugh,
  aventura: Compass,
  acao: Swords,
  biografia: BookHeart,
  poesia: Feather,
  autoajuda: Sprout,
  negocios: Briefcase,
  filosofia: Brain,
  infantil: Baby,
  esporte: Trophy,
  musica: Music,
  religiao: Church,
  ciencia: FlaskConical,
  tag: Tag,
};

export function LibraryGenreIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[genreIconKey(name)];
  return <Icon className={cn('h-4 w-4 shrink-0', className)} aria-hidden />;
}
