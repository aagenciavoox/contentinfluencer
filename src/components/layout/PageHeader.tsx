interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, className = "" }: PageHeaderProps) {
  return (
    <header className={`mb-8 md:mb-12 ${className}`}>
      <h1 className="t-page-title">
        {title}
      </h1>
      {subtitle && (
        <p className="t-secondary mt-2 max-w-2xl md:mt-4">
          {subtitle}
        </p>
      )}
    </header>
  );
}
