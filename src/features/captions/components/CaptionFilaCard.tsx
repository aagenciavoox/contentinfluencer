import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Content, ContentPlataforma, Pilar, Serie } from '../../../lib/database';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { getDisplayStatus } from '../../contents/lib/contentPipeline';
import { definirLegendaCompartilhada } from '../../editorial/lib/captions';
import { LegendaBaseField } from '../../editorial/components/legendas/LegendaBaseField';
import { PublicacaoLegenda } from '../../editorial/components/legendas/PublicacaoLegenda';
import { getEditorialSettings } from '../../editorial/lib/editorialSettings';

/**
 * Um card por publicação pendente. A base e a versão usam as mesmas peças do roteiro.
 * O texto só vai para o servidor depois de uma pausa, para não salvar a cada tecla.
 */
export function CaptionFilaCard({
  content,
  publicacoes,
  series,
  pilares,
  onSave,
}: {
  content: Content;
  publicacoes: ContentPlataforma[];
  series: Serie[];
  pilares: Pilar[];
  onSave: (content: Content) => Promise<void>;
}) {
  const { state } = useAppContext();
  const [draft, setDraft] = useState(content);
  const draftRef = useRef(content);
  const timerRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const editorial = getEditorialSettings(state.preferences);
  const serie = series.find(item => item.id === content.seriesId) ?? null;
  const pilar = pilares.find(item => item.id === content.pilarId) ?? null;
  const visiveis = publicacoes.map(item => draft.plataformas.find(atual => atual.id === item.id) ?? item);
  const status = getDisplayStatus(draft);

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
    <Surface padding="sm" className="stack-sm min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={buildContentDetailRoute(content.id, 'publicacao')}
          state={{ from: '/criacao/legendas' }}
          className="min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Text variant="itemTitle" truncate>{content.title.trim() || 'Sem título'}</Text>
        </Link>
        <Badge variant="status" status={status}>
          {status}
        </Badge>
      </div>
      <LegendaBaseField
        id={`fila-base-${content.id}`}
        compact
        value={draft.legendaBase ?? ''}
        descricao="Alterar a base atualiza as publicações deste roteiro que ainda a acompanham. Versões próprias e textos já publicados ficam."
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
      {visiveis.map(atual => (
        <PublicacaoLegenda
          key={atual.id}
          publicacao={atual}
          conteudo={draft}
          contas={state.platforms}
          serie={serie}
          pilar={pilar}
          editorial={editorial}
          compact
          onChange={proximas => {
            const antes = draft.plataformas.find(item => item.id === atual.id);
            const depois = proximas.find(item => item.id === atual.id);
            const imediato = Boolean(antes && depois && antes.legendaPropria !== depois.legendaPropria);
            queue({ ...draft, plataformas: proximas }, imediato);
          }}
        />
      ))}
    </Surface>
  );
}
