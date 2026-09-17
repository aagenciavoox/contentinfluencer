import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { ERRORS } from '../../../lib/uiCopy';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useIsMobile } from '../../../hooks/useIsMobile';

type AuthFailure = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

function normalizeAuthError(error: AuthFailure | null | undefined) {
  const msg = (error?.message ?? '').toLowerCase();
  const code = (error?.code ?? '').toLowerCase();

  if (code === 'invalid_credentials' || msg.includes('invalid login')) {
    return 'E-mail e senha nao conferem. Revise os dados e tente novamente.';
  }

  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }

  if (code === 'user_already_exists' || msg.includes('already registered')) {
    return 'Este e-mail já está cadastrado.';
  }

  if (code === 'signup_disabled') {
    return 'Cadastro desativado no Supabase para este projeto.';
  }

  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return 'Verifique o e-mail informado e tente novamente.';
  }

  if (code === 'weak_password' || msg.includes('password')) {
    return 'Use uma senha com pelo menos 6 caracteres.';
  }

  if (code === 'over_email_send_rate_limit') {
    return 'Muitas tentativas de e-mail agora. Aguarde um pouco e tente novamente.';
  }

  return ERRORS.autenticacao;
}

function AuthForm({
  isRegister,
  name,
  email,
  password,
  showPassword,
  loading,
  error,
  success,
  firstName,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onToggleMode,
  onSubmit,
  onBackFromSuccess,
  compact = false,
}: {
  isRegister: boolean;
  name: string;
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string | null;
  success: boolean;
  firstName: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onToggleMode: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBackFromSuccess: () => void;
  compact?: boolean;
}) {
  return (
    <AnimatePresence mode="wait">
      {success ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="stack-lg text-center py-6"
        >
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"
            aria-hidden
          >
            <span className="text-lg font-semibold">✓</span>
          </div>
          <div className="stack-sm">
            <Text variant="sectionTitle" as="h2">
              Quase lá, {firstName}!
            </Text>
            <Text variant="secondary">
              Enviamos um link para{' '}
              <span className="font-semibold text-[var(--text-primary)]">{email}</span>.
              Confirme para entrar.
            </Text>
          </div>
          <AppButton type="button" variant="ghost" onClick={onBackFromSuccess}>
            Voltar ao login
          </AppButton>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <div className={cn('stack-sm', compact ? 'mb-6' : 'mb-8')}>
            <Text variant="eyebrow" uppercase>
              {isRegister ? 'Novo acesso' : 'Bem-vindo de volta'}
            </Text>
            <Text variant={compact ? 'pageTitle' : 'display'} as="h2">
              {isRegister ? 'Criar conta' : 'Entrar'}
            </Text>
            <Text variant="secondary">
              {isRegister
                ? 'Monte seu estúdio e comece a organizar ideias e roteiros.'
                : 'Continue de onde parou no seu estúdio de criação.'}
            </Text>
          </div>

          <form onSubmit={onSubmit} className="stack-lg">
            {isRegister && (
              <label htmlFor="name" className="stack-sm">
                <Text variant="label">Nome</Text>
                <input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full input"
                  placeholder="Seu nome"
                />
              </label>
            )}

            <label htmlFor="email" className="stack-sm">
              <Text variant="label">E-mail</Text>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="w-full input"
                placeholder="email@exemplo.com"
              />
            </label>

            <div className="stack-sm">
              <label htmlFor="password">
                <Text variant="label">Senha</Text>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  className="w-full input pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={onTogglePassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 touch-target interactive-press inline-flex items-center justify-center text-[var(--text-tertiary)]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-[var(--radius-input)] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border-color))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2"
              >
                <Text variant="meta" className="text-[var(--danger)]">
                  {error}
                </Text>
              </div>
            ) : null}

            <AppButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              className={cn('interactive-press', loading && 'opacity-50')}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : isRegister ? 'Criar conta' : 'Entrar'}
            </AppButton>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="touch-target interactive-press text-[length:var(--font-size-footnote)] text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-4"
            >
              {isRegister ? 'Já tem conta? Entrar' : 'Criar conta'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function LoginPage() {
  const isMobile = useIsMobile();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetStates = () => {
    setError(null);
    setSuccess(false);
    setPassword('');
  };

  const handleToggleMode = () => {
    setIsRegister((prev) => !prev);
    resetStates();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setError('Serviço de autenticação indisponível.');
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    if (isRegister && !trimmedName) {
      setError('Informe seu nome.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
            },
          },
        });

        if (signUpError) throw signUpError;

        setSuccess(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(normalizeAuthError(err as AuthFailure));
    } finally {
      setLoading(false);
    }
  };

  const firstName = name.trim().split(' ')[0] || 'criador';

  const formProps = {
    isRegister,
    name,
    email,
    password,
    showPassword,
    loading,
    error,
    success,
    firstName,
    onNameChange: setName,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onTogglePassword: () => setShowPassword((prev) => !prev),
    onToggleMode: handleToggleMode,
    onSubmit: handleSubmit,
    onBackFromSuccess: () => setSuccess(false),
  };

  if (isMobile) {
    return (
      <div className="min-h-dvh w-full bg-[var(--bg-primary)] flex flex-col">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative overflow-hidden bg-[var(--brand-accent)] px-6 pb-8"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 top-8 h-36 w-36 rotate-12 rounded-[var(--radius-xl)] bg-[var(--brand-on-accent)]/15"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 -rotate-12 rounded-[var(--radius-xl)] bg-[var(--brand-fab)]/20"
          />

          <div className="relative z-10 stack-md">
            <Badge
              variant="neutral"
              className="w-fit border-transparent bg-[var(--brand-on-accent)]/20 text-[var(--brand-on-accent)]"
            >
              Estúdio de criação
            </Badge>
            <img
              src="/brand/criaki-logo-dark.png"
              alt="Criaki"
              className="h-16 w-auto max-w-[9.5rem] object-contain object-left"
            />
            <Text variant="body" className="max-w-[18rem] text-[var(--brand-on-accent)] opacity-95">
              Ideias, roteiros, gravação e biblioteca — no seu ritmo.
            </Text>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
          className="relative z-10 -mt-4 flex-1 rounded-t-[var(--radius-card)] bg-[var(--bg-primary)] px-6 pt-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        >
          <AuthForm {...formProps} compact />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full grid lg:grid-cols-2 bg-[var(--bg-primary)]">
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[var(--brand-fab)] px-12 py-12 text-[var(--brand-on-accent)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 20% 15%, color-mix(in srgb, var(--brand-accent) 55%, transparent), transparent 70%), radial-gradient(ellipse 50% 40% at 85% 80%, color-mix(in srgb, var(--brand-accent) 28%, transparent), transparent 65%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-10 top-24 h-24 w-40 rotate-[-28deg] rounded-[var(--radius-xl)] bg-[var(--brand-accent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-28 right-16 h-28 w-28 rotate-12 rounded-[var(--radius-xl)]"
          style={{
            background:
              'conic-gradient(from 210deg at 60% 40%, color-mix(in srgb, var(--brand-accent) 80%, white), transparent 55%)',
          }}
        />

        <div className="relative z-10">
          <Badge
            variant="neutral"
            className="border-transparent bg-[var(--brand-on-accent)]/12 text-[var(--brand-on-accent)]"
          >
            Criaki
          </Badge>
        </div>

        <div className="relative z-10 stack-xl max-w-md">
          <img
            src="/brand/criaki-logo-dark.png"
            alt="Criaki"
            className="h-28 w-auto max-w-[14rem] object-contain object-left"
          />
          <div className="stack-sm">
            <Text variant="display" as="p" className="text-[var(--brand-on-accent)]">
              Seu estúdio de criação
            </Text>
            <Text variant="body" className="text-[var(--brand-on-accent)]/80">
              Ideias, roteiros, gravação e biblioteca — organizados para você produzir no ritmo certo.
            </Text>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/brand/criaki-app-icon.png"
            alt=""
            className="h-10 w-10 rounded-[var(--radius-input)] object-cover"
            aria-hidden
          />
          <Text variant="meta" className="text-[var(--brand-on-accent)]/70">
            Produção com clareza, do briefing ao post.
          </Text>
        </div>
      </motion.aside>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
        className="flex items-center justify-center px-6 py-12"
      >
        <div className="w-full max-w-md">
          <Surface variant="outlined" padding="lg" className="p-8">
            <AuthForm {...formProps} />
          </Surface>
        </div>
      </motion.main>
    </div>
  );
}
