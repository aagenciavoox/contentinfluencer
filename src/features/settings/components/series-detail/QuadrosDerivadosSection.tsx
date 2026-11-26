import { ArrowRight, Layers, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import type { Content, Serie } from '../../../../lib/database';
import { isActiveCreation } from '../../../contents/lib/contentWorkflow';
import { etapaDoStatus } from '../../../editorial/lib/etapas';
import { rotuloDoFoco } from '../../../editorial/lib/focoTemporada';
import { normalizarRedesPostIt } from '../../../planejamento/lib/redesPostIt';
import { textoQuantidade } from '../../lib/selecaoEpisodios';

const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com']);

function monograma(nome: string): string {
  const limpo = nome.trim();
  if (!limpo) return 'QD';
  const palavras = limpo
    .split(/\s+/)
    .filter(palavra => palavra.length > 0 && !CONECTORES.has(palavra.toLowerCase()));
  if (palavras.length >= 2) {
    return `${palavras[0][0]}${palavras[1][0]}`.toUpperCase();
  }
  return limpo.slice(0, 2).toUpperCase();
}

function resumoDoQuadro(conteudos: readonly Content[]): { corVar: string; texto: string } {
  let producao = 0;
  let roteiro = 0;
  let publicados = 0;
  let ideias = 0;

  for (const item of conteudos) {
    const etapa = etapaDoStatus(item.status);
    if (etapa === 'producao' || etapa === 'edicao') producao += 1;
    else if (etapa === 'roteiro') roteiro += 1;
    else if (etapa === 'postado') publicados += 1;
    else ideias += 1;
  }

  if (producao > 0) return { corVar: 'var(--status-production)', texto: `${producao} em produção` };
  if (roteiro > 0) return { corVar: 'var(--status-writing)', texto: `${roteiro} em roteiro` };
  if (publicados > 0) return { corVar: 'var(--status-posted)', texto: textoQuantidade(publicados, 'publicado', 'publicados') };
  if (ideias > 0) return { corVar: 'var(--status-idea)', texto: textoQuantidade(ideias, 'ideia', 'ideias') };
  return { corVar: 'var(--text-tertiary)', texto: 'Sem episódios ainda' };
}

/**
 * Quadros derivados ligados à série atual (desktop).
 * Mostra apenas dados reais dos quadros filhos e seus episódios ativos.
 */
export function QuadrosDerivadosSection({
  serie,
  quadros,
  contents,
  onNovoQuadro,
}: {
  serie: Serie;
  quadros: readonly Serie[];
  contents: readonly Content[];
  onNovoQuadro: () => void;
}) {
  if (quadros.length === 0) return null;

  return (
    <Surface variant="outlined" padding="lg" as="section" aria-label="Quadros derivados vinculados" className="stack-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 stack-xs">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 shrink-0 text-[var(--brand-accent-text)]" aria-hidden />
            <Text variant="sectionTitle" as="h2" className="text-[var(--text-primary)]">
              Quadros derivados vinculados
            </Text>
          </div>
          <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">
            Subformatos ligados a esta série para organizar recortes e derivar episódios.
          </Text>
        </div>

        <AppButton
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onNovoQuadro}
        >
          Novo quadro derivado
        </AppButton>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {quadros.map(quadro => {
          const nome = quadro.name?.trim() || 'Sem nome';
          const episodios = contents.filter(item => item.seriesId === quadro.id && isActiveCreation(item));
          const resumo = resumoDoQuadro(episodios);
          const foco = normalizarRedesPostIt(quadro.focoRedes ?? []);
          const subtitulo = quadro.notes?.trim()
            || (foco.length > 0 ? rotuloDoFoco(foco) : 'Quadro vinculado a esta série');
          const cor = quadro.usaCorDaSerie
            ? (serie.cor?.trim() || 'var(--brand-accent-strong)')
            : (quadro.cor?.trim() || serie.cor?.trim() || 'var(--brand-accent-strong)');

          return (
            <div
              key={quadro.id}
              className="flex flex-col justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-subtle)] p-4 transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="t-label flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] border"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${cor} 20%, var(--bg-elevated))`,
                      borderColor: `color-mix(in srgb, ${cor} 34%, var(--border-color))`,
                      color: `color-mix(in srgb, ${cor} var(--user-tint-text-share), var(--text-primary))`,
                    }}
                    aria-hidden
                  >
                    {monograma(nome)}
                  </div>
                  <div className="min-w-0">
                    <Text variant="itemTitle" as="h3" className="truncate text-[var(--text-primary)]">
                      {nome}
                    </Text>
                    <Text variant="meta" as="p" className="truncate text-[var(--text-secondary)]">
                      {subtitulo}
                    </Text>
                  </div>
                </div>

                <span className="t-meta shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 py-0.5 tabular-nums text-[var(--text-primary)]">
                  {textoQuantidade(episodios.length, 'episódio', 'episódios')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: resumo.corVar }}
                    aria-hidden
                  />
                  <Text variant="meta" as="span" className="truncate text-[var(--text-secondary)]">
                    {resumo.texto}
                  </Text>
                </div>

                <Link
                  to={`/series/${quadro.id}`}
                  className="t-label inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <span>Abrir quadro</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
