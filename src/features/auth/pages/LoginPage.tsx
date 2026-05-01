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

function normalizeAuthError(message: string) {
  const msg = message.toLowerCase();

  if (msg.includes('invalid login')) return 'E-mail ou senha inválidos.';
  if (msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (msg.includes('password')) return 'A senha deve ter pelo menos 6 caracteres.';

  return 'Não foi possível concluir a autenticação.';
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
      setError('A senha deve ter pelo menos 6 caracteres.');
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
    } catch (err: any) {
      setError(normalizeAuthError(err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const firstName = name.trim().split(' ')[0] || 'criador';

  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--text-primary)] opacity-[0.03] rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--text-primary)] opacity-[0.03] rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[var(--text-primary)] rounded-[2rem] flex items-center justify-center text-[var(--bg-primary)] shadow-2xl mb-6">
            <Fingerprint className="w-9 h-9 animate-pulse" />
          </div>
          <h1 className="text-[14px] font-black uppercase tracking-[0.8em] italic text-[var(--text-primary)] mb-2">
            Content OS
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 text-center">
            A sua Central de Produção Inteligente
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl bg-opacity-80">

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <ArrowRight className="w-6 h-6" />
                </div>

                <h2 className="text-lg font-black uppercase tracking-wider text-[var(--text-primary)] mb-2">
                  Quase lá, {firstName}!
                </h2>

                <p className="text-xs opacity-60 px-4 leading-relaxed">
                  Enviamos um link para <span className="font-bold">{email}</span>.
                  Confirme para entrar.
                </p>

                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="mt-8 touch-target interactive-press text-[10px] font-black uppercase tracking-widest underline"
                >
                  Voltar ao login
                </button>
              </motion.div>
            ) : (
              <motion.div key="form">

                <div className="mb-8">
                  <h2 className="text-xl font-black uppercase tracking-wider text-[var(--text-primary)]">
                    {isRegister ? 'Criar Conta' : 'Entrar'}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                  {isRegister && (
                    <div>
                      <label htmlFor="name" className="text-[9px] uppercase opacity-40">
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
                    <label htmlFor="email" className="text-[9px] uppercase opacity-40">
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
                    <label htmlFor="password" className="text-[9px] uppercase opacity-40">
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

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn("w-full button-primary interactive-press", loading && "opacity-50")}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Continuar'}
                  </button>
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


