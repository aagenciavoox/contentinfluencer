import {useMemo, useState} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {CalendarDays} from 'lucide-react';
import {Badge} from '../../../components/ui/Badge';
import {Text} from '../../../components/ui/Text';
import {ToolbarSearchInput} from '../../../components/ui/ToolbarSearchInput';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import {normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {datasNaGrade} from '../../editorial/lib/datasNaGrade';
import {FUNCAO_CURTA} from '../../editorial/lib/funcoes';
import {candidatosDoEncaixe, descricaoDoCandidato, type CandidatoEncaixe, type RitmoDoEncaixe} from '../lib/encaixe';
import {progressoDasOndas} from '../lib/episodioNaTemporada';
import {encaixarConteudo, type PlanejamentoPostIt} from '../lib/postIt';
import type {FiltroCalendario} from '../lib/filtroCalendario';
import {useAvisoConcentracao} from '../hooks/useAvisoConcentracao';
import {usePostItsNaData} from '../hooks/usePostItsNaData';

function criterioDoPostIt(
  postIt: PlanejamentoPostIt,
  series: readonly {id: string; name: string}[],
  pilares: readonly {id: string; nome: string}[],
): string | null {
  const partes = [
    postIt.objetivo ? FUNCAO_CURTA[postIt.objetivo] : null,
    postIt.serieId ? series.find(serie => serie.id === postIt.serieId)?.name ?? null : null,
    postIt.pilarId ? pilares.find(pilar => pilar.id === postIt.pilarId)?.nome ?? null : null,
  ].filter((parte): parte is string => Boolean(parte?.trim()));
  return partes.length > 0 ? partes.join(' · ') : null;
}

function ListaDeCandidatos({
  titulo,
  candidatos,
  onEscolher,
}: {
  titulo: string;
  candidatos: readonly CandidatoEncaixe[];
  onEscolher: (candidato: CandidatoEncaixe) => void;
}) {
  if (candidatos.length === 0) return null;
  return (
    <section className="stack-sm">
      <Text variant="label" as="h3" className="text-[var(--text-secondary)]">{titulo}</Text>
      <ul className="stack-sm">
        {candidatos.map(candidato => {
          const status = normalizeContentStatus(candidato.content.status);
          const motivos = descricaoDoCandidato(candidato);
          return (
            <li key={candidato.content.id}>
              <button
                type="button"
                onClick={() => onEscolher(candidato)}
                className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-normal break-words t-body-strong text-[var(--text-primary)]">
                    {candidato.content.title?.trim() || 'Sem título'}
                  </span>
                  {motivos ? (
                    <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">{motivos}</Text>
                  ) : null}
                </span>
                <Badge variant="status" status={status}>{status}</Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Mostra o que pode ocupar um espaço planejado e liga o escolhido ao post-it.
 * Nada é ligado sem o clique. O conteúdo não muda: nem status, nem data.
 */
export function EncaixeDialog({
  postIt,
  onClose,
  onEncaixado,
  zIndex,
  linhasDoRitmo,
  periodo,
  filtroDosAvisos,
}: {
  postIt: PlanejamentoPostIt | null;
  periodo: {inicio: string; fim: string};
  filtroDosAvisos?: FiltroCalendario;
  /** Linhas da continuidade do período visível (a mesma da régua). Sem elas, o ritmo não ordena. */
  linhasDoRitmo?: RitmoDoEncaixe['linhas'];
  onClose: () => void;
  onEncaixado?: (postIt: PlanejamentoPostIt) => void;
  zIndex?: string;
}) {
  const {state, dispatch} = useAppContext();
  const [busca, setBusca] = useState('');
  const postIts = usePostItsNaData();
  const colocarComAviso = useAvisoConcentracao(periodo, filtroDosAvisos);

  const datas = useMemo(() => datasNaGrade({
    contents: state.contents,
    series: state.series,
    postIts,
    redeReferenciaId: state.editorial.preferencias.redeReferenciaId,
    platforms: state.platforms,
  }), [state.contents, state.series, postIts, state.preferences, state.platforms]);

  const lista = useMemo(() => {
    if (!postIt) return {combinam: [], outros: []};
    const ritmo: RitmoDoEncaixe = {
      linhas: linhasDoRitmo ?? [],
      temporadas: state.temporadas,
      progressoDasOndas: progressoDasOndas(state.contents, format(new Date(), 'yyyy-MM-dd')),
    };
    const todos = candidatosDoEncaixe({postIt, postIts, contents: state.contents, series: state.series, datas, ritmo});
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return todos;
    const passa = (candidato: CandidatoEncaixe) =>
      (candidato.content.title || '').toLocaleLowerCase('pt-BR').includes(termo);
    return {combinam: todos.combinam.filter(passa), outros: todos.outros.filter(passa)};
  }, [busca, datas, postIt, postIts, state.contents, state.series, state.temporadas, linhasDoRitmo]);

  const criterio = postIt ? criterioDoPostIt(postIt, state.series, state.pilares) : null;
  const vazio = lista.combinam.length === 0 && lista.outros.length === 0;

  const fechar = () => {
    setBusca('');
    onClose();
  };

  const escolher = (candidato: CandidatoEncaixe) => {
    if (!postIt) return;
    const resultado = encaixarConteudo({postIts, postItId: postIt.id, content: candidato.content});
    if (!resultado.ok) return;
    void colocarComAviso({
      date: resultado.postIt.date, postItIds: [resultado.postIt.id], contentIds: [candidato.content.id],
      depois: {
        postIts: postIts.map(item => item.id === resultado.postIt.id ? resultado.postIt : item),
        contents: state.contents,
      },
    }, () => {
      const gravacao = dispatch({type: 'UPDATE_POST_IT', payload: resultado.postIt});
      // O vínculo fica no post-it. O dia do Calendário só muda em "Salvar no calendário".
      onEncaixado?.(resultado.postIt);
      fechar();
      return gravacao;
    });
  };

  return (
    <Dialog open={Boolean(postIt)} onClose={fechar} desktopMaxW="max-w-lg" zIndex={zIndex} ariaLabel="Ver o que encaixa">
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title="Ver o que encaixa"
          subtitle={postIt?.date
            ? format(new Date(`${postIt.date}T12:00:00`), "d 'de' MMMM", {locale: ptBR})
            : 'Post-it fora do calendário'}
          icon={<CalendarDays className="h-6 w-6 text-[var(--brand-accent-text)]" />}
          onClose={fechar}
        />
        <OverlayBody>
          <div className="stack-md">
            <Text variant="meta" className="text-[var(--text-secondary)]">
              Ideias e roteiros ainda sem data. O escolhido ocupa este espaço e continua na mesma etapa.
            </Text>
            {criterio ? (
              <Text variant="meta" className="text-[var(--text-secondary)]">
                Este espaço é de {criterio}. O que combina aparece primeiro. Cada roteiro conta com o objetivo dele.
              </Text>
            ) : null}
            <ToolbarSearchInput value={busca} onChange={setBusca} placeholder="Buscar pelo título" size="compact" />
            {vazio ? (
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {busca.trim() ? 'Nada com esse título.' : 'Nenhuma ideia ou roteiro sem data para encaixar.'}
              </Text>
            ) : (
              <>
                <ListaDeCandidatos titulo="Combinam com este espaço" candidatos={lista.combinam} onEscolher={escolher} />
                <ListaDeCandidatos
                  titulo={lista.combinam.length > 0 ? 'Outros sem data' : 'Sem data'}
                  candidatos={lista.outros}
                  onEscolher={escolher}
                />
              </>
            )}
          </div>
        </OverlayBody>
      </div>
    </Dialog>
  );
}
