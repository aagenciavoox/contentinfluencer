import { Text } from '../../../components/ui/Text';
import { dia } from '../../../lib/dates';
import { formatarNota } from '../lib/avaliacaoCriterios';

interface BookSummaryProps {
  progresso: { atual: number; total: number } | null;
  dataInicio: string | null;
  dataFim: string | null;
  /** Média de 0 a 5; nula quando ainda não há nota. */
  nota: number | null;
  anotacoes: number;
  roteiros: number;
}

// Como o seletor de data: vale o dia do calendário. Um "2026-10-26T00:00Z" inteiro viraria 25/10 no Brasil.
function diaDaFicha(value: string) {
  const data = value.slice(0, 10);
  return dia(/^\d{4}-\d{2}-\d{2}$/.test(data) ? data : value);
}

/**
 * Resumo da obra embaixo da capa, na aba Info: o que a ficha diz em uma olhada.
 * Linhas sem valor (sem datas, sem nota) não aparecem; anotações e roteiros sempre.
 */
export function BookSummary({ progresso, dataInicio, dataFim, nota, anotacoes, roteiros }: BookSummaryProps) {
  const percentual = progresso
    ? Math.min(100, Math.round((progresso.atual / progresso.total) * 100))
    : null;

  const linhas: { rotulo: string; valor: string }[] = [
    ...(progresso && percentual !== null
      ? [{ rotulo: 'Progresso', valor: `${percentual}% · ${progresso.atual}/${progresso.total}` }]
      : []),
    ...(dataInicio ? [{ rotulo: 'Início', valor: diaDaFicha(dataInicio) }] : []),
    ...(dataFim ? [{ rotulo: 'Fim', valor: diaDaFicha(dataFim) }] : []),
    ...(nota !== null ? [{ rotulo: 'Nota', valor: `${formatarNota(Math.round(nota * 10) / 10)} de 5` }] : []),
    { rotulo: 'Anotações', valor: String(anotacoes) },
    { rotulo: 'Roteiros', valor: String(roteiros) },
  ];

  return (
    <section aria-label="Resumo da obra" className="border-t border-[var(--border-color)] pt-4">
      <dl className="stack-sm">
        {linhas.map(linha => (
          <div key={linha.rotulo} className="flex items-baseline justify-between gap-3">
            <Text variant="meta" as="dt">{linha.rotulo}</Text>
            <Text variant="secondary" as="dd" className="text-right tabular-nums text-[var(--text-primary)]">{linha.valor}</Text>
          </div>
        ))}
      </dl>
    </section>
  );
}
