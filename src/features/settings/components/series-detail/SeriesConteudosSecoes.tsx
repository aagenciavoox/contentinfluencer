import { useId, type ReactNode } from 'react';
import { ChevronDown, FileText, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import type { Content, Platform, Serie, SerieTipoAgrupamento } from '../../../../lib/database';
import { getStatusColorVar } from '../../../../lib/statusClasses';
import { cn } from '../../../../lib/utils';
import { getDisplayStatus, getDisplayStatusLabel } from '../../../contents/lib/contentPipeline';
import { TIPO_AGRUPAMENTO_LABEL, ehIdeia, textoConteudos } from '../../lib/serieAgrupamento';
import { destinoDoConteudo, type SecaoConteudos, type SecaoTemporada } from '../../lib/seriesSecoes';

export type AcoesDasSecoes = {
  /** Endereço do conteúdo, com a volta para esta página. */
  rotaDoConteudo: (content: Content) => { to: string; state: unknown };
  onCopiarLink: (content: Content) => void;
  onBulk: (serieId: string, temporadaId: string | null) => void;
  onEditSerie: (serieId: string) => void;
};

function Contagem({ visiveis, total, filtrando }: { visiveis: number; total: number; filtrando: boolean }) {
  return (
    <Text variant="meta" as="span" className="shrink-0">
      {filtrando && visiveis !== total ? `${visiveis} de ${textoConteudos(total)}` : textoConteudos(total)}
    </Text>
  );
}

function Cabecalho({
  aberta,
  onToggle,
  controla,
  nivel,
  titulo,
  detalhe,
  menu,
}: {
  aberta: boolean;
  onToggle: () => void;
  controla: string;
  nivel: 'secao' | 'temporada';
  titulo: ReactNode;
  detalhe: ReactNode;
  menu: MoreMenuItem[];
}) {
  return (
    <div className={cn('flex min-h-12 items-center gap-2 pr-2', nivel === 'secao' ? 'pl-2' : 'pl-8')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberta}
        aria-controls={controla}
        aria-label={aberta ? 'Recolher' : 'Mostrar'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11 pointer-coarse:w-11"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', !aberta && '-rotate-90')} aria-hidden />
      </button>
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        {titulo}
        {detalhe}
      </span>
      {menu.length > 0 ? <MoreMenu size="sm" items={menu} label="Mais opções do grupo" /> : null}
    </div>
  );
}

function LinhaConteudo({
  content,
  secaoSerieId,
  series,
  contas,
  celular,
  acoes,
}: {
  content: Content;
  secaoSerieId: string;
  series: readonly Serie[];
  contas: readonly Platform[];
  celular: boolean;
  acoes: AcoesDasSecoes;
}) {
  const titulo = content.title?.trim() || 'Sem título';
  const etapa = getDisplayStatusLabel(content);
  const destino = destinoDoConteudo(content, contas);
  const dono = content.seriesId && content.seriesId !== secaoSerieId
    ? series.find(item => item.id === content.seriesId)?.name?.trim()
    : null;
  const Icone = ehIdeia(content) ? Lightbulb : FileText;
  const rota = acoes.rotaDoConteudo(content);
  const pontoEtapa = (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: getStatusColorVar(getDisplayStatus(content)) }}
      />
      <Text variant="secondary" as="span" className="truncate text-[var(--text-primary)]">{etapa}</Text>
    </span>
  );
  const textoDestino = destino.rotulo || '—';

  return (
    <li className="relative flex min-h-12 items-center gap-3 border-t border-[var(--border-color)] py-2 pl-4 pr-2 hover:bg-[var(--bg-hover)] sm:pl-14">
      <Link
        to={rota.to}
        state={rota.state}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        aria-label={`Abrir ${titulo}`}
      />
      <Icone className="pointer-events-none relative z-[1] h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <span className="pointer-events-none relative z-[1] min-w-0 flex-1">
        <Text variant="body" as="span" className="block truncate">{titulo}</Text>
        {dono ? <Text variant="meta" as="span" className="block truncate">{dono}</Text> : null}
        {celular ? (
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2">
            {pontoEtapa}
            <Text variant="meta" as="span" className="truncate">
              {[destino.rotulo, destino.progresso].filter(Boolean).join(' · ')}
            </Text>
          </span>
        ) : null}
      </span>
      {celular ? null : (
        <>
          <span className="pointer-events-none relative z-[1] w-36 shrink-0">{pontoEtapa}</span>
          <span className="pointer-events-none relative z-[1] w-48 shrink-0 lg:w-56">
            <Text variant="secondary" as="span" className="block truncate">{textoDestino}</Text>
            {destino.progresso ? <Text variant="meta" as="span" className="block">{destino.progresso}</Text> : null}
          </span>
        </>
      )}
      <span className="relative z-[2] shrink-0">
        <MoreMenu
          size="sm"
          label={`Mais opções de ${titulo}`}
          items={[{ label: 'Copiar link', onClick: () => acoes.onCopiarLink(content) }]}
        />
      </span>
    </li>
  );
}

function ListaConteudos(props: {
  contents: readonly Content[];
  secaoSerieId: string;
  series: readonly Serie[];
  contas: readonly Platform[];
  celular: boolean;
  acoes: AcoesDasSecoes;
  vazio?: string;
}) {
  const { contents, celular, vazio } = props;
  if (contents.length === 0) {
    return (
      <Text variant="secondary" as="p" className="border-t border-[var(--border-color)] py-3 pl-4 sm:pl-14">
        {vazio ?? 'Nenhum conteúdo aqui ainda.'}
      </Text>
    );
  }
  return (
    <>
      {celular ? null : (
        <div aria-hidden className="flex items-center gap-3 border-t border-[var(--border-color)] py-2 pl-14 pr-2">
          <span className="w-4 shrink-0" />
          <Text variant="label" as="span" className="flex-1 text-[var(--text-tertiary)]">Título</Text>
          <Text variant="label" as="span" className="w-36 shrink-0 text-[var(--text-tertiary)]">Etapa</Text>
          <Text variant="label" as="span" className="w-48 shrink-0 text-[var(--text-tertiary)] lg:w-56">Destino</Text>
          <span className="w-8 shrink-0" />
        </div>
      )}
      <ul>
        {contents.map(content => (
          <LinhaConteudo key={content.id} content={content} {...props} />
        ))}
      </ul>
    </>
  );
}

function FaixaTemporada({
  faixa,
  secao,
  serieDaPagina,
  aberta,
  onToggle,
  filtrando,
  ...lista
}: {
  faixa: SecaoTemporada;
  secao: SecaoConteudos;
  serieDaPagina: string;
  aberta: boolean;
  onToggle: () => void;
  filtrando: boolean;
  series: readonly Serie[];
  contas: readonly Platform[];
  celular: boolean;
  acoes: AcoesDasSecoes;
}) {
  const corpoId = useId();
  const titulo = faixa.temporadaId ? (
    <Link
      to={`/series/${serieDaPagina}/temporadas/${faixa.temporadaId}`}
      className="min-w-0 rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Text variant="bodyStrong" as="span">{faixa.rotulo}</Text>
    </Link>
  ) : (
    <Text variant="bodyStrong" as="span" className="min-w-0">{faixa.rotulo}</Text>
  );
  return (
    <div className="border-t border-[var(--border-color)]">
      <Cabecalho
        aberta={aberta}
        onToggle={onToggle}
        controla={corpoId}
        nivel="temporada"
        titulo={titulo}
        detalhe={<Contagem visiveis={faixa.contents.length} total={faixa.total} filtrando={filtrando} />}
        menu={faixa.foraDoEscopo ? [] : [{
          label: 'Adicionar em massa aqui',
          onClick: () => lista.acoes.onBulk(secao.serieId, faixa.temporadaId),
        }]}
      />
      {faixa.foraDoEscopo && aberta ? (
        <Text variant="meta" as="p" className="pb-2 pl-14">
          Estes conteúdos estão numa temporada de outro agrupamento. Abra cada um para reorganizar.
        </Text>
      ) : null}
      {aberta ? (
        <div id={corpoId}>
          <ListaConteudos contents={faixa.contents} secaoSerieId={secao.serieId} {...lista} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Conteúdos da página em seções que abrem e fecham: os diretos na série e um grupo por
 * agrupamento filho, cada um dividido por temporada quando há temporadas.
 */
export function SeriesConteudosSecoes({
  secoes,
  serieDaPagina,
  series,
  tipos,
  contas,
  celular,
  filtrando,
  estaAberta,
  alternar,
  acoes,
}: {
  secoes: readonly SecaoConteudos[];
  serieDaPagina: string;
  series: readonly Serie[];
  tipos: ReadonlyMap<string, SerieTipoAgrupamento>;
  contas: readonly Platform[];
  celular: boolean;
  filtrando: boolean;
  estaAberta: (id: string, padrao: boolean) => boolean;
  alternar: (id: string, padrao: boolean) => void;
  acoes: AcoesDasSecoes;
}) {
  const lista = { series, contas, celular, acoes };
  const primeiraComConteudo = secoes.findIndex(secao => secao.contagem.conteudos > 0);
  const unica = secoes.length === 1 && secoes[0].tipo === 'direto';

  const corpoDaSecao = (secao: SecaoConteudos) => (
    secao.temporadas ? (
      secao.temporadas.length > 0 ? secao.temporadas.map((faixa, indice) => {
        const padrao = filtrando || indice === 0;
        return (
          <FaixaTemporada
            key={faixa.id}
            faixa={faixa}
            secao={secao}
            serieDaPagina={serieDaPagina}
            aberta={filtrando || estaAberta(faixa.id, padrao)}
            onToggle={() => alternar(faixa.id, padrao)}
            filtrando={filtrando}
            {...lista}
          />
        );
      }) : <ListaConteudos contents={[]} secaoSerieId={secao.serieId} {...lista} />
    ) : (
      <ListaConteudos contents={secao.contents} secaoSerieId={secao.serieId} {...lista} />
    )
  );

  if (unica) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] [&>*:first-child]:border-t-0 [&>ul:first-child>li:first-child]:border-t-0">
        {corpoDaSecao(secoes[0])}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
      {secoes.map((secao, indice) => (
        <SecaoBloco
          key={secao.id}
          secao={secao}
          primeira={indice === 0}
          aberta={filtrando || estaAberta(secao.id, indice === primeiraComConteudo)}
          onToggle={() => alternar(secao.id, indice === primeiraComConteudo)}
          tipo={secao.tipo === 'filho' ? tipos.get(secao.serieId) ?? 'quadro' : null}
          filtrando={filtrando}
          acoes={acoes}
        >
          {corpoDaSecao(secao)}
        </SecaoBloco>
      ))}
    </div>
  );
}

function SecaoBloco({
  secao,
  primeira,
  aberta,
  onToggle,
  tipo,
  filtrando,
  acoes,
  children,
}: {
  secao: SecaoConteudos;
  primeira: boolean;
  aberta: boolean;
  onToggle: () => void;
  tipo: SerieTipoAgrupamento | null;
  filtrando: boolean;
  acoes: AcoesDasSecoes;
  children: ReactNode;
}) {
  const corpoId = useId();
  const titulo = secao.tipo === 'filho' ? (
    <Link
      to={`/series/${secao.serieId}`}
      className="min-w-0 rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Text variant="itemTitle" as="span">{secao.rotulo}</Text>
    </Link>
  ) : (
    <Text variant="itemTitle" as="span" className="min-w-0">{secao.rotulo}</Text>
  );
  const menu: MoreMenuItem[] = [
    { label: 'Adicionar em massa aqui', onClick: () => acoes.onBulk(secao.serieId, null) },
    ...(secao.tipo === 'filho' ? [{ label: 'Editar', onClick: () => acoes.onEditSerie(secao.serieId) }] : []),
  ];
  return (
    <section className={cn(!primeira && 'border-t border-[var(--border-color)]')} aria-label={secao.rotulo}>
      <Cabecalho
        aberta={aberta}
        onToggle={onToggle}
        controla={corpoId}
        nivel="secao"
        titulo={titulo}
        detalhe={(
          <Text variant="meta" as="span" className="shrink-0">
            {tipo ? `${TIPO_AGRUPAMENTO_LABEL[tipo]} · ` : ''}
            {filtrando && secao.visiveis !== secao.contagem.conteudos
              ? `${secao.visiveis} de ${textoConteudos(secao.contagem.conteudos)}`
              : textoConteudos(secao.contagem.conteudos)}
          </Text>
        )}
        menu={menu}
      />
      {aberta ? <div id={corpoId}>{children}</div> : null}
    </section>
  );
}
