import {useId, useState} from 'react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import type {BibliotecaItem, Content, Pilar, Serie, Tema} from '../../../lib/database';
import type {GradeCounts} from '../../editorial/lib/gradeCounts';
import type {GradeEntry} from '../../editorial/lib/gradeEntries';
import type {AvisoOrientacao} from '../lib/orientacaoEditorial';
import {pontosParaRevisar} from '../lib/orientacaoEditorial';
import {rotuloDoPeriodo, type VistaPlanejamento} from '../lib/periodoPlanejamento';
import {DistribuicaoPanel} from './DistribuicaoPanel';

export function PlanejamentoResumo({
  counts,
  entries,
  series,
  pilares,
  temas,
  obras,
  contents,
  temDistribuicao,
  outrasRedes = 0,
  vista,
  avisos,
  avisoAtivoId,
  onVerPautas,
  onLimparDestaque,
}: {
  counts: GradeCounts;
  entries: readonly GradeEntry[];
  series: readonly Serie[];
  pilares: readonly Pilar[];
  temas: readonly Tema[];
  obras: readonly Pick<BibliotecaItem, 'id' | 'titulo'>[];
  contents: readonly Pick<Content, 'id' | 'temaIds' | 'bibliotecaItemId' | 'livroIds'>[];
  temDistribuicao: boolean;
  outrasRedes?: number;
  vista: VistaPlanejamento;
  avisos: readonly AvisoOrientacao[];
  avisoAtivoId: string | null;
  onVerPautas: (aviso: AvisoOrientacao) => void;
  onLimparDestaque: () => void;
}) {
  const [distribuicaoAberta, setDistribuicaoAberta] = useState(false);
  const [listaAvisosAberta, setListaAvisosAberta] = useState(false);
  const listaId = useId();
  const revisar = pontosParaRevisar(avisos);
  const avisoResumo = avisos.find(aviso => aviso.severidade === 'revisar') ?? avisos[0] ?? null;
  const periodoLabel = rotuloDoPeriodo(counts.periodo, vista);

  const meta = counts.totalMeta != null && counts.totalMeta > 0 ? counts.totalMeta : null;
  const usados = counts.somaPlanejado;
  const livres = meta != null ? Math.max(0, meta - usados) : null;
  const acima = meta != null && usados > meta ? usados - meta : 0;

  let resumoEspacos: string;
  if (meta == null) {
    resumoEspacos = usados === 1 ? `1 pauta ${periodoLabel}` : `${usados} pautas ${periodoLabel}`;
  } else if (acima > 0) {
    resumoEspacos = `${usados} de ${meta} espaços ${periodoLabel} · ${acima} acima do previsto`;
  } else {
    resumoEspacos = `${usados} de ${meta} espaços ${periodoLabel} · ${livres} ${livres === 1 ? 'livre' : 'livres'}`;
  }

  return (
    <div className="stack-sm">
      <Surface
        padding="sm"
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <Text variant="body" as="p" className="min-w-0 flex-1">
          {resumoEspacos}
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="ghost" size="sm" onClick={() => setDistribuicaoAberta(true)}>
            Ver distribuição →
          </AppButton>
          {revisar > 0 ? (
            <AppButton
              variant="secondary"
              size="sm"
              aria-expanded={listaAvisosAberta}
              aria-controls={listaId}
              onClick={() => setListaAvisosAberta(open => !open)}
            >
              <Badge variant="neutral" className="mr-1.5 bg-[color-mix(in_srgb,var(--accent-orange)_22%,var(--bg-elevated))]">
                {revisar}
              </Badge>
              {revisar === 1 ? 'ponto para revisar' : 'pontos para revisar'}
            </AppButton>
          ) : null}
        </div>
      </Surface>

      {listaAvisosAberta && avisos.length > 0 ? (
        <Surface id={listaId} padding="sm" className="stack-sm">
          {avisos.map(aviso => (
            <div key={aviso.id} className="flex flex-wrap items-center justify-between gap-2">
              <Text variant="body" as="p" className="min-w-0 flex-1">
                {aviso.texto}
              </Text>
              <AppButton
                variant={avisoAtivoId === aviso.id ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => onVerPautas(aviso)}
              >
                Ver pautas →
              </AppButton>
            </div>
          ))}
          {avisoAtivoId ? (
            <AppButton variant="secondary" size="sm" className="self-start" onClick={onLimparDestaque}>
              Limpar destaque
            </AppButton>
          ) : null}
        </Surface>
      ) : null}

      {!listaAvisosAberta && avisoResumo ? (
        <Surface
          padding="sm"
          className="flex flex-wrap items-center justify-between gap-2 border border-[color-mix(in_srgb,var(--accent-orange)_35%,var(--border-color))] bg-[color-mix(in_srgb,var(--accent-orange)_10%,var(--bg-elevated))]"
        >
          <Text variant="body" as="p" className="min-w-0 flex-1">
            {avisoResumo.texto}
          </Text>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              variant={avisoAtivoId === avisoResumo.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onVerPautas(avisoResumo)}
            >
              Ver pautas →
            </AppButton>
            {avisoAtivoId === avisoResumo.id ? (
              <AppButton variant="secondary" size="sm" onClick={onLimparDestaque}>
                Limpar destaque
              </AppButton>
            ) : null}
          </div>
        </Surface>
      ) : null}

      <DistribuicaoPanel
        open={distribuicaoAberta}
        onClose={() => setDistribuicaoAberta(false)}
        counts={counts}
        entries={entries}
        series={series}
        pilares={pilares}
        temas={temas}
        obras={obras}
        temDistribuicao={temDistribuicao}
        outrasRedes={outrasRedes}
        contentsById={new Map(contents.map(content => [content.id, content]))}
      />
    </div>
  );
}
