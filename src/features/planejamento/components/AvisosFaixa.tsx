import {useState} from 'react';
import {Calendar, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Orbit, Target} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import {pontosParaRevisar, type AvisoOrientacao, type TipoAvisoOrientacao} from '../lib/orientacaoEditorial';

/**
 * Faixa de um aviso por vez no Planejamento.
 * A lista empurrava o calendário; aqui o trecho fica numa linha e Localizar leva até a pauta.
 * No desktop (`modo="ajustes"`) os avisos viram o cartão "Ajustes do planejamento".
 */
export function AvisosFaixa({
  modo = 'faixa',
  ...props
}: AvisosFaixaProps) {
  if (modo === 'ajustes') return <AjustesDoPlanejamento {...props} />;
  return <FaixaPaginada {...props} />;
}

type AvisosFaixaProps = {
  avisos: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
  onVerAnalise?: () => void;
  onAbrirEditorial?: () => void;
  className?: string;
  /** `faixa` pagina um aviso (celular). `ajustes` é o cartão do desktop. */
  modo?: 'faixa' | 'ajustes';
};

function FaixaPaginada({
  avisos,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onLimparDestaque,
  onVerAnalise,
  onAbrirEditorial,
  className,
}: AvisosFaixaProps) {
  const revisar = pontosParaRevisar(avisos);
  const ordenados = [...avisos].sort((a, b) => {
    if (a.severidade !== b.severidade) return a.severidade === 'revisar' ? -1 : 1;
    return a.texto.localeCompare(b.texto, 'pt-BR');
  });
  const [focoId, setFocoId] = useState<string | null>(null);
  // O pager manda. O aviso localizado só escolhe o foco enquanto ninguém virou a página.
  const focoPedido = (focoId && ordenados.some(aviso => aviso.id === focoId))
    ? focoId
    : (avisoAtivoId && ordenados.some(aviso => aviso.id === avisoAtivoId) ? avisoAtivoId : null);
  const indiceEncontrado = ordenados.findIndex(aviso => aviso.id === focoPedido);
  const indice = indiceEncontrado >= 0 ? indiceEncontrado : 0;
  const atual = ordenados[indice] ?? null;
  const irPara = (proximo: number) => {
    const aviso = ordenados[proximo];
    if (aviso) setFocoId(aviso.id);
  };

  return (
    <Surface
      variant="outlined"
      padding="sm"
      className={cn('w-full stack-sm', className)}
      data-planejamento-avisos-faixa
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text variant="label" as="h2" className="text-[var(--text-secondary)]">
          {revisar > 0
            ? (revisar === 1 ? '1 ponto para revisar' : `${revisar} pontos para revisar`)
            : avisos.length > 0
              ? (avisos.length === 1 ? '1 aviso neste trecho' : `${avisos.length} avisos neste trecho`)
              : 'Nada para revisar neste trecho'}
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          {onVerAnalise ? (
            <AppButton variant="secondary" size="sm" onClick={onVerAnalise}>
              Ver análise
            </AppButton>
          ) : null}
          {onAbrirEditorial ? (
            <AppButton
              variant="ghost"
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={onAbrirEditorial}
            >
              Abrir Editorial
            </AppButton>
          ) : null}
        </div>
      </div>

      {atual ? (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              atual.severidade === 'revisar' ? 'bg-[var(--accent-orange)]' : 'bg-[var(--text-tertiary)]',
            )}
            aria-hidden
          />
          <button
            type="button"
            className="min-w-0 flex-1 rounded-[var(--radius-sm)] text-left"
            aria-live="polite"
            onClick={() => onLocalizar(atual)}
          >
            <Text variant="body" as="span" className="text-[var(--text-primary)]">
              {atual.texto}
            </Text>
          </button>
          {ordenados.length > 1 ? (
            <div className="flex shrink-0 items-center gap-1">
              <AppButton
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Aviso anterior"
                onClick={() => irPara((indice - 1 + ordenados.length) % ordenados.length)}
              >
                <ChevronLeft className="h-4 w-4" />
              </AppButton>
              <Text variant="meta" as="span" className="tabular-nums text-[var(--text-secondary)]">
                {indice + 1} de {ordenados.length}
              </Text>
              <AppButton
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Próximo aviso"
                onClick={() => irPara((indice + 1) % ordenados.length)}
              >
                <ChevronRight className="h-4 w-4" />
              </AppButton>
            </div>
          ) : null}
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <AppButton
              variant={avisoAtivoId === atual.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onLocalizar(atual)}
            >
              Localizar
            </AppButton>
            {onFoiDeProposito && podeMarcar(atual) ? (
              <AppButton variant="secondary" size="sm" onClick={() => onFoiDeProposito(atual)}>
                Foi de propósito
              </AppButton>
            ) : null}
            {avisoAtivoId === atual.id && onLimparDestaque ? (
              <AppButton variant="secondary" size="sm" onClick={onLimparDestaque}>
                Limpar
              </AppButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

const GRUPOS: {id: string; titulo: string; tipos: readonly TipoAvisoOrientacao[]}[] = [
  {id: 'capacidade', titulo: 'Capacidade', tipos: ['capacidade-semana', 'gravacoes-no-dia']},
  {id: 'frequencia', titulo: 'Frequência', tipos: ['serie-acima', 'serie-reservada']},
  {id: 'continuidade', titulo: 'Continuidade', tipos: ['ausencia-12-dias', 'ausencia-mes', 'vespera-sem-pronto']},
  {id: 'metas', titulo: 'Metas do período', tipos: ['serie-abaixo']},
  {id: 'assuntos', titulo: 'Assuntos repetidos', tipos: ['obra-repetida', 'tema-concentrado']},
];

function AjustesDoPlanejamento({
  avisos,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onLimparDestaque,
  onVerAnalise,
  onAbrirEditorial,
  className,
}: AvisosFaixaProps) {
  const revisar = pontosParaRevisar(avisos);
  const [painelAberto, setPainelAberto] = useState(true);
  const [escolhidos, setEscolhidos] = useState<Record<string, boolean>>({});
  const grupos = GRUPOS.map(grupo => ({
    ...grupo,
    itens: avisos
      .filter(aviso => grupo.tipos.includes(aviso.tipo))
      .sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === 'revisar' ? -1 : 1)),
  })).filter(grupo => grupo.itens.length > 0);
  const painelId = 'ajustes-do-planejamento';

  const alternar = (id: string, padrao: boolean) => {
    setEscolhidos(atual => ({...atual, [id]: !(id in atual ? atual[id] : padrao)}));
  };

  return (
    <Surface
      variant="outlined"
      padding="none"
      className={cn('w-full', className)}
      data-planejamento-avisos-faixa
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-[var(--radius-sm)] text-left"
          aria-expanded={painelAberto}
          aria-controls={painelAberto ? painelId : undefined}
          onClick={() => setPainelAberto(atual => !atual)}
        >
          <ChevronDown
            className={cn(
              'mt-1 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform',
              !painelAberto && '-rotate-90',
            )}
            aria-hidden
          />
          <span className="stack-xs">
            <Text variant="sectionTitle" as="span">Ajustes do planejamento</Text>
            <span className="flex items-center gap-2">
              {revisar > 0 ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-orange)]" aria-hidden />
              ) : null}
              <Text variant="meta" as="span">
                {revisar > 0
                  ? (revisar === 1 ? '1 ponto para revisar' : `${revisar} pontos para revisar`)
                  : avisos.length > 0
                    ? (avisos.length === 1 ? '1 aviso neste trecho' : `${avisos.length} avisos neste trecho`)
                    : 'Nada para revisar neste trecho'}
              </Text>
            </span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onVerAnalise ? (
            <AppButton variant="secondary" size="sm" onClick={onVerAnalise}>
              Ver análise
            </AppButton>
          ) : null}
          {onAbrirEditorial ? (
            <AppButton
              variant="secondary"
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={onAbrirEditorial}
            >
              Abrir Editorial
            </AppButton>
          ) : null}
        </div>
      </div>

      {painelAberto && grupos.length > 0 ? (
        <div id={painelId} className="border-t border-[var(--border-subtle)]">
          {grupos.map(grupo => {
            const pedeRevisao = grupo.itens.some(aviso => aviso.severidade === 'revisar');
            // Capacidade e frequência abrem quando pedem revisão. As outras linhas ficam recolhidas, com o resumo na frente.
            const padraoAberto = (grupo.id === 'capacidade' || grupo.id === 'frequencia') && pedeRevisao;
            const aberto = grupo.id in escolhidos ? escolhidos[grupo.id] : padraoAberto;
            return (
              <section key={grupo.id} className="border-t border-[var(--border-subtle)] first:border-t-0">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={aberto}
                  onClick={() => alternar(grupo.id, padraoAberto)}
                >
                  <MarcaDoGrupo id={grupo.id} revisar={pedeRevisao} />
                  <Text variant="bodyStrong" as="span" className="shrink-0">{grupo.titulo}</Text>
                  <Text variant="meta" as="span" className="min-w-0 flex-1 truncate">{resumoDoGrupo(grupo.id, grupo.itens)}</Text>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform',
                      !aberto && '-rotate-90',
                    )}
                    aria-hidden
                  />
                </button>
                {aberto ? (
                  <div className="px-4 pb-3 pl-9">
                    <DetalheDoGrupo
                      id={grupo.id}
                      itens={grupo.itens}
                      avisoAtivoId={avisoAtivoId}
                      onLocalizar={onLocalizar}
                      onFoiDeProposito={onFoiDeProposito}
                      onLimparDestaque={onLimparDestaque}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </Surface>
  );
}

function MarcaDoGrupo({id, revisar}: {id: string; revisar: boolean}) {
  if (revisar || id === 'capacidade' || id === 'frequencia') {
    return (
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          revisar ? 'bg-[var(--accent-orange)]' : 'bg-[var(--text-tertiary)]',
        )}
        aria-hidden
      />
    );
  }
  const Icone = id === 'metas' ? Target : id === 'assuntos' ? Orbit : Calendar;
  return <Icone className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />;
}

function DetalheDoGrupo({
  id,
  itens,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onLimparDestaque,
}: {
  id: string;
  itens: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
}) {
  if (id === 'capacidade') return <DetalheCapacidade itens={itens} onLocalizar={onLocalizar} />;
  if (id === 'frequencia') return <DetalheFrequencia itens={itens} onLocalizar={onLocalizar} />;
  return (
    <div className="stack-sm">
      {itens.map(aviso => (
        <div key={aviso.id} className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="meta" as="p" className="min-w-0 flex-1">{linhaDoAviso(id, aviso)}</Text>
          <AcoesDoAviso
            aviso={aviso}
            avisoAtivoId={avisoAtivoId}
            onLocalizar={onLocalizar}
            onFoiDeProposito={onFoiDeProposito}
            onLimparDestaque={onLimparDestaque}
          />
        </div>
      ))}
    </div>
  );
}

function DetalheCapacidade({
  itens,
  onLocalizar,
}: {
  itens: readonly AvisoOrientacao[];
  onLocalizar: (aviso: AvisoOrientacao) => void;
}) {
  const semana = itens.find(aviso => aviso.tipo === 'capacidade-semana') ?? null;
  const gravacoes = itens.filter(aviso => aviso.tipo === 'gravacoes-no-dia');
  const detalhe = semana ? detalheDaCapacidade(semana.texto) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 stack-xs">
        {detalhe ? <Text variant="meta" as="p">{detalhe}</Text> : null}
        {gravacoes.map(aviso => (
          <Text key={aviso.id} variant="meta" as="p">{aviso.texto}</Text>
        ))}
      </div>
      {semana ? (
        <AppButton variant="secondary" size="sm" onClick={abrirRitmo}>
          Ajustar ritmo →
        </AppButton>
      ) : gravacoes[0] ? (
        <LinkVerPautas onClick={() => onLocalizar(gravacoes[0])} />
      ) : null}
    </div>
  );
}

function DetalheFrequencia({
  itens,
  onLocalizar,
}: {
  itens: readonly AvisoOrientacao[];
  onLocalizar: (aviso: AvisoOrientacao) => void;
}) {
  return (
    <div className="stack-sm">
      {itens.map(aviso => {
        const partes = partesDaFrequencia(aviso.texto);
        return (
          <div key={aviso.id} className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1 stack-xs">
              {partes.nome ? <Text variant="bodyStrong" as="p">{partes.nome}</Text> : (
                <Text variant="meta" as="p">{aviso.texto}</Text>
              )}
              {partes.intervalo ? <Text variant="meta" as="p">{partes.intervalo}</Text> : null}
              {partes.ciclo ? <Text variant="meta" as="p">A frequência é avaliada por ciclo.</Text> : null}
              {partes.nome && partes.nota ? <Text variant="meta" as="p">{partes.nota}</Text> : null}
            </div>
            <LinkVerPautas onClick={() => onLocalizar(aviso)} />
          </div>
        );
      })}
    </div>
  );
}

function AcoesDoAviso({
  aviso,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onLimparDestaque,
}: {
  aviso: AvisoOrientacao;
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <LinkVerPautas onClick={() => onLocalizar(aviso)} />
      {onFoiDeProposito && podeMarcar(aviso) ? (
        <AppButton variant="secondary" size="sm" onClick={() => onFoiDeProposito(aviso)}>
          Foi de propósito
        </AppButton>
      ) : null}
      {avisoAtivoId === aviso.id && onLimparDestaque ? (
        <AppButton variant="ghost" size="sm" onClick={onLimparDestaque}>
          Limpar
        </AppButton>
      ) : null}
    </div>
  );
}

function LinkVerPautas({onClick}: {onClick: () => void}) {
  return (
    <button type="button" className="t-meta shrink-0" style={{color: 'var(--accent-purple)'}} onClick={onClick}>
      Ver pautas →
    </button>
  );
}

function podeMarcar(aviso: AvisoOrientacao): boolean {
  return (aviso.tipo === 'obra-repetida' || aviso.tipo === 'tema-concentrado') && Boolean(aviso.alvoId && aviso.intervalo);
}

function abrirRitmo() {
  window.dispatchEvent(new Event('criaki:abrir-ritmo'));
  document.querySelector('[data-planejamento-regua-slot]')?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function resumoDoGrupo(id: string, itens: readonly AvisoOrientacao[]): string {
  if (id === 'capacidade') return resumoDaCapacidade(itens);
  if (id === 'frequencia') return resumoDaFrequencia(itens);
  if (id === 'continuidade') return resumoDaContinuidade(itens);
  if (id === 'metas') return resumoDasMetas(itens);
  return resumoDosAssuntos(itens);
}

function resumoDaCapacidade(itens: readonly AvisoOrientacao[]): string {
  const semana = itens.find(aviso => aviso.tipo === 'capacidade-semana');
  if (semana) {
    const match = semana.texto.match(/pede ([0-9]+(?:,[0-9]+)?) roteiros? e cabem (\d+) gravações?/);
    if (match) {
      const [, pede, grava] = match;
      return `${pede} ${pede === '1' ? 'roteiro' : 'roteiros'} nesta semana · ${grava} ${grava === '1' ? 'gravação disponível' : 'gravações disponíveis'}`;
    }
    return semana.texto;
  }
  return itens.length === 1 ? itens[0].texto : `${itens.length} dias acima do limite de gravação`;
}

function detalheDaCapacidade(texto: string): string | null {
  const match = texto.match(/\((\d+) dias? × (\d+)\)/);
  if (!match) return null;
  const [, dias, limite] = match;
  return `${dias} ${dias === '1' ? 'dia' : 'dias'} de gravação × ${limite} por dia`;
}

function partesDaFrequencia(texto: string): {resumo: string; nome: string | null; intervalo: string | null; ciclo: boolean; nota: string | null} {
  const um = texto.match(/^(.+?) tem (\d+) pautas? em ([^;]+); a frequência pede (\d+)/);
  if (um) {
    return {
      resumo: `${um[2]} ${um[2] === '1' ? 'pauta' : 'pautas'} no ciclo · meta de ${um[4]}`,
      nome: um[1],
      intervalo: um[3],
      ciclo: true,
      nota: null,
    };
  }
  const varias = texto.match(/^(.+?) passa da frequência em (\d+) janelas: (\d+) pautas onde a frequência pede (\d+)/);
  if (varias) {
    return {
      resumo: `${varias[3]} pautas em ${varias[2]} janelas · meta de ${varias[4]}`,
      nome: varias[1],
      intervalo: null,
      ciclo: true,
      nota: null,
    };
  }
  const reserva = texto.match(/^(.+?): (\d+) janela/);
  if (reserva) {
    const n = reserva[2];
    return {
      resumo: `${reserva[1]} · ${n} ${n === '1' ? 'janela só com post-it' : 'janelas só com post-it'}`,
      nome: reserva[1],
      intervalo: null,
      ciclo: false,
      nota: n === '1'
        ? '1 janela coberta só por post-it, conteúdo a desenvolver.'
        : `${n} janelas cobertas só por post-it, conteúdo a desenvolver.`,
    };
  }
  return {resumo: texto, nome: null, intervalo: null, ciclo: false, nota: null};
}

function resumoDaFrequencia(itens: readonly AvisoOrientacao[]): string {
  if (itens.length === 1) return partesDaFrequencia(itens[0].texto).resumo;
  return `${itens.length} séries fora da frequência`;
}

function resumoDaContinuidade(itens: readonly AvisoOrientacao[]): string {
  const doze = itens.filter(aviso => aviso.tipo === 'ausencia-12-dias');
  const mes = itens.filter(aviso => aviso.tipo === 'ausencia-mes');
  const vespera = itens.filter(aviso => aviso.tipo === 'vespera-sem-pronto');
  const partes: string[] = [];
  if (doze.length === 1) partes.push(doze[0].texto);
  else if (doze.length > 1) partes.push(`${doze.length} séries sem pauta nos próximos 12 dias`);
  if (mes.length === 1) partes.push(mes[0].texto);
  else if (mes.length > 1) partes.push(`${mes.length} séries sem pauta no mês`);
  if (vespera.length === 1) partes.push('1 pauta com pendência de gravação');
  else if (vespera.length > 1) partes.push(`${vespera.length} pautas com pendência de gravação`);
  if (partes.length > 0) return partes.join(' · ');
  return itens.length === 1 ? itens[0].texto : `${itens.length} séries sem pauta neste trecho`;
}

function resumoDasMetas(itens: readonly AvisoOrientacao[]): string {
  if (itens.length === 1) return linhaDaMeta(itens[0].texto);
  return `${itens.length} séries com episódios em falta`;
}

function linhaDaMeta(texto: string): string {
  const match = texto.match(/^Mais (\d+) episódios? de (.+) pra fechar o período/);
  if (!match) return texto;
  return `${match[2]}: faltam ${match[1]} ${match[1] === '1' ? 'episódio' : 'episódios'}`;
}

function resumoDosAssuntos(itens: readonly AvisoOrientacao[]): string {
  if (itens.length === 1) return linhaDoAssunto(itens[0].texto);
  const nomes = itens.map(aviso => nomeDoAlvo(aviso.texto)).filter((nome): nome is string => Boolean(nome));
  const amostra = nomes.slice(0, 2).join(' e ');
  const contagem = itens[0].texto.match(/^(\d+) pautas/);
  const janela = itens[0].texto.match(/em (\d+) dias/);
  if (amostra && contagem && janela) return `${amostra} · ${contagem[1]} pautas por assunto em ${janela[1]} dias`;
  return `${itens.length} assuntos repetidos neste trecho`;
}

function linhaDoAviso(id: string, aviso: AvisoOrientacao): string {
  if (id === 'metas') return linhaDaMeta(aviso.texto);
  if (id === 'assuntos') return linhaDoAssunto(aviso.texto);
  return aviso.texto;
}

function linhaDoAssunto(texto: string): string {
  const assunto = texto.match(/^(\d+) pautas do mesmo assunto em (\d+) dias: ([^(]+)/);
  if (assunto) return `${assunto[3].trim()} · ${assunto[1]} pautas por assunto em ${assunto[2]} dias`;
  const obra = texto.match(/^(\d+) pautas da mesma obra em (\d+) dias: ([^(]+)/);
  if (obra) return `${obra[3].trim()} · ${obra[1]} pautas da mesma obra em ${obra[2]} dias`;
  return texto;
}

function nomeDoAlvo(texto: string): string | null {
  const match = texto.match(/: ([^(]+?)(?:\s*\(|$)/);
  return match ? match[1].trim() : null;
}
