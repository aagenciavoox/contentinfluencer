interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-10">
      <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-[var(--text-secondary)] font-medium">
          {subtitle}
        </p>
      )}
    </header>
  );
}
