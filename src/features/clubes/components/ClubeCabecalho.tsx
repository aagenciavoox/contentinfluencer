import { ArrowLeft, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { Text } from '../../../components/ui/Text';
import { interceptBackLink } from '../../../lib/navigation/goBack';
import { cn } from '../../../lib/utils';
import type { Clube } from '../../../lib/database';
import { ORIGEM_DO_CLUBE } from '../lib/clubeLista';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function contagem(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/**
 * Topo do clube na mesma ordem da série: capa, nome, descrição.
 * O selo Clube separa o nome do título de uma série.
 */
export function ClubeCabecalho({
  clube,
  celular,
  series,
  pastas,
  pecas,
  onNovaSerie,
  onNovaPeca,
  onNovaPasta,
  menu,
}: {
  clube: Clube;
  celular: boolean;
  series: number;
  pastas: number;
  pecas: number;
  onNovaSerie: () => void;
  onNovaPeca: () => void;
  onNovaPasta: () => void;
  menu: MoreMenuItem[];
}) {
  const navigate = useNavigate();
  const nome = clube.nome.trim() || 'Sem nome';
  const descricao = clube.descricao.trim();
  const capa = capaHttp(clube.capaUrl);
  const iniciais = nome.slice(0, 2).toUpperCase();
  const origem = [ORIGEM_DO_CLUBE[clube.origem], clube.url?.trim()].filter(Boolean).join(' · ');

  return (
    <div className="w-full stack-lg">
      {celular ? null : (
        <nav className="flex flex-wrap items-center gap-2 text-[var(--text-secondary)]" aria-label="Caminho">
          <Link
            to="/series"
            onClick={event => interceptBackLink(event, navigate, '/series')}
            className="flex items-center gap-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <Text variant="secondary" as="span">Voltar</Text>
          </Link>
          <span className="text-[var(--text-tertiary)]" aria-hidden>/</span>
          <Text variant="secondary" as="span">Clube</Text>
        </nav>
      )}

      <div className={cn('flex gap-4', celular ? 'flex-col' : 'items-center justify-between')}>
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {capa ? (
            <img src={capa} alt="" className="h-28 w-44 shrink-0 rounded-[var(--radius-card)] object-cover" />
          ) : (
            <div
              className="flex h-28 w-44 shrink-0 items-center justify-center rounded-[var(--radius-card)]"
              style={{ backgroundColor: `${clube.cor || '#e11d48'}18`, color: clube.cor || '#e11d48' }}
              aria-hidden="true"
            >
              <Text variant="sectionTitle" as="span">{iniciais}</Text>
            </div>
          )}
          <div className="min-w-0 flex-1 stack-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="pageTitle" as="h1" className="text-[var(--text-primary)]">{nome}</Text>
              <Badge variant="neutral">Clube</Badge>
            </div>
            {descricao ? (
              <Text variant="secondary" as="p" className="max-w-3xl">{descricao}</Text>
            ) : null}
            {origem ? (
              <Text variant="secondary" as="p">{origem}</Text>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AppButton variant="primary" onClick={onNovaSerie} leftIcon={<Plus className="h-4 w-4" />}>
            Nova série
          </AppButton>
          <AppButton variant="secondary" onClick={onNovaPeca} leftIcon={<Plus className="h-4 w-4" />}>
            Novo arquivo
          </AppButton>
          <AppButton variant="secondary" onClick={onNovaPasta} leftIcon={<Plus className="h-4 w-4" />}>
            Nova pasta
          </AppButton>
          <MoreMenu items={menu} label={`Mais ações de ${nome}`} />
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-3 border-t border-[var(--border-color)] pt-[var(--space-md)]">
        <Text variant="sectionTitle" as="h2">Séries</Text>
        <Text variant="sectionTitle" as="span" className="tabular-nums">{series}</Text>
        <span className="hidden h-5 self-center border-l border-[var(--border-color)] sm:block" aria-hidden />
        <Text variant="secondary" as="p">
          {[
            contagem(pastas, 'pasta', 'pastas'),
            contagem(pecas, 'peça', 'peças'),
          ].join(' · ')}
        </Text>
      </div>
    </div>
  );
}
