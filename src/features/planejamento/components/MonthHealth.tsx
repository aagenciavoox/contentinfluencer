import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import type {Pilar} from '../../../lib/database';
import type {GradeCounts, LinhaContagem} from '../../editorial/lib/gradeCounts';
import {FUNCAO_CURTA, FUNIL_DA_FUNCAO, isFuncaoEditorial} from '../../editorial/lib/funcoes';

const FUNIL_COLOR = {
  topo: 'var(--accent-blue)',
  meio: 'var(--accent-purple)',
  fundo: 'var(--accent-orange)',
  fora: 'var(--text-tertiary)',
} as const;

function tom(planejado: number, meta: number): 'met' | 'deficit' | 'over' {
  if (meta <= 0) return planejado > 0 ? 'over' : 'met';
  if (planejado > meta) return 'over';
  if (planejado < meta) return 'deficit';
  return 'met';
}

const TOM_COLOR = {
  met: 'var(--accent-green)',
  deficit: 'var(--accent-orange)',
  over: 'var(--accent-red)',
} as const;

function HealthRow({
  label,
  color,
  linha,
}: {
  label: string;
  color: string | null;
  linha: LinhaContagem;
}) {
  const estado = tom(linha.planejado, linha.meta);
  const pct = linha.meta > 0
    ? Math.min(100, Math.round((linha.planejado / linha.meta) * 100))
    : linha.planejado > 0 ? 100 : 0;
  return (
    <div className="min-w-[10rem] flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {color ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{backgroundColor: color}}
              aria-hidden
            />
          ) : null}
          <Text variant="meta" as="span" className="truncate text-[var(--text-primary)]">{label}</Text>
        </span>
        <Text variant="meta" as="span" className="shrink-0 text-[var(--text-secondary)]">
          {linha.planejado} de {linha.meta}
        </Text>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]">
        <div
          className="h-full rounded-full"
          style={{width: `${pct}%`, backgroundColor: TOM_COLOR[estado]}}
        />
      </div>
    </div>
  );
}

export function MonthHealth({
  counts,
  pilares,
  temDistribuicao,
}: {
  counts: GradeCounts;
  pilares: readonly Pilar[];
  temDistribuicao: boolean;
}) {
  const corDoPilar = new Map(pilares.map(pilar => [pilar.id, pilar.cor?.trim() || null]));
  const semMeta = counts.totalMeta === 0 && counts.pilares.length === 0;

  return (
    <Surface padding="sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Text variant="sectionTitle">Saúde do mês</Text>
        {counts.totalMeta > 0 ? (
          <Text variant="meta" className="text-[var(--text-secondary)]">
            {counts.somaPlanejado} de {counts.totalMeta} espaços
          </Text>
        ) : null}
      </div>
      <Text variant="secondary" className="mt-1">
        Post-its de ideia e roteiro neste mês, mais o que já tem data, contra os espaços e a distribuição do editorial.
      </Text>
      {semMeta ? (
        <Text variant="meta" className="mt-3 text-[var(--text-secondary)]">
          Os pilares ainda não têm espaços por semana. Defina isso no editorial para comparar o mês.
        </Text>
      ) : (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3">
          {counts.pilares.map(linha => (
            <HealthRow
              key={linha.id}
              label={linha.rotulo}
              color={corDoPilar.get(linha.id) ?? null}
              linha={linha}
            />
          ))}
        </div>
      )}
      {temDistribuicao && counts.funcoes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3 border-t border-[var(--border-color)] pt-3">
          {counts.funcoes.map(linha => {
            const funcao = isFuncaoEditorial(linha.id) ? linha.id : null;
            const etapa = funcao ? FUNIL_DA_FUNCAO[funcao] : null;
            return (
              <HealthRow
                key={linha.id}
                label={funcao ? FUNCAO_CURTA[funcao] : linha.rotulo}
                color={FUNIL_COLOR[etapa ?? 'fora']}
                linha={linha}
              />
            );
          })}
        </div>
      ) : !semMeta && !temDistribuicao ? (
        <Text variant="meta" className="mt-3 text-[var(--text-secondary)]">
          A distribuição por função aparece quando estiver salva no editorial.
        </Text>
      ) : null}
      {counts.notaSoma ? (
        <Text variant="meta" className="mt-3 text-[var(--text-secondary)]">{counts.notaSoma}</Text>
      ) : null}
    </Surface>
  );
}
