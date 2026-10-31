import {useId, useState, type ReactNode} from 'react';
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
  layout = 'pilha',
  redeReferencia = null,
  atalhos,
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
  /** `faixa` (desktop): resumo e aviso na mesma linha, para o calendário subir. */
  layout?: 'pilha' | 'faixa';
  /** Conta que a contagem usa (ex.: "Instagram @perfil"), ao lado do número de espaços. */
  redeReferencia?: string | null;
  /** Faixa: botões depois de "Ver distribuição" (ex.: ir para o Editorial). */
  atalhos?: ReactNode;
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
    resumoEspacos = livres === 0
      ? `${meta} de ${meta} espaços ocupados ${periodoLabel}`
      : `${livres} de ${meta} espaços livres ${periodoLabel}`;
  }

  const faixa = layout === 'faixa';
  const avisoNaFaixa = faixa && !listaAvisosAberta ? avisoResumo : null;

  const acoesDoAviso = (aviso: AvisoOrientacao) => (
    <>
      <AppButton
        variant={avisoAtivoId === aviso.id ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onVerPautas(aviso)}
      >
        Ver pautas →
      </AppButton>
      {avisoAtivoId === aviso.id ? (
        <AppButton variant="secondary" size="sm" onClick={onLimparDestaque}>
          Limpar destaque
        </AppButton>
      ) : null}
    </>
  );

  const botaoDistribuicao = (
    <AppButton variant="ghost" size="sm" onClick={() => setDistribuicaoAberta(true)}>
      Ver distribuição →
    </AppButton>
  );
  // Na faixa, com um aviso só, ele já está na linha: o botão repetiria a mesma coisa.
  const botaoRevisar = revisar > 0 && (!faixa || avisos.length > 1 || listaAvisosAberta) ? (
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
  ) : null;

  return (
    <div className="stack-sm">
      <Surface
        padding="sm"
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        {faixa ? (
          // Espaços à esquerda, aviso à direita. Sem largura para os dois, o aviso desce inteiro.
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Text variant="body" as="p">{resumoEspacos}</Text>
              {redeReferencia ? <Badge variant="neutral">{redeReferencia}</Badge> : null}
              {botaoDistribuicao}
              {atalhos}
            </div>
            <div className="flex min-w-0 flex-1 basis-[40rem] flex-wrap items-center justify-end gap-2">
              {avisoNaFaixa ? (
                <>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-orange)]" aria-hidden />
                  <Text variant="body" as="p" className="min-w-0 flex-1 text-[var(--text-secondary)]">
                    {avisoNaFaixa.texto}
                  </Text>
                  {acoesDoAviso(avisoNaFaixa)}
                </>
              ) : null}
              {botaoRevisar}
            </div>
          </>
        ) : (
          <>
            <Text variant="body" as="p" className="min-w-0 flex-1">
              {resumoEspacos}
            </Text>
            <div className="flex flex-wrap items-center gap-2">
              {botaoDistribuicao}
              {botaoRevisar}
            </div>
          </>
        )}
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

      {!faixa && !listaAvisosAberta && avisoResumo ? (
        <Surface
          padding="sm"
          className="flex flex-wrap items-center justify-between gap-2 border border-[color-mix(in_srgb,var(--accent-orange)_35%,var(--border-color))] bg-[color-mix(in_srgb,var(--accent-orange)_10%,var(--bg-elevated))]"
        >
          <Text variant="body" as="p" className="min-w-0 flex-1">
            {avisoResumo.texto}
          </Text>
          <div className="flex flex-wrap items-center gap-2">
            {acoesDoAviso(avisoResumo)}
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
