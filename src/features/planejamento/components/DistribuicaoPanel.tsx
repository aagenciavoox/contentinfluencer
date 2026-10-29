import {useState} from 'react';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import type {BibliotecaItem, Pilar, Serie, Tema} from '../../../lib/database';
import type {GradeEntry} from '../../editorial/lib/gradeEntries';
import type {GradeCounts, LinhaContagem} from '../../editorial/lib/gradeCounts';
import {FUNCAO_CURTA, FUNIL_DA_FUNCAO, isFuncaoEditorial} from '../../editorial/lib/funcoes';
import {foraDaContaDoMes, seriesDoPilarNoMes, textoForaDaConta, tomDaSaude, type TomDaSaude} from '../lib/monthHealth';
import {idsDeObras} from '../lib/assuntosObras';

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

function ContagemSimples({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: readonly {id: string; nome: string; quantidade: number}[];
}) {
  if (linhas.length === 0) return null;
  return (
    <section className="stack-sm border-t border-[var(--border-color)] pt-3">
      <Text variant="label" as="h3">{titulo}</Text>
      <ul className="stack-sm">
        {linhas.map(linha => (
          <li key={linha.id} className="flex items-center justify-between gap-3">
            <Text variant="itemTitle" as="span" className="min-w-0 whitespace-normal break-words">
              {linha.nome}
            </Text>
            <Text variant="meta" as="span" className="shrink-0 text-[var(--text-secondary)]">
              {linha.quantidade}
            </Text>
          </li>
        ))}
      </ul>
    </section>
  );
}

function contagemPorCampo(
  entries: readonly GradeEntry[],
  contentsById: ReadonlyMap<string, {temaIds?: string[]; bibliotecaItemId?: string | null; livroIds?: string[]}>,
  campo: 'tema' | 'obra',
  nomes: ReadonlyMap<string, string>,
): {id: string; nome: string; quantidade: number}[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.contaNaGrade || entry.tipo === 'repost') continue;
    const content = contentsById.get(entry.contentId);
    if (!content) continue;
    const ids = campo === 'tema'
      ? (content.temaIds ?? [])
      : idsDeObras({
          bibliotecaItemId: content.bibliotecaItemId ?? null,
          livroIds: content.livroIds,
        });
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, quantidade]) => ({id, nome: nomes.get(id) ?? id, quantidade}))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function DistribuicaoPanel({
  open,
  onClose,
  counts,
  entries,
  series,
  pilares,
  temas,
  obras,
  temDistribuicao,
  outrasRedes = 0,
  contentsById = new Map(),
}: {
  open: boolean;
  onClose: () => void;
  counts: GradeCounts;
  entries: readonly GradeEntry[];
  series: readonly Serie[];
  pilares: readonly Pilar[];
  temas: readonly Tema[];
  obras: readonly Pick<BibliotecaItem, 'id' | 'titulo'>[];
  temDistribuicao: boolean;
  outrasRedes?: number;
  contentsById?: ReadonlyMap<string, {temaIds?: string[]; bibliotecaItemId?: string | null; livroIds?: string[]}>;
}) {
  const [pilarAberto, setPilarAberto] = useState<string | null>(null);
  const corDoPilar = new Map(pilares.map(pilar => [pilar.id, pilar.cor?.trim() || null]));
  const pilar = pilares.find(item => item.id === pilarAberto) ?? null;
  const seriesDoPilar = pilar ? seriesDoPilarNoMes(pilar.id, series, entries) : [];
  const pilarInativo = new Set(pilares.filter(item => !item.ativo).map(item => item.id));
  const linhasDePilar = counts.pilares.filter(linha => !pilarInativo.has(linha.id) || linha.planejado > 0);
  const semMeta = counts.totalMeta === 0 && linhasDePilar.length === 0;
  const notaForaDaConta = textoForaDaConta(foraDaContaDoMes(counts, entries, outrasRedes));

  const assuntos = contagemPorCampo(
    entries,
    contentsById,
    'tema',
    new Map(temas.map(tema => [tema.id, tema.nome.trim()])),
  );
  const obrasLinhas = contagemPorCampo(
    entries,
    contentsById,
    'obra',
    new Map(obras.map(item => [item.id, item.titulo?.trim() || 'Obra'])),
  );

  // Todos os quadros com contagem no período (não só de um pilar).
  const linhasDeQuadro = (() => {
    const quantidade = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.contaNaGrade || !entry.serieId) continue;
      quantidade.set(entry.serieId, (quantidade.get(entry.serieId) ?? 0) + 1);
    }
    return series
      .map(serie => ({
        id: serie.id,
        nome: serie.name?.trim() || 'Sem nome',
        quantidade: quantidade.get(serie.id) ?? 0,
      }))
      .filter(linha => linha.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'));
  })();

  return (
    <>
      <Dialog open={open} onClose={onClose} desktopMaxW="max-w-2xl" ariaLabel="Distribuição do período">
        <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
          <OverlayHeader title="Distribuição do período" onClose={onClose} />
          <OverlayBody>
            <div className="stack-md">
              <Text variant="secondary" className="text-[var(--text-secondary)]">
                Rascunhos e conteúdos com data, comparados ao Editorial.
              </Text>

              {counts.totalMeta != null && counts.totalMeta > 0 ? (
                <Text variant="meta" className="text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">{counts.somaPlanejado}</span>
                  {' '}de {counts.totalMeta} espaços
                </Text>
              ) : null}

              <section className="stack-sm">
                <Text variant="label" as="h3">Pilares</Text>
                {semMeta ? (
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    Defina o limite semanal em Editorial › Ajustes para comparar o período.
                  </Text>
                ) : (
                  <div className={CARD_GRID}>
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
              </section>

              <ContagemSimples titulo="Quadros" linhas={linhasDeQuadro} />
              <ContagemSimples titulo="Assuntos" linhas={assuntos} />
              <ContagemSimples titulo="Obras" linhas={obrasLinhas} />

              {temDistribuicao && counts.funcoes.length > 0 ? (
                <section className="stack-sm border-t border-[var(--border-color)] pt-3">
                  <Text variant="label" as="h3">Objetivos</Text>
                  <div className={CARD_GRID}>
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
                </section>
              ) : !semMeta && !temDistribuicao ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                  A distribuição por objetivo aparece quando a proporção estiver salva no Editorial.
                </Text>
              ) : null}

              {counts.notaSoma ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">{counts.notaSoma}</Text>
              ) : null}
              {notaForaDaConta ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">{notaForaDaConta}</Text>
              ) : null}
            </div>
          </OverlayBody>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(pilar)}
        onClose={() => setPilarAberto(null)}
        desktopMaxW="max-w-md"
        zIndex="z-[140]"
        ariaLabel={pilar ? `Séries de ${pilar.nome}` : 'Séries do pilar'}
      >
        {pilar ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader title={pilar.nome} onClose={() => setPilarAberto(null)} />
            <OverlayBody>
              <div className="stack-md">
                <Text variant="secondary">
                  Séries deste pilar e quantas vezes cada uma entrou neste período.
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
    </>
  );
}
