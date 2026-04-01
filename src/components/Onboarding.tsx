import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, ArrowRight, ArrowLeft, Check, SkipForward } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const STEPS = ['DNA da Voz', 'Pilares', 'Séries', 'Produção'];

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-[95%] md:w-[600px] max-h-[90vh] bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-[var(--border-color)] flex items-center gap-4">
          <div className="w-10 h-10 bg-[var(--text-primary)] rounded-2xl flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-[var(--bg-primary)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-[var(--text-primary)]">Configurar Content OS</h2>
            <p className="text-xs text-[var(--text-secondary)] opacity-50">
              Passo {step + 1} de {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <button onClick={pular} className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-primary)] opacity-30 hover:opacity-70 transition-opacity">
            <SkipForward className="w-3.5 h-3.5" />
            Pular tudo
          </button>
        </div>

        {/* Stepper */}
        <div className="flex px-8 py-4 gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-1">
              <div
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-strong)]'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            {/* PASSO 0: DNA da Voz */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] mb-1">Qual é o seu DNA?</h3>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60">
                    Defina a essência da sua voz antes de criar qualquer conteúdo.
                  </p>
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    Promessa Central
                  </label>
                  <textarea
                    value={promessa}
                    onChange={e => setPromessa(e.target.value)}
                    placeholder="O que você entrega para quem te segue? Ex: 'Faço você amar ainda mais os livros e rir da sua própria vida de leitora.'"
                    rows={3}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-0 resize-none text-[var(--text-primary)] placeholder:opacity-30"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    Público
                  </label>
                  <textarea
                    value={publico}
                    onChange={e => setPublico(e.target.value)}
                    placeholder="Para quem você cria? Ex: 'Leitoras de 20-35 anos apaixonadas por Fantasy e Dark Romance.'"
                    rows={3}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-0 resize-none text-[var(--text-primary)] placeholder:opacity-30"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    Tom de Voz
                  </label>
                  <textarea
                    value={tom}
                    onChange={e => setTom(e.target.value)}
                    placeholder="Como você fala? Ex: 'Direta, engraçada e inteligente. Fala como a melhor amiga leitora.'"
                    rows={3}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-0 resize-none text-[var(--text-primary)] placeholder:opacity-30"
                  />
                </div>
              </motion.div>
            )}

            {/* PASSO 1: Pilares */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] mb-1">Pilares Editoriais</h3>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60">
                    Esses são os pilares pré-cadastrados para o seu perfil. Ative os que fazem sentido para você.
                  </p>
                </div>

                <div className="space-y-2">
                  {state.pilares.map(p => (
                    <button
                      key={p.id}
                      onClick={() => togglePilar(p.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all text-left ${
                        pilaresAtivos.has(p.id)
                          ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
                          : 'border-[var(--border-color)] opacity-40 hover:opacity-70'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.cor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{p.nome}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] opacity-60 truncate">{p.descricao}</p>
                      </div>
                      {pilaresAtivos.has(p.id) && <Check className="w-4 h-4 text-[var(--accent-green)] shrink-0" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASSO 2: Séries */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] mb-1">Séries Ativas</h3>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60">
                    Quais séries você já faz ou quer começar? Desative as que não se aplicam.
                  </p>
                </div>

                <div className="space-y-2">
                  {state.series.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleSerie(s.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all text-left ${
                        seriesAtivas.has(s.id)
                          ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
                          : 'border-[var(--border-color)] opacity-40 hover:opacity-70'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.cor || '#ccc' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{s.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] opacity-60 truncate">{s.template}</p>
                      </div>
                      {seriesAtivas.has(s.id) && <Check className="w-4 h-4 text-[var(--accent-green)] shrink-0" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASSO 3: Produção */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] mb-1">Estrutura de Produção</h3>
                  <p className="text-sm text-[var(--text-secondary)] opacity-60">
                    Você pode cadastrar seus Looks e Cenários depois em{' '}
                    <strong>Configurações → Looks & Cenários</strong>. Por agora, está tudo pronto para começar!
                  </p>
                </div>

                <div className="bg-[var(--bg-hover)] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-green)] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">
                      <strong>{state.pilares.filter(p => p.ativo).length}</strong> pilares ativos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-green)] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">
                      <strong>{state.series.length}</strong> séries pré-cadastradas
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-green)] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">
                      Regras de Ouro configuradas e prontas para validação
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-blue)]/20 flex items-center justify-center shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                    </div>
                    <p className="text-sm text-[var(--text-primary)] opacity-70">
                      Cadastre seus Looks e Cenários quando quiser em <strong>Configurações</strong>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Botões de navegação */}
        <div className="flex gap-3 px-8 py-6 border-t border-[var(--border-color)]">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-[var(--border-strong)] text-xs font-black uppercase tracking-widest text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-all"
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
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
          >
            {isLast ? (
              <>
                <Check className="w-4 h-4" />
                Começar!
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
