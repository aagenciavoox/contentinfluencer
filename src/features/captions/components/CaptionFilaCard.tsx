import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { DisclosureButton } from '../../../components/ui/DisclosureButton';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Content, ContentPlataforma, Pilar, Serie } from '../../../lib/database';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { getDisplayStatus } from '../../contents/lib/contentPipeline';
import { contaDaRef, iconeDaConta, rotuloConta } from '../../contas/lib/contas';
import { definirLegendaCompartilhada } from '../../editorial/lib/captions';
import { LegendaBaseField } from '../../editorial/components/legendas/LegendaBaseField';
import { PublicacaoLegenda } from '../../editorial/components/legendas/PublicacaoLegenda';
/**
 * Um card por roteiro com publicação pendente. Fechado, mostra o status e as contas;
 * aberto, a legenda-base à esquerda e a publicação escolhida à direita.
 * O texto só vai para o servidor depois de uma pausa, para não salvar a cada tecla.
 */
export function CaptionFilaCard({
  content,
  publicacoes,
  series,
  pilares,
  open,
  onToggle,
  onSave,
}: {
  content: Content;
  publicacoes: ContentPlataforma[];
  series: Serie[];
  pilares: Pilar[];
  open: boolean;
  onToggle: () => void;
  onSave: (content: Content) => Promise<void>;
}) {
  const { state } = useAppContext();
  const bodyId = useId();
  const [draft, setDraft] = useState(content);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(publicacoes[0]?.id ?? null);
  const draftRef = useRef(content);
  const timerRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const editorial = state.editorial;
  const serie = series.find(item => item.id === content.seriesId) ?? null;
  const pilar = pilares.find(item => item.id === content.pilarId) ?? null;
  const visiveis = publicacoes.map(item => draft.plataformas.find(atual => atual.id === item.id) ?? item);
  const selecionada = visiveis.find(item => item.id === selecionadaId) ?? visiveis[0] ?? null;
  const status = getDisplayStatus(draft);
  const baseVazia = !(draft.legendaBase ?? '').trim();
  const titulo = content.title.trim() || 'Sem título';

  const rotuloDa = (publicacao: ContentPlataforma) => {
    const conta = contaDaRef(publicacao.platformId, state.platforms);
    return conta ? rotuloConta(conta) : publicacao.platformId;
  };
  const iconeDa = (publicacao: ContentPlataforma) => {
    const conta = contaDaRef(publicacao.platformId, state.platforms);
    return conta ? iconeDaConta(conta) : publicacao.platformId;
  };

  useEffect(() => {
    if (timerRef.current != null) return;
    draftRef.current = content;
    setDraft(content);
  }, [content]);

  useEffect(() => () => {
    if (timerRef.current == null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    void onSaveRef.current(draftRef.current);
  }, []);

  const queue = (next: Content, immediate = false) => {
    draftRef.current = next;
    setDraft(next);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    if (immediate) {
      timerRef.current = null;
      void onSaveRef.current(next);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void onSaveRef.current(draftRef.current);
    }, 500);
  };

  return (
    <Surface padding="none" className="min-w-0">
      <div className="p-2">
        <DisclosureButton
          open={open}
          onToggle={onToggle}
          controls={bodyId}
          className="min-h-14 px-3"
          trailing={(
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Badge variant="status" status={status}>{status}</Badge>
              {!open && baseVazia ? <Badge variant="neutral">Legenda-base vazia</Badge> : null}
              <span className="flex items-center gap-2 pl-1" aria-label={visiveis.map(rotuloDa).join(', ')}>
                {visiveis.map(publicacao => (
                  <PlatformIcon key={publicacao.id} platform={iconeDa(publicacao)} colored className="h-5 w-5" />
                ))}
              </span>
            </span>
          )}
        >
          <Text variant="sectionTitle" as="h2" className="min-w-0 truncate">{titulo}</Text>
        </DisclosureButton>
      </div>

      {open ? (
        <div id={bodyId} className="stack-md px-4 pb-4">
          <div className="grid gap-6 rounded-[var(--radius-card)] border border-[var(--border-color)] p-4 lg:grid-cols-2 lg:gap-0">
            <div className="min-w-0 lg:border-r lg:border-[var(--border-color)] lg:pr-6">
              <LegendaBaseField
                id={`fila-base-${content.id}`}
                value={draft.legendaBase ?? ''}
                minRows={10}
                placeholder="Escreva a legenda-base deste conteúdo…"
                descricao="Atualiza as publicações que usam a base. Versões próprias e textos já publicados são preservados."
                onChange={texto => {
                  const resultado = definirLegendaCompartilhada({
                    legendaBaseAtual: draft.legendaBase,
                    novoTexto: texto,
                    publicacoes: draft.plataformas,
                    conteudo: draft,
                  });
                  queue({ ...draft, legendaBase: resultado.legendaBase, plataformas: resultado.publicacoes });
                }}
              />
            </div>
            <div className="stack-md min-w-0 lg:pl-6">
              <Text variant="bodyStrong" as="h3">Publicação em edição</Text>
              {visiveis.length > 1 ? (
                <SegmentTabs<string>
                  ariaLabel={`Publicação de ${titulo}`}
                  className="max-w-full"
                  value={selecionada?.id ?? ''}
                  onChange={setSelecionadaId}
                  options={visiveis.map(publicacao => ({
                    id: publicacao.id,
                    label: rotuloDa(publicacao),
                    icon: <PlatformIcon platform={iconeDa(publicacao)} colored className="h-4 w-4" />,
                  }))}
                />
              ) : null}
              {selecionada ? (
                <PublicacaoLegenda
                  key={selecionada.id}
                  publicacao={selecionada}
                  conteudo={draft}
                  contas={state.platforms}
                  serie={serie}
                  pilar={pilar}
                  editorial={editorial}
                  compact
                  painel
                  onChange={proximas => {
                    const antes = draft.plataformas.find(item => item.id === selecionada.id);
                    const depois = proximas.find(item => item.id === selecionada.id);
                    const imediato = Boolean(antes && depois && antes.legendaPropria !== depois.legendaPropria);
                    queue({ ...draft, plataformas: proximas }, imediato);
                  }}
                />
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            {visiveis.length > 1 ? (
              <p className="flex items-center gap-2 t-secondary text-[var(--text-secondary)]">
                <Info className="h-4 w-4 shrink-0" aria-hidden />
                Troque a conta para revisar a legenda e as hashtags de cada publicação.
              </p>
            ) : <span />}
            <Link
              to={buildContentDetailRoute(content.id, 'publicacao')}
              state={{ from: '/criacao/legendas' }}
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] t-secondary font-semibold text-[var(--text-primary)] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              Abrir roteiro
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </Surface>
  );
}
