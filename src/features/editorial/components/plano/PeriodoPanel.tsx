import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, ArrowRight, CalendarDays, CalendarRange, Flag, FileText, Layers, Target } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import type { FuncaoEditorial } from '../../../../lib/database';
import { BREAKPOINTS } from '../../../../shared/breakpoints';
import { contarEstoque } from '../../lib/estoque';
import type { MetasPeriodo } from '../../lib/editorialSettings';
import { expectativaNoIntervalo, lerFrequencia } from '../../lib/frequenciaSerie';
import { FUNCAO_CURTA, FUNCOES } from '../../lib/funcoes';
import { decisaoDoPeriodo } from '../../lib/periodoEditorial';
import { sortPilares } from '../../../settings/lib/activePilares';
import { CAMPO_BASE, CampoTexto, digitos, inteiroOuNull } from './campos';
import {
  PeriodoEditorialControl,
  rotuloSemanaAjustada,
  semanasParciais,
  useContagemDoPeriodo,
  type PeriodoSelecionado,
} from './PeriodoEditorialControl';
import { useEditorialPlano } from './useEditorialPlano';

function celula(valor: number | null): string {
  return valor == null ? '—' : String(valor);
}

function fraseProntos(estoque: number, reserva: number | null): string {
  if (reserva == null) {
    return estoque === 1 ? '1 roteiro pronto para publicar' : `${estoque} roteiros prontos para publicar`;
  }
  return `${estoque} de ${reserva} roteiros prontos de reserva`;
}

function textoDaSerie(contados: number, esperado: number | null): string {
  if (esperado == null) return `${contados} · quando houver pauta`;
  // Série mensal numa semana sem edição: "0 de 0" não diz nada.
  if (esperado === 0) return contados === 0 ? 'nada previsto' : `${contados} · nada previsto`;
  return `${contados} de ${esperado}`;
}

function metasCom(metas: MetasPeriodo, funcao: FuncaoEditorial, value: string): MetasPeriodo {
  const next = { ...metas };
  const quantidade = inteiroOuNull(value);
  if (quantidade == null) delete next[funcao];
  else next[funcao] = quantidade;
  return next;
}

/** "27 de set. a 3 de out.": a semana parcial no cartão; o rótulo longo fica para o leitor de tela. */
function rotuloCurtoDaSemana(inicio: string, fim: string): string {
  const dia = (iso: string) => format(parseISO(iso), "d 'de' MMM", { locale: ptBR });
  return `${dia(inicio)}. a ${dia(fim)}.`;
}

/** Cor de cada objetivo: só enfeita, o nome vem sempre ao lado. */
const COR_DA_FUNCAO: Record<FuncaoEditorial, string> = {
  atrair: 'var(--accent-pink)',
  converter: 'var(--accent-blue)',
  aprofundar: 'var(--accent-orange)',
  comunidade: 'var(--accent-green)',
  acao: 'var(--accent-red)',
  reter: 'var(--accent-purple)',
};

/** Card da aba Período: ícone da marca, título, frase curta e, à direita, uma ação. */
function CardPeriodo({
  icone,
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  icone: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Surface padding="none" className={`stack-md p-4 md:p-6 ${className ?? ''}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[var(--brand-accent-strong)]" aria-hidden>{icone}</span>
        <div className="min-w-0 flex-1">
          <Text variant="sectionTitle" as="h2">{titulo}</Text>
          {descricao ? <Text variant="secondary" className="mt-0.5 text-[var(--text-secondary)]">{descricao}</Text> : null}
        </div>
        {acao ? <div className="shrink-0">{acao}</div> : null}
      </div>
      {children}
    </Surface>
  );
}

/** Faixa de aviso com uma ação. O texto fica em `--text-primary`; a cor de alerta só tinge o fundo e o ícone. */
function Aviso({ texto, acao }: { texto: string; acao?: { rotulo: string; onClick: () => void } }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-input)] border border-[color-mix(in_srgb,var(--warning)_40%,var(--border-color))] bg-[color-mix(in_srgb,var(--warning)_12%,var(--bg-elevated))] px-3 py-2">
      <AlertCircle className="h-5 w-5 shrink-0 text-[var(--warning)]" aria-hidden />
      <Text variant="bodyStrong" as="p" className="min-w-[12rem] flex-1">{texto}</Text>
      {acao ? (
        <AppButton variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={acao.onClick}>
          {acao.rotulo}
        </AppButton>
      ) : null}
    </div>
  );
}

type LinhaObjetivo = {
  funcao: FuncaoEditorial;
  meta: number | null;
  previsto: number;
  comPauta: number;
  publicado: number;
};

const COLUNAS = [
  { id: 'previsto', rotulo: 'Previsto' },
  { id: 'comPauta', rotulo: 'Com pauta' },
  { id: 'publicado', rotulo: 'Publicado' },
] as const;

function CampoMeta({ linha, onChange }: { linha: LinhaObjetivo; onChange: (value: string) => void }) {
  return (
    <input
      id={`meta-${linha.funcao}`}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="—"
      value={linha.meta == null ? '' : String(linha.meta)}
      onChange={event => onChange(digitos(event.target.value))}
      aria-label={`Meta de ${FUNCAO_CURTA[linha.funcao]}`}
      className={`${CAMPO_BASE} block min-h-9 w-16 py-1 text-center tabular-nums pointer-coarse:min-h-11`}
    />
  );
}

/** Tabela no computador; no celular, uma linha por objetivo, para as quatro colunas não cortarem. */
function MetasPorObjetivo({
  linhas,
  onMetaChange,
}: {
  linhas: LinhaObjetivo[];
  onMetaChange: (funcao: FuncaoEditorial, value: string) => void;
}) {
  const estreito = useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 1}px)`);

  if (estreito) {
    return (
      <ul className="mt-3">
        {linhas.map(linha => (
          <li
            key={linha.funcao}
            className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <label htmlFor={`meta-${linha.funcao}`}>
                <Text variant="body" as="span">{FUNCAO_CURTA[linha.funcao]}</Text>
              </label>
              <Text variant="meta" as="p" className="tabular-nums">
                {COLUNAS.map(coluna => `${coluna.rotulo} ${linha[coluna.id]}`).join(' · ')}
              </Text>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <Text variant="label" as="span" aria-hidden>Meta</Text>
              <CampoMeta linha={linha} onChange={value => onMetaChange(linha.funcao, value)} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[var(--surface-subtle)]">
            <th scope="col" className="rounded-l-[var(--radius-input)] py-2 pl-3 pr-3">
              <Text variant="label" as="span" className="text-[var(--text-secondary)]">Objetivo</Text>
            </th>
            {['Meta', ...COLUNAS.map(coluna => coluna.rotulo)].map((coluna, index, todas) => (
              <th
                key={coluna}
                scope="col"
                className={`px-3 py-2 text-center ${index === todas.length - 1 ? 'rounded-r-[var(--radius-input)]' : ''}`}
              >
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">{coluna}</Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(linha => (
            <tr key={linha.funcao} className="border-b border-[var(--border-color)] last:border-b-0">
              <th scope="row" className="py-2 pl-3 pr-3 font-normal">
                <span className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COR_DA_FUNCAO[linha.funcao] }} aria-hidden />
                  <label htmlFor={`meta-${linha.funcao}`}>
                    <Text variant="body" as="span">{FUNCAO_CURTA[linha.funcao]}</Text>
                  </label>
                </span>
              </th>
              <td className="px-3 py-1.5">
                <span className="flex justify-center">
                  <CampoMeta linha={linha} onChange={value => onMetaChange(linha.funcao, value)} />
                </span>
              </td>
              {COLUNAS.map(coluna => (
                <td key={coluna.id} className="px-3 py-2 text-center tabular-nums">
                  <Text variant={linha[coluna.id] > 0 ? 'bodyStrong' : 'body'} as="span">{linha[coluna.id]}</Text>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type LinhaDoPeriodo = { id: string; nome: string; cor?: string | null; texto: string };

function ListaDoPeriodo({
  titulo,
  icone,
  linhas,
  rodape,
}: {
  titulo: string;
  icone: ReactNode;
  linhas: LinhaDoPeriodo[];
  rodape?: ReactNode;
}) {
  return (
    <CardPeriodo icone={icone} titulo={titulo}>
      <ul className="stack-xs">
        {linhas.map(linha => (
          <li key={linha.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--border-color)]"
                style={linha.cor ? { backgroundColor: linha.cor } : undefined}
              />
              <Text variant="body" as="span" className="truncate">{linha.nome}</Text>
            </span>
            <Text variant="secondary" as="span" className="shrink-0 tabular-nums text-[var(--text-secondary)]">{linha.texto}</Text>
          </li>
        ))}
      </ul>
      {rodape}
    </CardPeriodo>
  );
}

/**
 * Aba Período: o seletor de período aparece uma vez, e tudo que muda com ele fica aqui,
 * lido e editado no mesmo lugar (prioridade, metas, limite de semana parcial). O que vale
 * sempre fica na aba Ajustes.
 */
export function PeriodoPanel({
  periodo,
  onPeriodoChange,
  onAbrirAjustes,
}: {
  periodo: PeriodoSelecionado;
  onPeriodoChange: (periodo: PeriodoSelecionado) => void;
  onAbrirAjustes: () => void;
}) {
  const navigate = useNavigate();
  const { state, settings, salvarDecisao } = useEditorialPlano();
  const contagem = useContagemDoPeriodo(periodo.inicio, periodo.fim);
  const decisao = decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);
  const parciais = semanasParciais(periodo.inicio, periodo.fim);
  const limiteSemanal = settings.preferencias.limiteSemanal;
  const semLimite = limiteSemanal == null;
  const estoque = contarEstoque(state.contents, {
    redeReferenciaId: settings.preferencias.redeReferenciaId,
  });
  const reserva = settings.preferencias.reservaProntos;
  const objetivos = new Map(contagem.objetivos.map(objetivo => [objetivo.id, objetivo]));

  const avisos: Array<{ id: string; texto: string; acao?: { rotulo: string; onClick: () => void } }> = [];
  if (!semLimite && contagem.excesso != null && contagem.excesso > 0) {
    avisos.push({
      id: 'excesso',
      texto: contagem.notaSoma ?? `O período tem ${contagem.previsto} e o limite é ${contagem.limite}.`,
      acao: { rotulo: 'Ajustar o limite', onClick: onAbrirAjustes },
    });
  }
  if (contagem.espacosLivres > 0) {
    const n = contagem.espacosLivres;
    avisos.push({
      id: 'sem-pauta',
      texto: n === 1 ? '1 espaço sem pauta.' : `${n} espaços sem pauta.`,
      acao: { rotulo: 'Abrir o planejamento', onClick: () => navigate('/planejamento') },
    });
  }
  if (contagem.semObjetivo > 0) {
    const n = contagem.semObjetivo;
    avisos.push({
      id: 'sem-objetivo',
      texto: n === 1 ? '1 roteiro sem objetivo definido.' : `${n} roteiros sem objetivo definido.`,
      acao: { rotulo: 'Ver roteiros', onClick: () => navigate('/criacao?tab=roteiros') },
    });
  }

  const numeros = [
    { id: 'limite', rotulo: periodo.modo === 'semana' ? 'Limite da semana' : 'Limite do período', valor: celula(contagem.limite) },
    { id: 'previstos', rotulo: 'Previstos', valor: String(contagem.previsto) },
    { id: 'com-pauta', rotulo: 'Com pauta', valor: String(contagem.comPauta) },
    { id: 'publicados', rotulo: 'Publicados', valor: String(contagem.publicado) },
  ];

  // As contas que antes ficavam nos cards de pilar e de série: aqui, junto do período que as define.
  const previstosPorPilar = new Map(contagem.pilares.map(linha => [linha.id, linha.previsto]));
  const pilares: LinhaDoPeriodo[] = sortPilares(state.pilares)
    .filter(pilar => pilar.ativo || (previstosPorPilar.get(pilar.id) ?? 0) > 0)
    .map(pilar => {
      const previstos = previstosPorPilar.get(pilar.id) ?? 0;
      return {
        id: pilar.id,
        nome: pilar.nome,
        cor: pilar.cor,
        texto: previstos === 1 ? '1 previsto' : `${previstos} previstos`,
      };
    });

  const series: LinhaDoPeriodo[] = state.series
    .filter(serie => serie.ativa)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(serie => {
      const esperado = expectativaNoIntervalo(lerFrequencia({
        frequenciaRecomendada: serie.frequenciaRecomendada,
        vezes: serie.frequenciaVezes,
        unidade: serie.frequenciaUnidade,
        aPartirDe: serie.frequenciaAPartirDe,
      }), periodo.inicio, periodo.fim);
      const contados = contagem.itens.filter(item => item.serieId === serie.id).length;
      return { id: serie.id, nome: serie.name, cor: serie.cor, texto: textoDaSerie(contados, esperado) };
    });

  const avisoObjetivo = avisos.find(aviso => aviso.id === 'sem-objetivo');
  const avisosCapacidade = avisos.filter(aviso => aviso.id !== 'sem-objetivo');

  return (
    <div className="stack-lg">
      <PeriodoEditorialControl periodo={periodo} onChange={onPeriodoChange} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <CardPeriodo icone={<Flag className="h-5 w-5" />} titulo="Prioridade do período">
          <CampoTexto
            key={`${periodo.inicio}:${periodo.fim}`}
            id="prioridade-periodo"
            nome="Prioridade do período"
            rows={2}
            placeholder={'O que merece atenção neste período?\nEx.: lançar a série Leia comigo e testar o horário das 19h.'}
            value={decisao?.prioridade ?? ''}
            onSave={prioridade => {
              if (prioridade === (decisao?.prioridade ?? '')) return;
              salvarDecisao(periodo, { prioridade });
            }}
          />
        </CardPeriodo>

        <CardPeriodo
          icone={<CalendarDays className="h-5 w-5" />}
          titulo="Capacidade de produção"
          acao={semLimite ? (
            <AppButton variant="secondary" size="sm" onClick={onAbrirAjustes}>
              Definir limite
            </AppButton>
          ) : null}
        >
          {semLimite ? (
            <div>
              <Text variant="body">Limite semanal não definido.</Text>
              <Text variant="secondary" className="mt-0.5 text-[var(--text-secondary)]">
                Defina quantos roteiros cabem na sua semana.
              </Text>
            </div>
          ) : (
            <div className="stack-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {numeros.map(item => (
                  <Surface key={item.id} variant="info" padding="sm">
                    <Text variant="label">{item.rotulo}</Text>
                    <Text variant="itemTitle" as="p" className="mt-1 tabular-nums">{item.valor}</Text>
                  </Surface>
                ))}
              </div>
              <Text variant="secondary" className="text-[var(--text-secondary)]">
                {periodo.modo === 'semana'
                  ? `Limite semanal de ${limiteSemanal}, salvo um ajuste desta semana.`
                  : `Soma das semanas inteiras; nas semanas cortadas, ${limiteSemanal} × dias ÷ 7, arredondado.`}
                {' '}Cada roteiro conta uma vez, na publicação original da grade.
              </Text>
            </div>
          )}
          {avisosCapacidade.map(aviso => <Aviso key={aviso.id} texto={aviso.texto} acao={aviso.acao} />)}
        </CardPeriodo>
      </div>

      <CardPeriodo
        icone={<Target className="h-5 w-5" />}
        titulo="Distribuição por objetivo"
        descricao="Metas opcionais para este período."
      >
        {avisoObjetivo ? <Aviso texto={avisoObjetivo.texto} acao={avisoObjetivo.acao} /> : null}
        <MetasPorObjetivo
          linhas={FUNCOES.map(funcao => ({
            funcao,
            meta: decisao?.metas[funcao] ?? null,
            previsto: objetivos.get(funcao)?.previsto ?? 0,
            comPauta: objetivos.get(funcao)?.comPauta ?? 0,
            publicado: objetivos.get(funcao)?.publicado ?? 0,
          }))}
          onMetaChange={(funcao, value) => salvarDecisao(periodo, {
            metas: metasCom(decisao?.metas ?? {}, funcao, value),
          })}
        />
      </CardPeriodo>

      {parciais.length > 0 ? (
        <CardPeriodo icone={<CalendarRange className="h-5 w-5" />} titulo="Semanas que cruzam o período" descricao="Ajuste a capacidade das semanas parciais.">
          <ul className="stack-sm">
            {parciais.map(semana => {
              const ajuste = decisao?.ajustesSemana.find(
                item => item.inicio === semana.inicio && item.fim === semana.fim,
              );
              const id = `ajuste-${semana.inicio}`;
              return (
                <li
                  key={`${semana.inicio}:${semana.fim}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-4 py-2.5"
                >
                  <Text variant="bodyStrong" as="span">{rotuloCurtoDaSemana(semana.inicio, semana.fim)}</Text>
                  <span className="flex items-center gap-2" aria-hidden>
                    <CalendarDays className="h-4 w-4 text-[var(--text-secondary)]" />
                    <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">Limite ajustado</Text>
                  </span>
                  <input
                    id={id}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={semLimite ? '—' : String(limiteSemanal)}
                    aria-label={rotuloSemanaAjustada(semana.inicio, semana.fim)}
                    value={ajuste == null ? '' : String(ajuste.limite)}
                    onChange={event => {
                      const quantidade = inteiroOuNull(digitos(event.target.value));
                      const outros = (decisao?.ajustesSemana ?? []).filter(
                        item => !(item.inicio === semana.inicio && item.fim === semana.fim),
                      );
                      salvarDecisao(periodo, {
                        ajustesSemana: quantidade == null ? outros : [...outros, { ...semana, limite: quantidade }],
                      });
                    }}
                    className={`${CAMPO_BASE} min-h-9 w-16 py-1 text-center tabular-nums pointer-coarse:min-h-11`}
                  />
                  <Text variant="secondary" as="span" className="border-l border-[var(--border-color)] pl-4 text-[var(--text-secondary)]">
                    {semLimite ? 'Domingo a sábado.' : `Domingo a sábado. Vazio usa o limite de sempre (${limiteSemanal}).`}
                  </Text>
                </li>
              );
            })}
          </ul>
        </CardPeriodo>
      ) : null}

      {pilares.length > 0 || series.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {pilares.length > 0 ? (
            <ListaDoPeriodo titulo="Pilares no período" icone={<FileText className="h-5 w-5" />} linhas={pilares} />
          ) : null}
          {series.length > 0 ? (
            <ListaDoPeriodo
              titulo="Séries no período"
              icone={<Layers className="h-5 w-5" />}
              linhas={series}
              rodape={(
                <Link
                  to="/editorial?aba=series"
                  className="inline-flex items-center gap-1 self-start rounded-[var(--radius-sm)] t-secondary font-semibold text-[var(--text-primary)] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Ver todas as séries
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            />
          ) : null}
        </div>
      ) : null}

      <Text variant="secondary" className="text-[var(--text-secondary)]">{fraseProntos(estoque, reserva)}</Text>
    </div>
  );
}
