import {cn} from '../../../lib/utils';
import {ArrowRight} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {mes} from '../../../lib/dates';
import type {Serie} from '../../../lib/database';
import type {GradeCounts} from '../../editorial/lib/gradeCounts';
import {frequenciasDoMes, ocupacaoDoMes} from '../lib/monthHealth';
import type {AvisoOrientacao} from '../lib/orientacaoEditorial';

export type DimensaoDoMes = 'ocupacao' | 'objetivos' | 'series' | 'variedade';

/** Leituras independentes do mês completo; filtrar a grade não muda estas contas. */
export function PlanejamentoResumo({counts, series, avisos, onDetalhes, sticky = true}: {
  sticky?: boolean;
  counts: GradeCounts;
  series: readonly Serie[];
  avisos: readonly AvisoOrientacao[];
  onDetalhes: (dimensao?: DimensaoDoMes) => void;
}) {
  const ocupacao = ocupacaoDoMes(counts);
  const frequencias = frequenciasDoMes(counts, series);
  const abaixo = frequencias.filter(item => item.total < (item.expectativa ?? 0));
  const metas = counts.funcoes.filter(linha => linha.meta != null);
  const lacunas = metas.filter(linha => linha.planejado < (linha.meta ?? 0)).sort((a, b) =>
    ((b.meta ?? 0) - b.planejado) - ((a.meta ?? 0) - a.planejado));
  const lacuna = lacunas[0];
  const variedade = avisos.find(aviso => aviso.tipo === 'obra-repetida' || aviso.tipo === 'tema-concentrado');
  const dimensoes: {id: DimensaoDoMes; titulo: string; numero: string; detalhe: string}[] = [
    {id: 'ocupacao', titulo: 'Ocupação',
      numero: ocupacao.capacidade == null ? ocupacao.preenchidos + ' preenchidos' : ocupacao.preenchidos + ' de ' + ocupacao.capacidade + ' preenchidos',
      detalhe: ocupacao.livres == null ? 'Capacidade não definida' : ocupacao.livres + ' espaços livres' + (ocupacao.excesso ? ' · ' + ocupacao.excesso + ' acima' : '')},
    {id: 'objetivos', titulo: 'Objetivos',
      numero: !metas.length ? 'Metas não definidas' : lacunas.length ? lacunas.length + (lacunas.length === 1 ? ' objetivo abaixo da meta' : ' objetivos abaixo da meta') : 'Metas atendidas',
      detalhe: lacuna ? lacuna.rotulo + ': ' + lacuna.planejado + ' de ' + lacuna.meta : metas.length ? 'Ver distribuição por objetivo' : 'Defina no Editorial'},
    {id: 'series', titulo: 'Séries e quadros',
      numero: frequencias.length ? (frequencias.length - abaixo.length) + ' de ' + frequencias.length + ' na frequência' : 'Frequência não definida',
      detalhe: abaixo.length ? abaixo.length + ' precisam de espaço' : frequencias.length ? 'Frequências atendidas no mês' : 'Ver séries do mês'},
    {id: 'variedade', titulo: 'Variedade',
      numero: variedade ? variedade.texto : 'Sem concentração observada',
      detalhe: variedade?.intervalo ? 'De ' + variedade.intervalo.inicio.split('-').reverse().slice(0,2).join('/') + ' a ' + variedade.intervalo.fim.split('-').reverse().slice(0,2).join('/') : 'Assuntos no mês · obras em 7 dias'},
  ];
  return (
    <Surface variant="outlined" padding="none" className={cn('z-20 bg-[var(--bg-elevated)]', sticky && 'sticky top-[var(--planning-toolbar-height,64px)]')}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-3 py-1.5">
        <Text variant="meta">Mês em foco · {mes(counts.periodo.inicio)}</Text>
        <AppButton variant="ghost" size="xs" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onDetalhes()}>Detalhes do mês</AppButton>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--border-color)] lg:grid-cols-4">
        {dimensoes.map(item => (
          <button key={item.id} type="button" onClick={() => onDetalhes(item.id)}
            className="min-w-0 px-3 py-3 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <Text variant="meta" as="span" className="mb-1 block text-[var(--text-secondary)]">{item.titulo}</Text>
            <Text variant="bodyStrong" as="span" className="block line-clamp-2 leading-snug tabular-nums">{item.numero}</Text>
            {item.id === 'ocupacao' && ocupacao.capacidade != null ? (
              <span className="my-2 block h-1 overflow-hidden rounded-full bg-[var(--bg-hover)]" aria-hidden>
                <span className="block h-full rounded-full bg-[var(--brand-accent)]" style={{width: ocupacao.percentual + '%'}} />
              </span>
            ) : null}
            <Text variant="meta" as="span" className="mt-1 block text-[var(--text-secondary)]">{item.detalhe}</Text>
          </button>
        ))}
      </div>
    </Surface>
  );
}
