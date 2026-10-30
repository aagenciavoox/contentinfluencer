import {useEffect, useState} from 'react';
import {Drawer} from '../../../components/overlays/Drawer';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {SegmentTabs} from '../../../components/ui/SegmentTabs';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {intervalo} from '../../../lib/dates';
import type {Content, Serie} from '../../../lib/database';
import type {GradeEntry} from '../../editorial/lib/gradeEntries';
import type {GradeCounts} from '../../editorial/lib/gradeCounts';
import type {EditorialSettings} from '../../editorial/lib/editorialSettings';
import {decisaoDoPeriodo} from '../../editorial/lib/periodoEditorial';
import {idsDaSubarvore} from '../../editorial/lib/serieArvore';
import {ETAPA_LABEL} from '../../editorial/lib/etapas';
import {frequenciasDoMes, ocupacaoDoMes} from '../lib/monthHealth';
import type {AvisoOrientacao} from '../lib/orientacaoEditorial';
import type {PlanejamentoPostIt} from '../lib/postIt';
import type {DimensaoDoMes} from './PlanejamentoResumo';

export function DistribuicaoPanel({open, onClose, counts, series, settings, referencia, avisos,
  dimensao, contentsById, postIts, onOpenEntry, onAbrirEditorial}: {
  open: boolean;
  onClose: () => void;
  counts: GradeCounts;
  series: readonly Serie[];
  settings: EditorialSettings;
  referencia: GradeCounts;
  avisos: readonly AvisoOrientacao[];
  dimensao: DimensaoDoMes;
  contentsById: ReadonlyMap<string, Content>;
  postIts: readonly PlanejamentoPostIt[];
  onOpenEntry: (entry: GradeEntry) => void;
  onAbrirEditorial: () => void;
}) {
  const [aba, setAba] = useState<DimensaoDoMes>(dimensao);
  const [itens, setItens] = useState<readonly GradeEntry[] | null>(null);
  useEffect(() => {if (open) {setAba(dimensao); setItens(null);}}, [open, dimensao, counts.periodo.inicio]);
  const ocupacao = ocupacaoDoMes(counts);
  const frequencias = frequenciasDoMes(counts, series);
  const decisao = decisaoDoPeriodo(settings.periodos, counts.periodo.inicio, counts.periodo.fim);
  const outraReferencia = referencia.periodo.inicio !== counts.periodo.inicio || referencia.periodo.fim !== counts.periodo.fim;
  const referenciaDecisao = decisaoDoPeriodo(settings.periodos, referencia.periodo.inicio, referencia.periodo.fim);
  const visiveis = itens ?? counts.itens;
  return (
    <Drawer open={open} onClose={onClose} widthClassName="max-w-2xl" ariaLabel="Detalhes do mês">
      <OverlayHeader title="Detalhes do mês" subtitle={intervalo(counts.periodo.inicio, counts.periodo.fim)} onClose={onClose} />
      <OverlayBody>
        <div className="stack-md">
          <Text variant="secondary">Mês visível · {intervalo(counts.periodo.inicio, counts.periodo.fim)}. As metas usam este intervalo exato.</Text>
          <Surface variant="info" padding="sm" className="stack-sm">
            <Text variant="label">Prioridade do mês</Text>
            <Text variant="secondary">{decisao?.prioridade || 'Prioridade não definida para este mês.'}</Text>
            <AppButton variant="secondary" size="sm" onClick={onAbrirEditorial}>Abrir Editorial</AppButton>
          </Surface>
          {outraReferencia ? <details className="rounded-[var(--radius-sm)] border border-[var(--border-color)] p-3">
            <summary className="cursor-pointer t-label">Referência salva no Editorial · {intervalo(referencia.periodo.inicio, referencia.periodo.fim)}</summary>
            <div className="mt-3 stack-sm">
              <Text variant="meta">Este intervalo é independente do mês visível. Suas metas e decisões permanecem salvas.</Text>
              <Text variant="secondary">{referenciaDecisao?.prioridade || 'Prioridade não definida neste intervalo.'}</Text>
              {referencia.funcoes.filter(linha => linha.meta != null).map(linha => <Text key={linha.id} variant="meta">{linha.rotulo}: {linha.planejado} de {linha.meta}</Text>)}
              {!referencia.funcoes.some(linha => linha.meta != null) ? <Text variant="meta">Metas não definidas</Text> : null}
            </div>
          </details> : null}
          <SegmentTabs<DimensaoDoMes> ariaLabel="Dimensões do mês" value={aba} onChange={value => {setAba(value); setItens(null);}} options={[
            {id: 'ocupacao', label: 'Ocupação'}, {id: 'objetivos', label: 'Objetivos'}, {id: 'series', label: 'Quadros'}, {id: 'variedade', label: 'Variedade'},
          ]} />
          {aba === 'ocupacao' ? <div className="stack-sm">
            <Text variant="bodyStrong">{ocupacao.preenchidos} espaços preenchidos{ocupacao.capacidade == null ? '' : ' de ' + ocupacao.capacidade}</Text>
            <Text variant="secondary">{ocupacao.livres == null ? 'Capacidade não definida no Editorial.' : ocupacao.livres + ' livres · ' + ocupacao.excesso + ' acima da capacidade.'}</Text>
            <Text variant="meta">Um espaço por conteúdo original, ciclo de repost ou pauta com data que entra na grade. Contas do mesmo ciclo não multiplicam espaços; itens marcados fora da grade ficam fora desta conta. Sem data não ocupa dia. A reserva de prontos é uma meta de estoque, sem ocupar espaço. Quando o conteúdo já tem data na conta de referência, essa data prevalece na contagem do intervalo; o vínculo não cria outro espaço no mesmo intervalo.</Text>
            <Text variant="meta">{counts.itens.filter(item => item.tipo === 'repost').length} reposts · {counts.comPauta} com pauta · {counts.publicado} publicados · {counts.previsto - counts.comPauta} reservas sem pauta definida.</Text>
          </div> : null}
          {aba === 'objetivos' ? <div className="stack-sm">
            {!counts.funcoes.some(linha => linha.meta != null) ? <Text variant="secondary">Metas não definidas</Text> : null}
            {counts.funcoes.map(linha => <AppButton key={linha.id} variant="secondary" className="w-full justify-between" onClick={() => setItens(counts.itens.filter(item => item.funcao === linha.id))}>
              <span>{linha.rotulo}</span><span>{linha.planejado}{linha.meta == null ? ' previstos · sem meta' : ' de ' + linha.meta}</span>
            </AppButton>)}
            <AppButton variant="secondary" size="sm" onClick={() => setItens(counts.itens.filter(item => !item.funcao))}>Sem objetivo · {counts.itens.filter(item => !item.funcao).length}</AppButton>
          </div> : null}
          {aba === 'series' ? <div className="stack-sm">
            <Text variant="meta">Frequências próprias e compartilhadas da árvore de séries, no mês visível.</Text>
            {!frequencias.length ? <Text variant="secondary">Frequência não definida</Text> : frequencias.map(item => <AppButton key={item.serieId} variant="secondary" className="h-auto min-h-11 w-full justify-between whitespace-normal py-2 text-left" onClick={() => {
              const ids = idsDaSubarvore(item.serieId, series); setItens(counts.itens.filter(entry => entry.serieId && ids.has(entry.serieId)));
            }}><span>{item.nome}</span><span>{item.total} de {item.expectativa} · {item.total < (item.expectativa ?? 0) ? 'precisa de espaço' : 'na frequência'}</span></AppButton>)}
          </div> : null}
          {aba === 'variedade' ? <div className="stack-sm">
            <Text variant="meta">Concentrações são observações editoriais. Temas: mês visível. Obras: janelas de 7 dias que tocam o mês.</Text>
            {!avisos.length ? <Text variant="secondary">Nenhuma observação neste mês.</Text> : avisos.map(aviso => <Surface key={aviso.id} variant="info" padding="sm" className="stack-sm">
              <Text variant="secondary">{aviso.texto}</Text>
              {aviso.intervalo ? <Text variant="meta">{intervalo(aviso.intervalo.inicio, aviso.intervalo.fim)}</Text> : null}
              <AppButton variant="secondary" size="sm" onClick={() => setItens(counts.itens.filter(item => (item.postItId && aviso.postItIds.includes(item.postItId)) || aviso.contentIds.includes(item.contentId)))}>Ver itens</AppButton>
            </Surface>)}
          </div> : null}
          <section className="stack-sm border-t border-[var(--border-color)] pt-3">
            <div className="flex items-center justify-between gap-2"><Text variant="label">{itens ? 'Itens selecionados' : 'Itens da ocupação'} · {visiveis.length}</Text>{itens ? <AppButton size="xs" variant="secondary" onClick={() => setItens(null)}>Ver todos</AppButton> : null}</div>
            {!visiveis.length ? <Text variant="secondary">Nenhum item neste recorte. Use a grade para reservar uma pauta.</Text> : visiveis.map(entry => <button key={entry.id} type="button" onClick={() => onOpenEntry(entry)} className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <span className="min-w-0"><Text variant="bodyStrong" as="span" className="block break-words">{postIts.find(postIt => postIt.id === entry.postItId || postIt.contentId === entry.contentId)?.texto || contentsById.get(entry.contentId)?.title || 'Pauta reservada'}</Text><Text variant="meta" as="span" className="block">{entry.data} · {series.find(serie => serie.id === entry.serieId)?.name || 'Sem série'}</Text></span>
              <Badge variant="neutral">{entry.etapa ? ETAPA_LABEL[entry.etapa] : 'Pauta'}</Badge>
            </button>)}
          </section>
        </div>
      </OverlayBody>
    </Drawer>
  );
}
