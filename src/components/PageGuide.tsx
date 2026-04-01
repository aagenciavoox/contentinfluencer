import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ArrowRight, Zap, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface PageGuideProps {
  pageId: string;
  title: string;
  description: string;
  icon?: React.ElementType;
  position?: 'top-right' | 'bottom-right' | 'center';
}

export function PageGuide({ 
  pageId, 
  title, 
  description, 
  icon: Icon = Sparkles,
  position = 'bottom-right' 
}: PageGuideProps) {
  const { state, dispatch } = useAppContext();
  const isViewed = state.viewedGuides.includes(pageId);

  if (isViewed) return null;

  const handleDismiss = () => {
    dispatch({ type: 'MARK_GUIDE_VIEWED', payload: pageId });
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 }
  };

  const posClasses = {
    'top-right': 'top-24 right-6',
    'bottom-right': 'bottom-6 right-6',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`fixed z-[60] w-[320px] ${posClasses[position]} pointer-events-auto`}
      >
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2rem] p-6 shadow-2xl shadow-black/10 backdrop-blur-xl relative overflow-hidden group">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--text-primary)] opacity-[0.02] rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
          
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors opacity-30 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>

          <div className="flex items-start gap-4">
             <div className="w-10 h-10 rounded-[1rem] bg-[var(--text-primary)] flex items-center justify-center shrink-0 shadow-lg">
                <Icon className="w-5 h-5 text-[var(--bg-primary)]" />
             </div>
             
             <div className="flex-1 pt-1">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] mb-1 italic">
                   Dica de Operação
                </h4>
                <h3 className="text-sm font-black text-[var(--text-primary)] leading-tight mb-2">
                   {title}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium opacity-60">
                   {description}
                </p>

                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                   <button 
                    onClick={handleDismiss}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] group/btn"
                   >
                      Entendido
                      <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
