import type { ElementType, ReactNode } from 'react';
import { ChevronRight, LogOut, Moon, Settings } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { getModuleFlags } from '../../../features/settings/lib/moduleFlags';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useResolvedTheme } from '../../../hooks/useResolvedTheme';
import { buildMobileMenuSections } from '../../../layouts/navigation/navConfig';
import { getUserInitials } from '../../../layouts/navigation/userInitials';
import { cn } from '../../../lib/utils';

/** Linha da lista: 48px, ícone, nome e seta. Cantos acompanham o card na primeira e na última. */
const ROW_CLASS = cn(
  'flex min-h-12 w-full items-center gap-3 px-4 text-left text-[var(--text-primary)]',
  'first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)]',
  'touch-manipulation active:bg-[var(--bg-hover)]',
  'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
);

function RowIcon({ icon: Icon }: { icon: ElementType }) {
  return <Icon className="h-5 w-5 shrink-0 stroke-[1.75] text-[var(--text-tertiary)]" aria-hidden />;
}

function MenuLinkRow({ to, label, icon }: { to: string; label: string; icon: ElementType }) {
  return (
    <Link to={to} className={ROW_CLASS}>
      <RowIcon icon={icon} />
      <Text variant="body" as="span" className="min-w-0 flex-1 truncate">
        {label}
      </Text>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
    </Link>
  );
}

function MenuGroup({ label, children }: { label: string | null; children: ReactNode }) {
  return (
    <section className="stack-sm">
      {label ? (
        <Text variant="eyebrow" as="h2" className="px-1">
          {label}
        </Text>
      ) : null}
      <Surface variant="outlined" padding="none">
        {children}
      </Surface>
    </section>
  );
}

/**
 * Tela Menu do celular (aba ☰ da barra inferior): o que não cabe na barra, nas mesmas seções
 * do menu do desktop, mais perfil, tema e sair. Substitui a gaveta lateral.
 */
export function MenuMobileScreen() {
  const isMobile = useIsMobile();
  const { state, dispatch } = useAppContext();
  const { signOut, user } = useAuth();

  if (!isMobile) return <Navigate to="/criacao" replace />;

  const sections = buildMobileMenuSections(getModuleFlags(state.preferences));
  const userName = user?.user_metadata?.full_name?.trim() || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email ?? '';
  const isDark = useResolvedTheme(state.theme) === 'dark';

  return (
    <div className="stack-lg pb-2">
      <Surface variant="outlined" padding="none">
        <Link to="/configuracoes/perfil" className={cn(ROW_CLASS, 'min-h-16 py-3')}>
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-hover)] t-body-strong text-[var(--text-secondary)]"
          >
            {getUserInitials(userName)}
          </span>
          <span className="min-w-0 flex-1">
            <Text variant="itemTitle" as="span" truncate className="block">
              {userName}
            </Text>
            {userEmail ? (
              <Text variant="meta" as="span" truncate className="block">
                {userEmail}
              </Text>
            ) : null}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
        </Link>
      </Surface>

      {sections.map(section => (
        <MenuGroup key={section.label ?? 'inicio'} label={section.label}>
          {section.items.map(item => (
            <MenuLinkRow key={item.to} to={item.to} label={item.label} icon={item.icon} />
          ))}
        </MenuGroup>
      ))}

      <MenuGroup label="Conta">
        <MenuLinkRow to="/configuracoes" label="Configurações" icon={Settings} />
        <label htmlFor="menu-tema-escuro" className={cn(ROW_CLASS, 'cursor-pointer')}>
          <RowIcon icon={Moon} />
          <Text variant="body" as="span" className="min-w-0 flex-1 truncate">
            Tema escuro
          </Text>
          <ToggleSwitch
            id="menu-tema-escuro"
            enabled={isDark}
            onToggle={() => dispatch({ type: 'SET_THEME', payload: isDark ? 'light' : 'dark' })}
            label="Tema escuro"
          />
        </label>
        <button type="button" onClick={() => void signOut()} className={ROW_CLASS}>
          <RowIcon icon={LogOut} />
          <Text variant="body" as="span" className="min-w-0 flex-1 truncate">
            Sair
          </Text>
        </button>
      </MenuGroup>
    </div>
  );
}
