import { partesValorVazio } from '../../lib/textMeasure';

/** Valor ausente: o traço é visual; o leitor de tela ouve “sem valor” uma vez. */
export function ValorVazio({ className }: { className?: string }) {
  const partes = partesValorVazio();
  return (
    <span className={className}>
      <span aria-hidden>{partes.visual}</span>
      <span className="sr-only">{partes.leitor}</span>
    </span>
  );
}
