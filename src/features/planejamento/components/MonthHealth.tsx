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
import {seriesDoPilarNoMes, tomDaSaude, type TomDaSaude} from '../lib/monthHealth';

const FUNIL_COLOR = {
  topo: 'var(--accent-blue)',
  meio: 'var(--accent-purple)',
  fundo: 'var(--accent-orange)',
  fora: 'var(--text-tertiary)',
} as const;

const TOM_COLOR: Record<TomDaSaude, string> = {
  vazio: 'var(--accent-red)',
  metade: 'var(--accent-orange)',
  completo: 'var(--accent-green)',
  passou: 'var(--accent-green)',
};

const CARD_GRID = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';

function HealthCard({
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
  const estado = tomDaSaude(linha.planejado, linha.meta);
  const pct = linha.meta > 0
    ? Math.min(100, Math.round((linha.planejado / linha.meta) * 100))
    : linha.planejado > 0 ? 100 : 0;
  const situacao = estado === 'completo' ? 'completo' : estado === 'passou' ? 'passou' : null;
  return (
    <Surface
      padding="sm"
      onClick={onOpen}
      title={label}
      aria-label={onOpen ? `${label}: ${linha.planejado} de ${linha.meta}. Ver séries` : undefined}
      className="flex min-w-0 flex-col gap-2"
    >
      <span className="flex min-w-0 items-start gap-1.5">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{backgroundColor: color ?? 'var(--text-tertiary)'}}
          aria-hidden
        />
        <Text variant="bodyStrong" as="span" className="line-clamp-2 min-w-0 break-words">
          {label}
        </Text>
      </span>
      <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">{linha.planejado}</span> de {linha.meta}
        {situacao ? (
          <span className={estado === 'passou' ? ' text-[var(--accent-red)]' : ' text-[var(--accent-green)]'}>
            {` · ${situacao}`}
          </span>
        ) : null}
      </Text>
      <span className="block h-1 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{width: `${pct}%`, backgroundColor: TOM_COLOR[estado]}}
        />
      </span>
    </Surface>
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
            <span className="font-semibold text-[var(--text-primary)]">{counts.somaPlanejado}</span> de {counts.totalMeta} espaços
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
        <div className={`mt-3 ${CARD_GRID}`}>
          {counts.pilares.map(linha => (
            <HealthCard
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
        <div className={`mt-3 border-t border-[var(--border-color)] pt-3 ${CARD_GRID}`}>
          {counts.funcoes.map(linha => {
            const funcao = isFuncaoEditorial(linha.id) ? linha.id : null;
            const etapa = funcao ? FUNIL_DA_FUNCAO[funcao] : null;
            return (
              <HealthCard
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
