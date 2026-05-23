interface PageHeaderProps {
  title: string;
  /** @deprecated Use inline hints in page content instead. */
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, className = "" }: PageHeaderProps) {
  return (
    <header className={`mb-6 md:mb-8 ${className}`}>
      <h1 className="t-page-title">
        {title}
      </h1>
    </header>
  );
}
