import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ListChecks } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { Dialog } from '../../../components/overlays/Dialog';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { useAppContext } from '../../../context/AppContext';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { FUNCOES, FUNCAO_CURTA } from '../../editorial/lib/funcoes';
import type { FuncaoEditorial } from '../../../lib/database';
import type { ItemSaude } from '../lib/saudeIndicadores';

export type ListaDaSaude = {
  titulo: string;
  subtitulo?: string;
  itens: readonly ItemSaude[];
  tipo?: 'objetivo' | 'padrao';
  /** Configuração ligada ao aviso (ex.: editar a série). */
  acao?: { rotulo: string; rota: string };
};

function dataCurta(data: string | null): string {
  if (!data) return 'Sem data';
  return format(parseISO(data.slice(0, 10)), "EEE, d 'de' MMM", { locale: ptBR });
}

const OPCOES_FUNCAO = [
  { value: '', label: 'Definir objetivo…' },
  ...FUNCOES.map(f => ({ value: f, label: FUNCAO_CURTA[f] })),
];

/** Os conteúdos por trás de um aviso da Saúde. Conteúdo abre o roteiro; post-it abre no Planejamento. */
export function ItensDaSaudeDialog({ lista, onClose }: { lista: ListaDaSaude | null; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppContext();
  const itens = [...(lista?.itens ?? [])].sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));
  const isObjetivo = lista?.tipo === 'objetivo' || (lista?.titulo ?? '').toLowerCase().includes('objetivo');

  const ir = (rota: string, voltar = false) => {
    onClose();
    if (voltar) navigate(rota, buildDetailBackState(`${location.pathname}${location.search}`));
    else navigate(rota);
  };

  const definirObjetivo = (item: ItemSaude, funcao: FuncaoEditorial) => {
    const content = state.contents.find(c => c.id === item.contentId);
    if (content) {
      dispatch({
        type: 'UPDATE_CONTENT',
        payload: { ...content, funcao, funcaoOrigem: 'escolhida' },
      });
      return;
    }
    if (item.postItId) {
      const postIt = (state.postIts ?? []).find(p => p.id === item.postItId);
      if (postIt) {
        dispatch({
          type: 'UPDATE_POST_IT',
          payload: { ...postIt, objetivo: funcao },
        });
      }
    }
  };

  return (
    <Dialog open={Boolean(lista)} onClose={onClose} desktopMaxW="max-w-lg" ariaLabel={lista?.titulo ?? 'Conteúdos'}>
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title={lista?.titulo ?? ''}
          subtitle={lista?.subtitulo ?? (itens.length === 1 ? '1 item' : `${itens.length} itens`)}
          icon={<ListChecks className="h-6 w-6 text-[var(--brand-accent-text)]" />}
          onClose={onClose}
        />
        <OverlayBody>
          <div className="stack-sm">
            {lista?.acao ? (
              <div>
                <AppButton variant="secondary" size="sm" onClick={() => ir(lista.acao!.rota)}>{lista.acao.rotulo}</AppButton>
              </div>
            ) : null}
            {itens.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-secondary)]">Nenhum conteúdo aqui.</Text>
            ) : (
              <ul className="stack-sm">
                {itens.map(item => {
                  const content = state.contents.find(c => c.id === item.contentId) ?? null;
                  const serie = item.serieId ? state.series.find(s => s.id === item.serieId) : null;
                  const postIt = item.postItId ? (state.postIts ?? []).find(p => p.id === item.postItId) : null;
                  const funcaoAtual = content?.funcao ?? postIt?.objetivo ?? null;
                  const detalhe = [dataCurta(item.data), serie?.name?.trim()].filter(Boolean).join(' · ');

                  if (isObjetivo) {
                    return (
                      <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] p-2.5 hover:bg-[var(--bg-hover)]">
                        <div
                          role="button"
                          tabIndex={0}
                          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                          onClick={() => {
                            if (content) ir(buildContentDetailRoute(content.id, 'roteiro'), true);
                            else if (item.postItId) ir(`/planejamento?postit=${encodeURIComponent(item.postItId)}`);
                          }}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                        >
                          <span className="whitespace-normal break-words t-body-strong text-[var(--text-primary)] hover:underline">
                            {content ? content.title?.trim() || 'Sem título' : 'Post-it'}
                          </span>
                          <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">{detalhe}</Text>
                        </div>
                        <div className="shrink-0" onClick={e => e.stopPropagation()}>
                          <SelectField
                            ariaLabel={`Definir objetivo para ${content?.title || 'conteúdo'}`}
                            value={funcaoAtual ?? ''}
                            onChange={val => {
                              if (!val) return;
                              definirObjetivo(item, val as FuncaoEditorial);
                            }}
                            options={OPCOES_FUNCAO}
                            className="min-h-8 t-label"
                          />
                        </div>
                      </li>
                    );
                  }

                  if (!content) {
                    const postItId = item.postItId ?? null;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          disabled={!postItId}
                          onClick={() => postItId && ir(`/planejamento?postit=${encodeURIComponent(postItId)}`)}
                          className="flex w-full flex-col items-start rounded-[var(--radius-input)] border border-dashed border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        >
                          <span className="t-body-strong text-[var(--text-primary)]">Post-it</span>
                          <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{detalhe}</Text>
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => ir(buildContentDetailRoute(content.id, 'roteiro'), true)}
                        className="flex w-full flex-col items-start rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <span className="whitespace-normal break-words t-body-strong text-[var(--text-primary)]">{content.title?.trim() || 'Sem título'}</span>
                        <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{detalhe}</Text>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </OverlayBody>
      </div>
    </Dialog>
  );
}
