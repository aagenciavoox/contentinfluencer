import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, ArrowRight, ArrowLeft, Check, SkipForward, Rocket, Sparkles, Layout, Target, Zap, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BottomSheetModal } from './BottomSheetModal';

const STEPS = ['Boas-vindas', 'DNA da Voz', 'Pilares', 'Séries', 'Pronto!'];

export function Onboarding() {
  const { state, dispatch } = useAppContext();
  const [step, setStep] = useState(0);

  // Passo 1 — DNA
  const [promessa, setPromessa] = useState(state.dnaVoz.promessaCentral);
  const [publico, setPublico] = useState(state.dnaVoz.publico);
  const [tom, setTom] = useState(state.dnaVoz.tom);

  // Passo 2 — Pilares (toggle ativo/inativo)
  const [pilaresAtivos, setPilaresAtivos] = useState<Set<string>>(
    new Set(state.pilares.filter(p => p.ativo).map(p => p.id))
  );

  // Passo 3 — Séries (toggle ativa/inativa)
  const [seriesAtivas, setSeriesAtivas] = useState<Set<string>>(
    new Set(state.series.filter(s => s.ativa !== false).map(s => s.id))
  );

  const completar = () => {
    // Salvar DNA
    dispatch({
      type: 'UPDATE_DNA_VOZ',
      payload: { promessaCentral: promessa, publico, tom },
    });

    // Salvar pilares ativos/inativos
    state.pilares.forEach(p => {
      const deveAtivo = pilaresAtivos.has(p.id);
      if (p.ativo !== deveAtivo) {
        dispatch({ type: 'UPDATE_PILAR', payload: { ...p, ativo: deveAtivo } });
      }
    });

    // Salvar séries ativas/inativas
    state.series.forEach(s => {
      const deveAtiva = seriesAtivas.has(s.id);
      if ((s.ativa !== false) !== deveAtiva) {
        dispatch({ type: 'UPDATE_SERIES', payload: { ...s, ativa: deveAtiva } });
      }
    });

    dispatch({ type: 'SET_ONBOARDING_COMPLETO', payload: true });
  };

  const pular = () => {
    dispatch({ type: 'SET_ONBOARDING_COMPLETO', payload: true });
  };

  const togglePilar = (id: string) => {
    setPilaresAtivos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSerie = (id: string) => {
    setSeriesAtivas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isLast = step === STEPS.length - 1;

  return (
    <BottomSheetModal open={true} onClose={() => {}} desktopMaxW="max-w-[600px]" zIndex="z-[100]">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-[var(--border-color)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--text-primary)] rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--text-primary)]/10">
            <Fingerprint className="w-6 h-6 text-[var(--bg-primary)] animate-pulse" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Primeiro Acesso</h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] opacity-40">
              Configuração de Operação — {STEPS[step]}
            </p>
          </div>
          <button onClick={pular} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-20 hover:opacity-100 transition-all">
            Pular Guia
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="flex px-10 py-6 gap-2 bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)]">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col gap-2">
              <div
                className={`h-1 rounded-full transition-all duration-700 ${
                  i <= step ? 'bg-[var(--text-primary)] shadow-[0_0_10px_rgba(var(--text-primary-rgb),0.3)]' : 'bg-[var(--border-strong)]'
                }`}
              />
              <span className={`text-[8px] font-black uppercase tracking-tighter text-center transition-opacity duration-500 ${i === step ? 'opacity-100' : 'opacity-0'}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-8 md:px-12 py-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {/* PASSO 0: BOAS-VINDAS */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="text-center space-y-8"
              >
                <div className="relative inline-block">
                  <div className="absolute -inset-4 bg-[var(--text-primary)] opacity-[0.03] rounded-full blur-2xl animate-pulse" />
                  <Rocket className="w-16 h-16 text-[var(--text-primary)] mx-auto relative z-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-[var(--text-primary)] uppercase italic leading-none tracking-tighter mb-4">
                    Seu Content OS <br /> está pronto.
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60 leading-relaxed font-medium">
                    Transformamos caos em escala. Este guia rápido vai configurar os pilares da sua estratégia para você começar com autoridade máxima.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl text-left">
                     <Target className="w-5 h-5 text-[var(--text-primary)] mb-2 opacity-50" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Blindagem</p>
                     <p className="text-[9px] text-[var(--text-secondary)] opacity-50 mt-1 leading-tight">Isole seu processo criativo do algoritmo.</p>
                   </div>
                   <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl text-left">
                     <Zap className="w-5 h-5 text-[var(--text-primary)] mb-2 opacity-50" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Performance</p>
                     <p className="text-[9px] text-[var(--text-secondary)] opacity-50 mt-1 leading-tight">Gere scripts 3x mais rápido com templates.</p>
                   </div>
                </div>
              </motion.div>
            )}

            {/* PASSO 1: DNA da Voz */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-[var(--text-primary)]" />
                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase italic tracking-tighter">O seu DNA</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60 font-medium">
                    Sem DNA, o conteúdo é commodity. Defina sua essência agora.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-40 ml-1">
                      Promessa Central
                    </label>
                    <textarea
                      value={promessa}
                      onChange={e => setPromessa(e.target.value)}
                      placeholder="Ex: Faço você amar ler e rir da vida literária."
                      className="w-full text-sm font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl px-5 py-4 focus:border-[var(--text-primary)]/40 transition-all resize-none text-[var(--text-primary)] placeholder:opacity-20"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-40 ml-1">
                      Público-Alvo
                    </label>
                    <textarea
                      value={publico}
                      onChange={e => setPublico(e.target.value)}
                      placeholder="Ex: Leitoras de Fantasy apaixonadas por dark romance."
                      className="w-full text-sm font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl px-5 py-4 focus:border-[var(--text-primary)]/40 transition-all resize-none text-[var(--text-primary)] placeholder:opacity-20"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-40 ml-1">
                      Tom de Voz Principal
                    </label>
                    <textarea
                      value={tom}
                      onChange={e => setTom(e.target.value)}
                      placeholder="Ex: Irônica, inteligente e viciada em detalhes."
                      className="w-full text-sm font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl px-5 py-4 focus:border-[var(--text-primary)]/40 transition-all resize-none text-[var(--text-primary)] placeholder:opacity-20"
                      rows={2}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASSO 2: Pilares */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                   <div className="flex items-center gap-2 mb-2">
                    <Layout className="w-5 h-5 text-[var(--text-primary)]" />
                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase italic tracking-tighter">Pilares de Ataque</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60 font-medium">
                    Ative os pilares que compõem sua grade semanal. Cada pilar tem hashtags e legenda próprias.
                  </p>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {state.pilares.map(p => (
                    <button
                      key={p.id}
                      onClick={() => togglePilar(p.id)}
                      className={`w-full flex items-center gap-5 px-5 py-4 rounded-3xl border transition-all text-left group ${
                        pilaresAtivos.has(p.id)
                          ? 'border-[var(--text-primary)] bg-[var(--bg-secondary)] shadow-sm'
                          : 'border-[var(--border-color)] opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: `${p.cor}20` }}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.cor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">{p.nome}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] opacity-50 font-bold truncate tracking-tight">{p.descricao}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        pilaresAtivos.has(p.id) ? 'bg-[var(--text-primary)] border-transparent' : 'bg-transparent border-[var(--border-color)]'
                      }`}>
                         {pilaresAtivos.has(p.id) && <Check className="w-3.5 h-3.5 text-[var(--bg-primary)]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASSO 3: Séries */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-[var(--text-primary)]" />
                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase italic tracking-tighter">Máquinas de Vídeo</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60 font-medium">
                    Séries são blocos de conteúdo recorrentes. Elas garantem sua constância.
                  </p>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {state.series.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleSerie(s.id)}
                      className={`w-full flex items-center gap-5 px-5 py-4 rounded-3xl border transition-all text-left ${
                        seriesAtivas.has(s.id)
                          ? 'border-[var(--text-primary)] bg-[var(--bg-secondary)] shadow-sm'
                          : 'border-[var(--border-color)] opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.cor || '#ccc'}20` }}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.cor || '#ccc' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">{s.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] opacity-50 font-bold truncate tracking-tight lowercase">{s.template}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        seriesAtivas.has(s.id) ? 'bg-[var(--text-primary)] border-transparent' : 'bg-transparent border-[var(--border-color)]'
                      }`}>
                         {seriesAtivas.has(s.id) && <Check className="w-3.5 h-3.5 text-[var(--bg-primary)]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASSO 4: FINALIZAÇÃO */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-8"
              >
                <div className="relative inline-block">
                  <div className="absolute -inset-6 bg-[var(--accent-green)] opacity-[0.1] rounded-full blur-3xl animate-pulse" />
                  <div className="w-20 h-20 bg-[var(--accent-green)] rounded-[2rem] flex items-center justify-center mx-auto relative z-10 shadow-xl shadow-[var(--accent-green)]/20 animate-bounce transition-all duration-1000">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                </div>

                <div>
                   <h3 className="text-3xl font-black text-[var(--text-primary)] uppercase italic leading-none tracking-tighter mb-4">
                    Motor Preparado.
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60 leading-relaxed font-medium px-4">
                    Sua estrutura base foi configurada. Agora você pode pular para o Inventário e começar a capturar ideias.
                  </p>
                </div>

                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] p-8 grid grid-cols-2 gap-y-6 gap-x-4">
                   <div className="flex flex-col items-center">
                     <p className="text-xl font-black text-[var(--text-primary)] tracking-tighter">{pilaresAtivos.size}</p>
                     <p className="text-[8px] font-black uppercase tracking-widest opacity-30">Pilares Ativos</p>
                   </div>
                   <div className="flex flex-col items-center">
                     <p className="text-xl font-black text-[var(--text-primary)] tracking-tighter">{seriesAtivas.size}</p>
                     <p className="text-[8px] font-black uppercase tracking-widest opacity-30">Máquinas Ativas</p>
                   </div>
                   <div className="col-span-2 flex items-center justify-center gap-3 py-2 bg-[var(--bg-primary)] rounded-full border border-[var(--border-color)]">
                      <ShieldCheck className="w-4 h-4 text-[var(--accent-green)] opacity-60" />
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Regras de Ouro Ativadas</p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Botões de navegação */}
        <div className="flex gap-4 px-8 md:px-12 py-8 border-t border-[var(--border-color)] pb-safe bg-[var(--bg-primary)]">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-4 rounded-[1.5rem] border border-[var(--border-strong)] text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-40 hover:opacity-100 hover:bg-[var(--bg-secondary)] transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) completar();
              else setStep(s => s + 1);
            }}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-[1.5rem] bg-[var(--text-primary)] text-[var(--bg-primary)] text-[11px] font-black uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all shadow-2xl shadow-[var(--text-primary)]/20"
          >
            {isLast ? (
              <>
                Entrar na Operação
                <Rocket className="w-4 h-4" />
              </>
            ) : (
              <>
                Continuar
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
    </BottomSheetModal>
  );
}

// Ícones adicionais necessários
function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

