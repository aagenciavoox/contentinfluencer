import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Mail,
  Lock,
  ArrowRight,
  Fingerprint,
  ChevronRight,
  AlertCircle,
  Loader2,
  User as UserIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { ERRORS } from '../../../lib/uiCopy';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';

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

export function LoginPage() {
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
    setIsRegister(prev => !prev);
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
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
            }
          }
        });

        if (error) throw error;

        setSuccess(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) throw error;
      }
    } catch (err) {
      setError(normalizeAuthError(err as AuthFailure));
    } finally {
      setLoading(false);
    }
  };

  const firstName = name.trim().split(' ')[0] || 'criador';

  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] flex items-center justify-center p-6 relative overflow-hidden">

      <div className="absolute inset-x-0 top-0 h-24 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/90" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[var(--text-primary)] rounded-lg flex items-center justify-center text-[var(--bg-primary)] shadow-[var(--shadow-soft)] mb-5">
            <Fingerprint className="w-7 h-7" />
          </div>
          <Text variant="sectionTitle" as="h1" className="mb-1 font-semibold tracking-normal">
            Skript
          </Text>
          <p className="t-secondary font-normal tracking-normal text-center">
            A sua Central de Produção Inteligente
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-8">

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <ArrowRight className="w-6 h-6" />
                </div>

                <Text variant="sectionTitle" as="h2" className="mb-2 text-lg font-semibold tracking-normal">
                  Quase lá, {firstName}!
                </Text>

                <p className="text-sm text-[var(--text-secondary)] px-4 leading-relaxed">
                  Enviamos um link para <span className="font-bold">{email}</span>.
                  Confirme para entrar.
                </p>

                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="mt-8 touch-target interactive-press text-sm font-medium tracking-normal underline"
                >
                  Voltar ao login
                </button>
              </motion.div>
            ) : (
              <motion.div key="form">

                <div className="mb-8">
                  <Text variant="sectionTitle" as="h2" className="text-xl font-semibold tracking-normal">
                    {isRegister ? 'Criar Conta' : 'Entrar'}
                  </Text>
                </div>

                <form onSubmit={handleSubmit} className="stack-lg">

                  {isRegister && (
                    <div>
                      <label htmlFor="name" className="t-meta font-medium text-[var(--text-tertiary)]">
                        Nome
                      </label>
                      <input
                        id="name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full input"
                        placeholder="Seu nome"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="t-meta font-medium text-[var(--text-tertiary)]">
                      E-mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full input"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="t-meta font-medium text-[var(--text-tertiary)]">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full input pr-10"
                      />
                      <button
                        type="button"
                        aria-label="Mostrar senha"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 touch-target interactive-press inline-flex items-center justify-center"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="text-red-500 text-xs">
                      {error}
                    </div>
                  )}

                  <AppButton
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={loading}
                    className={cn('interactive-press', loading && 'opacity-50')}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Continuar'}
                  </AppButton>
                </form>

                <div className="mt-6 text-center">
                  <button type="button" onClick={handleToggleMode} className="touch-target interactive-press text-xs underline">
                    {isRegister ? 'Já tem conta?' : 'Criar conta'}
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}


