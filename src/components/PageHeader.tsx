import { motion } from 'motion/react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className = "" }: PageHeaderProps) {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-12 ${className}`}
    >
      <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight italic leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 text-[13px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em] opacity-80 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.header>
  );
}
