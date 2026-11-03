import { Activity } from 'lucide-react';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import type { Serie } from '../../../../lib/database';
import { situacaoDaFrequencia } from '../../../planejamento/lib/saudeIndicadores';
import { CardConfiguracao } from './campos';

function textoDaSituacao(serie: Serie): { texto: string; pode: boolean } {
  const situacao = situacaoDaFrequencia(serie);
  if (situacao.tipo === 'definida') {
    const nome = situacao.freq.unidade === 'semana' ? 'semana' : situacao.freq.unidade === 'quinzena' ? 'quinzena' : 'mês';
    return { texto: `${situacao.freq.vezes ?? 1}× por ${nome}`, pode: true };
  }
  if (situacao.tipo === 'incompleta') return { texto: 'Frequência incompleta: escolha a unidade', pode: false };
  if (situacao.tipo === 'sob-demanda') return { texto: 'Sob demanda', pode: false };
  return { texto: 'Sem frequência definida', pode: false };
}

function ehQuadro(serie: Serie): boolean {
  return serie.tipoAgrupamento === 'quadro' || (serie.tipoAgrupamento == null && Boolean(serie.parentId));
}

/**
 * Quais séries (e quadros com meta própria) entram na Continuidade da Saúde.
 * Cada marcação salva pela mesma ação de atualizar a série.
 */
export function ContinuidadeSeriesCard() {
  const { state, dispatch } = useAppContext();
  const lista = state.series
    .filter(serie => serie.ativa !== false && serie.tipoAgrupamento !== 'familia')
    .filter(serie => !ehQuadro(serie) || situacaoDaFrequencia(serie).tipo !== 'sem-frequencia' || serie.acompanharContinuidade === true)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'));
  const marcadas = lista.filter(serie => serie.acompanharContinuidade === true).length;

  const alternar = (serie: Serie, valor: boolean) => {
    void dispatch({ type: 'UPDATE_SERIE', payload: { ...serie, acompanharContinuidade: valor, updatedAt: new Date().toISOString() } });
  };

  return (
    <CardConfiguracao
      icone={<Activity className="h-5 w-5" />}
      titulo="Continuidade na Saúde"
      descricao="Marque as séries e os quadros com meta própria que a Saúde do Planejamento deve conferir intervalo a intervalo. Só dá para marcar quem tem frequência definida."
    >
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {marcadas === 0 ? 'Nenhuma acompanhada.' : `${marcadas} de ${lista.length} acompanhadas.`}
      </Text>
      <ul className="stack-xs mt-2">
        {lista.map(serie => {
          const { texto, pode } = textoDaSituacao(serie);
          const marcada = serie.acompanharContinuidade === true;
          const id = `continuidade-${serie.id}`;
          return (
            <li key={serie.id} className="flex items-center justify-between gap-3">
              <label htmlFor={id} className="flex min-w-0 items-center gap-2 cursor-pointer">
                <input
                  id={id}
                  type="checkbox"
                  checked={marcada}
                  // Marcada que perdeu a frequência ainda pode ser desmarcada.
                  disabled={!pode && !marcada}
                  onChange={event => alternar(serie, event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[var(--brand-accent)]"
                />
                <Text variant="body" as="span" className="truncate">
                  {serie.name}{ehQuadro(serie) ? ' (quadro)' : ''}
                </Text>
              </label>
              <Text variant="meta" as="span" className="shrink-0 text-[var(--text-secondary)]">{texto}</Text>
            </li>
          );
        })}
      </ul>
    </CardConfiguracao>
  );
}
