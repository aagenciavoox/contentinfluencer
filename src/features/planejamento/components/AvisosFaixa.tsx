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
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
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
  onQueroFazerAMais,
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
            {onQueroFazerAMais && atual.ciente && !atual.reconhecido ? (
              <AppButton variant="secondary" size="sm" onClick={() => onQueroFazerAMais(atual)}>
                Quero fazer a mais
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
  {id: 'capacidade', titulo: 'Capacidade', tipos: ['capacidade-semana', 'gravacoes-no-dia', 'gravacao-antecedencia', 'videos-dia-abaixo', 'videos-dia-acima', 'faixa-abaixo', 'faixa-acima', 'faixa-config']},
  {id: 'frequencia', titulo: 'Frequência', tipos: ['serie-acima', 'serie-reservada']},
  {id: 'continuidade', titulo: 'Continuidade', tipos: ['ausencia-12-dias', 'ausencia-mes', 'vespera-sem-pronto']},
  {id: 'metas', titulo: 'Metas do período', tipos: ['serie-abaixo']},
  {id: 'assuntos', titulo: 'Assuntos repetidos', tipos: ['obra-repetida', 'tema-concentrado', 'saturacao-quadro']},
];

const LIMITE_INICIAL_GRUPO = 5;

/** Lista expansível de grupos de ajustes, reutilizada tanto no card avulso quanto no drawer de saúde. */
export function AjustesGruposPainel({
  id,
  avisos,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
}: {
  id?: string;
  avisos: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
}) {
  const [escolhidos, setEscolhidos] = useState<Record<string, boolean>>({});
  const [gruposCompletos, setGruposCompletos] = useState<Record<string, boolean>>({});
  const grupos = GRUPOS.map(grupo => ({
    ...grupo,
    itens: avisos
      .filter(aviso => grupo.tipos.includes(aviso.tipo))
      .sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === 'revisar' ? -1 : 1)),
  })).filter(grupo => grupo.itens.length > 0);

  const alternar = (grupoId: string, padrao: boolean) => {
    setEscolhidos(atual => ({...atual, [grupoId]: !(grupoId in atual ? atual[grupoId] : padrao)}));
  };

  if (grupos.length === 0) {
    return (
      <div id={id} className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-4 py-6 text-center">
        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          Nada para revisar neste trecho.
        </Text>
      </div>
    );
  }

  return (
    <div id={id} className="stack-sm">
      {grupos.map(grupo => {
        const pedeRevisao = grupo.itens.some(aviso => aviso.severidade === 'revisar');
        // Capacidade e frequência abrem quando pedem revisão. Os demais começam recolhidos.
        const padraoAberto = (grupo.id === 'capacidade' || grupo.id === 'frequencia') && pedeRevisao;
        const aberto = grupo.id in escolhidos ? escolhidos[grupo.id] : padraoAberto;
        const mostrarTodos = Boolean(gruposCompletos[grupo.id]);
        const visiveis = mostrarTodos ? grupo.itens : grupo.itens.slice(0, LIMITE_INICIAL_GRUPO);
        const restantes = grupo.itens.length - visiveis.length;

        return (
          <section key={grupo.id} className="stack-xs">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              aria-expanded={aberto}
              onClick={() => alternar(grupo.id, padraoAberto)}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <MarcaDoGrupo id={grupo.id} revisar={pedeRevisao} />
                <Text variant="bodyStrong" as="span" className="min-w-0 truncate">
                  {grupo.titulo}
                </Text>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[var(--text-secondary)]">
                <Text variant="meta" as="span" className="tabular-nums text-[var(--text-secondary)]">
                  {grupo.itens.length}
                </Text>
                {aberto ? (
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </span>
            </button>

            {aberto ? (
              <div className="divide-y divide-[var(--border-subtle)] px-2">
                <DetalheDoGrupo
                  id={grupo.id}
                  itens={visiveis}
                  avisoAtivoId={avisoAtivoId}
                  onLocalizar={onLocalizar}
                  onFoiDeProposito={onFoiDeProposito}
                  onQueroFazerAMais={onQueroFazerAMais}
                  onLimparDestaque={onLimparDestaque}
                />
                {restantes > 0 ? (
                  <div className="py-2.5">
                    <button
                      type="button"
                      onClick={() => setGruposCompletos(atual => ({...atual, [grupo.id]: true}))}
                      className="t-label text-[var(--brand-accent-text)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      {`Mostrar mais ${restantes}`}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function AjustesDoPlanejamento({
  avisos,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
  onVerAnalise,
  onAbrirEditorial,
  className,
}: AvisosFaixaProps) {
  const revisar = pontosParaRevisar(avisos);
  // Começa fechado. O detalhe só entra na página quando a pessoa abre o título.
  const [painelAberto, setPainelAberto] = useState(false);
  const painelId = 'ajustes-do-planejamento';

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

      {painelAberto && avisos.length > 0 ? (
        <div className="border-t border-[var(--border-subtle)] p-4">
          <AjustesGruposPainel
            id={painelId}
            avisos={avisos}
            avisoAtivoId={avisoAtivoId}
            onLocalizar={onLocalizar}
            onFoiDeProposito={onFoiDeProposito}
            onQueroFazerAMais={onQueroFazerAMais}
            onLimparDestaque={onLimparDestaque}
          />
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

const textoClicavelClass =
  'block w-full rounded-[var(--radius-sm)] text-left transition-colors hover:text-[var(--brand-accent-text)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

function DetalheDoGrupo({
  id,
  itens,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
}: {
  id: string;
  itens: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
}) {
  if (id === 'capacidade') {
    return (
      <DetalheCapacidade
        itens={itens}
        onLocalizar={onLocalizar}
        onFoiDeProposito={onFoiDeProposito}
        onQueroFazerAMais={onQueroFazerAMais}
        onLimparDestaque={onLimparDestaque}
        avisoAtivoId={avisoAtivoId}
      />
    );
  }
  if (id === 'frequencia') return <DetalheFrequencia itens={itens} onLocalizar={onLocalizar} />;
  return (
    <>
      {itens.map(aviso => (
        <div key={aviso.id} className="py-3 stack-xs">
          <button
            type="button"
            className={textoClicavelClass}
            onClick={() => onLocalizar(aviso)}
          >
            <Text variant="body" as="span" className="text-current">
              {linhaDoAviso(id, aviso)}
            </Text>
          </button>
          <AcoesDoAviso
            aviso={aviso}
            avisoAtivoId={avisoAtivoId}
            onLocalizar={onLocalizar}
            onFoiDeProposito={onFoiDeProposito}
            onQueroFazerAMais={onQueroFazerAMais}
            onLimparDestaque={onLimparDestaque}
          />
        </div>
      ))}
    </>
  );
}

function DetalheCapacidade({
  itens,
  onLocalizar,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
  avisoAtivoId,
}: {
  itens: readonly AvisoOrientacao[];
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
  avisoAtivoId?: string | null;
}) {
  return (
    <>
      {itens.map(aviso => {
        if (aviso.tipo === 'capacidade-semana') {
          const detalhe = detalheDaCapacidade(aviso.texto);
          return (
            <div key={aviso.id} className="py-3 stack-xs">
              <Text variant="body" as="p" className="text-[var(--text-primary)]">
                {aviso.texto}
              </Text>
              {detalhe ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                  {detalhe}
                </Text>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <AppButton variant="secondary" size="xs" onClick={abrirRitmo}>
                  Ajustar ritmo →
                </AppButton>
              </div>
            </div>
          );
        }

        return (
          <div key={aviso.id} className="py-3 stack-xs">
            <button
              type="button"
              className={textoClicavelClass}
              onClick={() => onLocalizar(aviso)}
            >
              <Text variant="body" as="span" className="text-current">
                {aviso.texto}
              </Text>
            </button>
            <AcoesDoAviso
              aviso={aviso}
              avisoAtivoId={avisoAtivoId}
              onLocalizar={onLocalizar}
              onFoiDeProposito={onFoiDeProposito}
              onQueroFazerAMais={onQueroFazerAMais}
              onLimparDestaque={onLimparDestaque}
            />
          </div>
        );
      })}
    </>
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
    <>
      {itens.map(aviso => {
        const partes = partesDaFrequencia(aviso.texto);
        return (
          <div key={aviso.id} className="py-3 stack-xs">
            <button
              type="button"
              className={cn(textoClicavelClass, 'stack-xs')}
              onClick={() => onLocalizar(aviso)}
            >
              {partes.nome ? (
                <Text variant="bodyStrong" as="span" className="block text-current">
                  {partes.nome}
                </Text>
              ) : (
                <Text variant="body" as="span" className="block text-current">
                  {aviso.texto}
                </Text>
              )}
              {partes.intervalo ? (
                <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                  {partes.intervalo}
                </Text>
              ) : null}
              {partes.ciclo ? (
                <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                  A frequência é avaliada por ciclo.
                </Text>
              ) : null}
              {partes.nome && partes.nota ? (
                <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                  {partes.nota}
                </Text>
              ) : null}
            </button>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <AppButton variant="ghost" size="xs" onClick={() => onLocalizar(aviso)}>
                Localizar
              </AppButton>
            </div>
          </div>
        );
      })}
    </>
  );
}

function AcoesDoAviso({
  aviso,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
}: {
  aviso: AvisoOrientacao;
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <AppButton variant="ghost" size="xs" onClick={() => onLocalizar(aviso)}>
        Localizar
      </AppButton>
      {onFoiDeProposito && podeMarcar(aviso) ? (
        <AppButton variant="secondary" size="xs" onClick={() => onFoiDeProposito(aviso)}>
          Foi de propósito
        </AppButton>
      ) : null}
      {onQueroFazerAMais && aviso.ciente && !aviso.reconhecido ? (
        <AppButton variant="secondary" size="xs" onClick={() => onQueroFazerAMais(aviso)}>
          Quero fazer a mais
        </AppButton>
      ) : null}
      {avisoAtivoId === aviso.id && onLimparDestaque ? (
        <AppButton variant="ghost" size="xs" onClick={onLimparDestaque}>
          Limpar
        </AppButton>
      ) : null}
    </div>
  );
}

function podeMarcar(aviso: AvisoOrientacao): boolean {
  return (aviso.tipo === 'obra-repetida' || aviso.tipo === 'tema-concentrado') && Boolean(aviso.alvoId && aviso.intervalo);
}

function abrirRitmo() {
  window.dispatchEvent(new Event('criaki:abrir-ritmo'));
}

function detalheDaCapacidade(texto: string): string | null {
  const match = texto.match(/\((\d+) dias? × (\d+)\)/);
  if (!match) return null;
  const [, dias, limite] = match;
  return `${dias} ${dias === '1' ? 'dia' : 'dias'} de gravação × ${limite} por dia`;
}

function partesDaFrequencia(texto: string): {nome: string | null; intervalo: string | null; ciclo: boolean; nota: string | null} {
  const um = texto.match(/^(.+?) tem (\d+) pautas? em ([^;]+); a frequência pede (\d+)/);
  if (um) {
    return {
      nome: um[1],
      intervalo: um[3],
      ciclo: true,
      nota: null,
    };
  }
  const varias = texto.match(/^(.+?) passa da frequência em (\d+) janelas: (\d+) pautas onde a frequência pede (\d+)/);
  if (varias) {
    return {
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
      nome: reserva[1],
      intervalo: null,
      ciclo: false,
      nota: n === '1'
        ? '1 janela coberta só por post-it, conteúdo a desenvolver.'
        : `${n} janelas cobertas só por post-it, conteúdo a desenvolver.`,
    };
  }
  return {nome: null, intervalo: null, ciclo: false, nota: null};
}

function linhaDaMeta(texto: string): string {
  const match = texto.match(/^Mais (\d+) episódios? de (.+) pra fechar o período/);
  if (!match) return texto;
  return `${match[2]}: faltam ${match[1]} ${match[1] === '1' ? 'episódio' : 'episódios'}`;
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
