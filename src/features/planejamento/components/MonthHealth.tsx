import {useState} from 'react';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import type {Pilar, Serie} from '../../../lib/database';
import type {GradeEntry} from '../../editorial/lib/gradeEntries';
import type {GradeCounts, LinhaContagem} from '../../editorial/lib/gradeCounts';
import {FUNCAO_CURTA, FUNIL_DA_FUNCAO, isFuncaoEditorial} from '../../editorial/lib/funcoes';
import {seriesDoPilarNoMes} from '../lib/monthHealth';

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
  onOpen,
}: {
  label: string;
  color: string | null;
  linha: LinhaContagem;
  onOpen?: () => void;
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
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="min-w-0 truncate rounded-[var(--radius-sm)] text-left text-[var(--text-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Text variant="meta" as="span">{label}</Text>
            </button>
          ) : (
            <Text variant="meta" as="span" className="truncate text-[var(--text-primary)]">{label}</Text>
          )}
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
  entries,
  series,
  pilares,
  temDistribuicao,
}: {
  counts: GradeCounts;
  entries: readonly GradeEntry[];
  series: readonly Serie[];
  pilares: readonly Pilar[];
  temDistribuicao: boolean;
}) {
  const [pilarAberto, setPilarAberto] = useState<string | null>(null);
  const corDoPilar = new Map(pilares.map(pilar => [pilar.id, pilar.cor?.trim() || null]));
  const pilar = pilares.find(item => item.id === pilarAberto) ?? null;
  const seriesDoPilar = pilar ? seriesDoPilarNoMes(pilar.id, series, entries) : [];
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
              onOpen={() => setPilarAberto(linha.id)}
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
      <Dialog
        open={Boolean(pilar)}
        onClose={() => setPilarAberto(null)}
        desktopMaxW="max-w-md"
        ariaLabel={pilar ? `Séries de ${pilar.nome}` : 'Séries do pilar'}
      >
        {pilar ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader title={pilar.nome} onClose={() => setPilarAberto(null)} />
            <OverlayBody>
              <div className="stack-md">
                <Text variant="secondary">
                  Séries deste pilar e quantas vezes cada uma entrou neste mês.
                </Text>
                {seriesDoPilar.length === 0 ? (
                  <Text variant="meta" className="text-[var(--text-secondary)]">
                    Este pilar ainda não tem séries.
                  </Text>
                ) : (
                  <ul className="stack-sm">
                    {seriesDoPilar.map(item => (
                      <li key={item.id} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {item.cor ? (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{backgroundColor: item.cor}}
                              aria-hidden
                            />
                          ) : null}
                          <Text variant="itemTitle" as="span" className="min-w-0 whitespace-normal break-words">
                            {item.nome}
                          </Text>
                        </span>
                        <Text variant="meta" as="span" className="shrink-0 text-[var(--text-secondary)]">
                          {item.quantidade}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </OverlayBody>
          </div>
        ) : null}
      </Dialog>
    </Surface>
  );
}
