import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Fingerprint, ChevronRight, AlertCircle, Loader2, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            }
          }
        });
        if (error) throw error;
        setSuccess(true);
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--text-primary)] opacity-[0.03] rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--text-primary)] opacity-[0.03] rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[var(--text-primary)] rounded-[2rem] flex items-center justify-center text-[var(--bg-primary)] shadow-2xl mb-6 group hover:scale-110 transition-transform duration-500">
            <Fingerprint className="w-9 h-9 animate-pulse text-[var(--bg-primary)]" />
          </div>
          <h1 className="text-[14px] font-black uppercase tracking-[0.8em] italic text-[var(--text-primary)] mb-2">
            Content OS
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">
            A sua Central de Produção Inteligente
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl bg-opacity-80">
          
          <AnimatePresence mode='wait'>
            {success ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <ArrowRight className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black italic uppercase tracking-wider text-[var(--text-primary)] mb-2">
                  Quase Lá, {name.split(' ')[0]}!
                </h2>
                <p className="text-xs opacity-60 px-4 leading-relaxed">
                  Enviamos um link de confirmação para <span className="font-bold">{email}</span>. Por favor, valide sua conta para entrar.
                </p>
                <button 
                  onClick={() => setSuccess(false)}
                  className="mt-8 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] underline underline-offset-4"
                >
                  Voltar ao Login
                </button>
              </motion.div>
            ) : (
              <motion.div key="form">
                <div className="mb-8">
                  <h2 className="text-xl font-black italic uppercase tracking-wider text-[var(--text-primary)]">
                    {isRegister ? 'Nova Operação' : 'Acesse seu Brain'}
                  </h2>
                  <div className="w-8 h-1 bg-[var(--text-primary)] mt-3 opacity-20 rounded-full" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Campo Nome (Apenas Registro) */}
                  <AnimatePresence>
                    {isRegister && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                          Nome Completo
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                            <UserIcon className="w-4 h-4 text-[var(--text-primary)]" />
                          </div>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]/40 transition-all placeholder:opacity-20"
                            placeholder="Como quer ser chamado?"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Campo Email */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                      E-mail Profissional
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                        <Mail className="w-4 h-4 text-[var(--text-primary)]" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]/40 transition-all placeholder:opacity-20"
                        placeholder="seu@exemplo.com"
                      />
                    </div>
                  </div>

                  {/* Campo Senha */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                      Senha Segura
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                        <Lock className="w-4 h-4 text-[var(--text-primary)]" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-12 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]/40 transition-all placeholder:opacity-20"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-primary)] opacity-20 hover:opacity-100 transition-opacity"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-red-500 leading-relaxed uppercase tracking-tight">
                        {error}
                      </p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-3xl py-4 font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100",
                      loading && "cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--bg-primary)]" />
                    ) : (
                      <>
                        {isRegister ? 'Finalizar Acesso' : 'Entrar na Operação'}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Link */}
                <div className="mt-10 pt-6 border-t border-[var(--border-color)] flex flex-col items-center gap-4">
                  <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest text-center italic leading-relaxed">
                    {isRegister ? 'Já é da casa?' : 'Ainda não tem conta?'}
                  </p>
                  <button 
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2 group underline underline-offset-4 decoration-2"
                  >
                    {isRegister ? 'Fazer Login' : 'Criar Conta Gratuita'}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Brand Copyright */}
        <div className="mt-10 text-center">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-20">
            © 2026 Content Influencer OS — Premium Data Security
          </p>
        </div>
      </motion.div>
    </div>
  );
}
