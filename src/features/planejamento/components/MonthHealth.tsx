import {useId, useState, type ReactNode} from 'react';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {DisclosureButton} from '../../../components/ui/DisclosureButton';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import type {Pilar, Serie} from '../../../lib/database';
import type {GradeEntry} from '../../editorial/lib/gradeEntries';
import type {GradeCounts, LinhaContagem} from '../../editorial/lib/gradeCounts';
import {FUNCAO_CURTA, FUNIL_DA_FUNCAO, isFuncaoEditorial} from '../../editorial/lib/funcoes';
import {foraDaContaDoMes, seriesDoPilarNoMes, textoForaDaConta, tomDaSaude, type TomDaSaude} from '../lib/monthHealth';

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

// Fichas do tamanho do nome: crescem para ocupar a linha e quebram para a próxima quando não cabem.
const CARD_GRID = 'flex flex-wrap gap-2';

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
  // Desde a Fase 4 o pilar não orça a grade: sem meta, a ficha mostra só o planejado,
  // sem "de" solto, sem barra e sem tom vermelho contra uma meta que não existe.
  const meta = linha.meta !== null && linha.meta > 0 ? linha.meta : null;
  const estado = meta !== null ? tomDaSaude(linha.planejado, meta) : null;
  const pct = meta !== null ? Math.min(100, Math.round((linha.planejado / meta) * 100)) : 0;
  const situacao = estado === 'completo' ? 'completo' : estado === 'passou' ? 'passou' : null;
  const resumo = meta !== null
    ? `${linha.planejado} de ${meta}`
    : `${linha.planejado} ${linha.planejado === 1 ? 'previsto' : 'previstos'}`;
  return (
    <Surface
      padding="none"
      onClick={onOpen}
      title={situacao ? `${label}: ${resumo}, ${situacao}` : `${label}: ${resumo}`}
      aria-label={onOpen ? `${label}: ${resumo}. Ver séries` : undefined}
      className="flex w-auto min-w-[9rem] max-w-full flex-auto flex-col justify-center gap-1.5 px-3 py-2.5"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{backgroundColor: color ?? 'var(--text-tertiary)'}}
          aria-hidden
        />
        <Text variant="body" as="span" className="min-w-0 flex-1 truncate pr-2">
          {label}
        </Text>
        <Text variant="bodyStrong" as="span" className="shrink-0 tabular-nums">
          {meta !== null ? (
            <>
              {linha.planejado}
              <span className="font-normal text-[var(--text-secondary)]"> de {meta}</span>
            </>
          ) : (
            <>
              {linha.planejado}
              <span className="sr-only">{linha.planejado === 1 ? ' previsto' : ' previstos'}</span>
            </>
          )}
        </Text>
      </span>
      {estado !== null ? (
        <span className="block h-1 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]" aria-hidden>
          <span
            className="block h-full rounded-full"
            style={{width: `${pct}%`, backgroundColor: TOM_COLOR[estado]}}
          />
        </span>
      ) : null}
    </Surface>
  );
}

export function MonthHealth({
  counts,
  entries,
  series,
  pilares,
  temDistribuicao,
  outrasRedes = 0,
  collapsible = false,
}: {
  counts: GradeCounts;
  /** Publicações do mês só fora da rede de referência; entram só na explicação. */
  outrasRedes?: number;
  entries: readonly GradeEntry[];
  series: readonly Serie[];
  pilares: readonly Pilar[];
  temDistribuicao: boolean;
  /** Celular: fecha numa linha ("14 de 35 espaços") e abre a grade dos pilares no toque. */
  collapsible?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const corpoId = useId();
  const [pilarAberto, setPilarAberto] = useState<string | null>(null);
  const corDoPilar = new Map(pilares.map(pilar => [pilar.id, pilar.cor?.trim() || null]));
  const pilar = pilares.find(item => item.id === pilarAberto) ?? null;
  const seriesDoPilar = pilar ? seriesDoPilarNoMes(pilar.id, series, entries) : [];
  const pilarInativo = new Set(pilares.filter(item => !item.ativo).map(item => item.id));
  // Pilar inativo só aparece se ainda tiver algo no mês; senão some, como em Editorial › Período.
  const linhasDePilar = counts.pilares.filter(linha => !pilarInativo.has(linha.id) || linha.planejado > 0);
  const semMeta = counts.totalMeta === 0 && linhasDePilar.length === 0;
  const notaForaDaConta = textoForaDaConta(foraDaContaDoMes(counts, entries, outrasRedes));

  const resumo = counts.totalMeta > 0 ? (
    <Text variant="meta" as="span" className="shrink-0 text-[var(--text-secondary)]">
      <span className="font-semibold text-[var(--text-primary)]">{counts.somaPlanejado}</span> de {counts.totalMeta} espaços
    </Text>
  ) : null;

  const corpo: ReactNode = (
    <>
      {semMeta ? (
        <Text variant="meta" as="p" className="mt-3 text-[var(--text-secondary)]">
          Defina o limite semanal em Editorial › Ajustes para comparar o mês.
        </Text>
      ) : (
        <div className={`mt-3 ${CARD_GRID}`}>
          {linhasDePilar.map(linha => (
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
        <Text variant="meta" as="p" className="mt-3 text-[var(--text-secondary)]">
          A distribuição por objetivo aparece quando a proporção estiver salva no Editorial.
        </Text>
      ) : null}
      {counts.notaSoma ? (
        <Text variant="meta" as="p" className="mt-1 text-[var(--text-secondary)]">{counts.notaSoma}</Text>
      ) : null}
      {notaForaDaConta ? (
        <Text variant="meta" as="p" className="mt-1 text-[var(--text-secondary)]">{notaForaDaConta}</Text>
      ) : null}
    </>
  );

  const detalhe = (
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
                              className="entity-color-dot h-2.5 w-2.5 shrink-0 rounded-full"
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
  );

  if (collapsible) {
    return (
      <Surface padding="none" className="p-1">
        <DisclosureButton open={aberto} onToggle={() => setAberto(open => !open)} controls={corpoId} trailing={resumo}>
          <Text variant="sectionTitle" as="span">Distribuição do mês</Text>
        </DisclosureButton>
        {aberto ? (
          <div id={corpoId} className="px-2 pb-2">
            <Text variant="secondary" as="p" className="mt-1 text-[var(--text-secondary)]">
              Rascunhos do mês e conteúdos com data, comparados ao Editorial.
            </Text>
            {corpo}
          </div>
        ) : null}
        {detalhe}
      </Surface>
    );
  }

  return (
    <Surface padding="md">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <Text variant="sectionTitle">Distribuição do mês</Text>
          <Text variant="secondary" className="border-l border-[var(--border-color)] pl-3 text-[var(--text-secondary)]">
            Rascunhos do mês e conteúdos com data, comparados ao Editorial.
          </Text>
        </div>
        {counts.totalMeta > 0 ? (
          <Text variant="meta" className="text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{counts.somaPlanejado}</span> de {counts.totalMeta} espaços
          </Text>
        ) : null}
      </div>
      {corpo}
      {detalhe}
    </Surface>
  );
}
