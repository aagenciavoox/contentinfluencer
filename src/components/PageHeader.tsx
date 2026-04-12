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
      className={`mb-8 md:mb-12 ${className}`}
    >
      <h1 className="t-display">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 md:mt-4 t-label !text-[var(--text-secondary)] opacity-80 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.header>
  );
}
