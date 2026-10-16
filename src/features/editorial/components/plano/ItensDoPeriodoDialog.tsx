import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, ListChecks } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import { Dialog } from '../../../../components/overlays/Dialog';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { useAppContext } from '../../../../context/AppContext';
import type { FuncaoEditorial } from '../../../../lib/database';
import { buildDetailBackState } from '../../../../lib/navigation/detailBack';
import { buildContentDetailRoute } from '../../../contents/lib/contentDetailRoute';
import { EncaixeDialog } from '../../../planejamento/components/EncaixeDialog';
import type { PlanejamentoPostIt } from '../../../planejamento/lib/postIt';
import { ETAPA_LABEL, ETAPAS, type Etapa } from '../../lib/etapas';
import { etapaDoItem } from '../../lib/gradeCounts';
import type { GradeEntry } from '../../lib/gradeEntries';

/** Qual célula da tabela foi aberta. `objetivo` null é a linha "Sem objetivo". */
export type FiltroDosItens = {
  titulo: string;
  objetivo: FuncaoEditorial | null;
  etapas: readonly Etapa[];
};

const STATUS_DA_ETAPA: Partial<Record<Etapa, string>> = {
  ideia: 'Ideia',
  roteiro: 'Roteiro',
  producao: 'Produção',
  postado: 'Postado',
};

/** Aba da Criação que mostra a etapa. Mais de uma etapa abre "Todos". */
const ABA_DA_ETAPA: Partial<Record<Etapa, string>> = {
  ideia: 'ideias',
  roteiro: 'roteiros',
  producao: 'producao',
  postado: 'publicados',
};

function dataCurta(data: string | null): string {
  if (!data) return 'Sem data';
  return format(parseISO(data), "EEE, d 'de' MMM", { locale: ptBR });
}

export function linkDaCriacao(filtro: FiltroDosItens, periodo: { inicio: string; fim: string }): string | null {
  if (!filtro.objetivo) return null;
  const etapas = filtro.etapas.filter(etapa => etapa !== 'planejamento');
  if (etapas.length === 0) return null;
  const aba = etapas.length === 1 ? ABA_DA_ETAPA[etapas[0]] : 'todos';
  const params = new URLSearchParams({
    tab: aba ?? 'todos',
    funcao: filtro.objetivo,
    de: periodo.inicio,
    ate: periodo.fim,
  });
  return `/criacao?${params.toString()}`;
}

/**
 * Os itens de uma célula da Distribuição por objetivo: quais são, de verdade.
 * Conteúdo abre o roteiro; post-it sem conteúdo abre "Ver o que encaixa".
 */
export function ItensDoPeriodoDialog({
  filtro,
  itens,
  periodo,
  onClose,
}: {
  filtro: FiltroDosItens | null;
  itens: readonly GradeEntry[];
  periodo: { inicio: string; fim: string };
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [encaixe, setEncaixe] = useState<PlanejamentoPostIt | null>(null);
  const postIts = state.postIts ?? [];

  const doFiltro = filtro
    ? itens
      .filter(item => item.funcao === filtro.objetivo)
      .filter(item => filtro.etapas.includes(etapaDoItem(item)))
      .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? '') || a.id.localeCompare(b.id))
    : [];
  const grupos = ETAPAS
    .filter(etapa => filtro?.etapas.includes(etapa))
    .map(etapa => ({ etapa, itens: doFiltro.filter(item => etapaDoItem(item) === etapa) }))
    .filter(grupo => grupo.itens.length > 0);
  const linkCriacao = filtro ? linkDaCriacao(filtro, periodo) : null;

  const abrirConteudo = (contentId: string) => {
    onClose();
    navigate(buildContentDetailRoute(contentId, 'roteiro'), buildDetailBackState('/editorial?aba=periodo'));
  };

  const renderItem = (item: GradeEntry) => {
    const etapa = etapaDoItem(item);
    const postIt = item.postItId ? postIts.find(nota => nota.id === item.postItId) ?? null : null;

    if (etapa === 'planejamento') {
      const nota = postIt?.texto.trim();
      return (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[var(--radius-input)] border border-dashed border-[var(--border-color)] px-3 py-2"
        >
          <span className="min-w-0 flex-1">
            <span className="block whitespace-normal break-words text-sm font-semibold text-[var(--text-primary)]">
              {nota || 'Post-it sem nota'}
            </span>
            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
              {dataCurta(item.data)} · só a data
            </Text>
          </span>
          {postIt ? (
            <span className="flex shrink-0 items-center gap-2">
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/planejamento?postit=${encodeURIComponent(postIt.id)}`);
                }}
              >
                Abrir post-it
              </AppButton>
              <AppButton variant="primary" size="sm" onClick={() => setEncaixe(postIt)}>
                Ver o que encaixa
              </AppButton>
            </span>
          ) : null}
        </li>
      );
    }

    const content = state.contents.find(conteudo => conteudo.id === item.contentId) ?? null;
    const serie = item.serieId ? state.series.find(atual => atual.id === item.serieId) ?? null : null;
    const status = STATUS_DA_ETAPA[etapa] ?? '';
    const detalhe = [dataCurta(item.data), serie?.name?.trim()].filter(Boolean).join(' · ');
    return (
      <li key={item.id}>
        <button
          type="button"
          disabled={!content}
          onClick={() => content && abrirConteudo(content.id)}
          className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-default disabled:hover:bg-transparent"
        >
          <span className="min-w-0 flex-1">
            <span className="block whitespace-normal break-words text-sm font-semibold text-[var(--text-primary)]">
              {content?.title?.trim() || 'Sem título'}
            </span>
            <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">{detalhe}</Text>
          </span>
          <Badge variant="status" status={status}>{status}</Badge>
        </button>
      </li>
    );
  };

  return (
    <>
      <Dialog open={Boolean(filtro)} onClose={onClose} desktopMaxW="max-w-lg" ariaLabel={filtro?.titulo ?? 'Itens do período'}>
        <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
          <OverlayHeader
            title={filtro?.titulo ?? ''}
            subtitle={doFiltro.length === 1 ? '1 item neste período' : `${doFiltro.length} itens neste período`}
            icon={<ListChecks className="h-6 w-6 text-[var(--brand-accent-text)]" />}
            onClose={onClose}
          />
          <OverlayBody>
            {doFiltro.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-secondary)]">Nada aqui neste período.</Text>
            ) : (
              <div className="stack-lg">
                {grupos.map(grupo => (
                  <section key={grupo.etapa} className="stack-sm">
                    {grupos.length > 1 || filtro?.etapas.length !== 1 ? (
                      <Text variant="label" as="h3" className="text-[var(--text-secondary)]">
                        {ETAPA_LABEL[grupo.etapa]} · {grupo.itens.length}
                      </Text>
                    ) : null}
                    <ul className="stack-sm">{grupo.itens.map(renderItem)}</ul>
                  </section>
                ))}
              </div>
            )}
          </OverlayBody>
          {linkCriacao ? (
            <OverlayFooter className="justify-end">
              <AppButton
                variant="secondary"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => {
                  onClose();
                  navigate(linkCriacao);
                }}
              >
                Abrir na Criação
              </AppButton>
            </OverlayFooter>
          ) : null}
        </div>
      </Dialog>
      <EncaixeDialog postIt={encaixe} onClose={() => setEncaixe(null)} zIndex="z-[140]" />
    </>
  );
}
