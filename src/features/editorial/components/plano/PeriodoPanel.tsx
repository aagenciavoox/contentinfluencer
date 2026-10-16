import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, CalendarRange, Flag, Layers, Target } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { DisclosureButton } from '../../../../components/ui/DisclosureButton';
import { InlineNotice, type InlineNoticeAction } from '../../../../components/ui/InlineNotice';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import type { FuncaoEditorial } from '../../../../lib/database';
import { BREAKPOINTS } from '../../../../shared/breakpoints';
import { contarEstoque } from '../../lib/estoque';
import type { MetasPeriodo } from '../../lib/editorialSettings';
import { ETAPA_LABEL, ETAPAS, ETAPAS_DE_CONTEUDO, contagemPorEtapaVazia, somaDasEtapas, type ContagemPorEtapa, type Etapa } from '../../lib/etapas';
import { expectativaNoIntervalo, lerFrequencia } from '../../lib/frequenciaSerie';
import { FUNCAO_CURTA, FUNCOES } from '../../lib/funcoes';
import { decisaoDoPeriodo } from '../../lib/periodoEditorial';
import { sortPilares } from '../../../settings/lib/activePilares';
import { CAMPO_BASE, CampoTexto, CardConfiguracao, digitos, inteiroOuNull } from './campos';
import { ItensDoPeriodoDialog, type FiltroDosItens } from './ItensDoPeriodoDialog';
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

/** Uma linha da distribuição. `funcao` null é "Sem objetivo": não tem meta. */
type LinhaObjetivo = {
  funcao: FuncaoEditorial | null;
  nome: string;
  cor: string;
  meta: number | null;
  previsto: number;
  porEtapa: ContagemPorEtapa;
};

function chaveDaLinha(linha: LinhaObjetivo): string {
  return linha.funcao ?? 'sem-objetivo';
}

function CampoMeta({ linha, onChange }: { linha: LinhaObjetivo; onChange: (value: string) => void }) {
  return (
    <input
      id={`meta-${chaveDaLinha(linha)}`}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="—"
      value={linha.meta == null ? '' : String(linha.meta)}
      onChange={event => onChange(digitos(event.target.value))}
      aria-label={`Meta de ${linha.nome}`}
      className={`${CAMPO_BASE} block min-h-9 w-16 py-1 text-center tabular-nums pointer-coarse:min-h-11`}
    />
  );
}

/** Número que abre a lista do que está nele. Zero não abre nada. */
function NumeroQueAbre({
  valor,
  rotulo,
  onAbrir,
}: {
  valor: number;
  rotulo: string;
  onAbrir: () => void;
}) {
  if (valor === 0) {
    return <Text variant="body" as="span" className="tabular-nums text-[var(--text-tertiary)]">0</Text>;
  }
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={rotulo}
      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-input)] px-2 t-body font-semibold tabular-nums text-[var(--text-primary)] underline decoration-[var(--border-color)] underline-offset-4 hover:bg-[var(--bg-hover)] hover:decoration-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
    >
      {valor}
    </button>
  );
}

function rotuloDoNumero(valor: number, linha: LinhaObjetivo, etapa: Etapa | null): string {
  const quantos = valor === 1 ? 'o item' : `os ${valor} itens`;
  return etapa
    ? `Ver ${quantos} de ${linha.nome} em ${ETAPA_LABEL[etapa]}`
    : `Ver ${quantos} previstos de ${linha.nome}`;
}

/**
 * Tabela no computador; no celular, uma linha por objetivo com as etapas que têm item.
 * Cada número abre a lista do que está nele.
 */
function MetasPorObjetivo({
  linhas,
  onMetaChange,
  onAbrir,
}: {
  linhas: LinhaObjetivo[];
  onMetaChange: (funcao: FuncaoEditorial, value: string) => void;
  onAbrir: (filtro: FiltroDosItens) => void;
}) {
  const estreito = useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 1}px)`);
  const abrir = (linha: LinhaObjetivo, etapa: Etapa | null) => onAbrir({
    titulo: etapa ? `${linha.nome} · ${ETAPA_LABEL[etapa]}` : `${linha.nome} · Previstos`,
    objetivo: linha.funcao,
    etapas: etapa ? [etapa] : ETAPAS,
  });

  if (estreito) {
    return (
      <ul className="mt-3">
        {linhas.map(linha => {
          const etapasComItem = ETAPAS.filter(etapa => linha.porEtapa[etapa] > 0);
          const funcao = linha.funcao;
          return (
            <li
              key={chaveDaLinha(linha)}
              className="stack-xs border-b border-[var(--border-color)] py-2 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={funcao ? `meta-${funcao}` : undefined} className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: linha.cor }} aria-hidden />
                  <Text variant="body" as="span">{linha.nome}</Text>
                </label>
                {funcao ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <Text variant="label" as="span" aria-hidden>Meta</Text>
                    <CampoMeta linha={linha} onChange={value => onMetaChange(funcao, value)} />
                  </span>
                ) : null}
              </div>
              {linha.previsto === 0 ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">Nada previsto</Text>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Text variant="meta" as="span">Previstos</Text>
                    <NumeroQueAbre
                      valor={linha.previsto}
                      rotulo={rotuloDoNumero(linha.previsto, linha, null)}
                      onAbrir={() => abrir(linha, null)}
                    />
                  </span>
                  {etapasComItem.map(etapa => (
                    <span key={etapa} className="inline-flex items-center gap-1">
                      <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{ETAPA_LABEL[etapa]}</Text>
                      <NumeroQueAbre
                        valor={linha.porEtapa[etapa]}
                        rotulo={rotuloDoNumero(linha.porEtapa[etapa], linha, etapa)}
                        onAbrir={() => abrir(linha, etapa)}
                      />
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  const colunas = ['Meta', 'Previstos', ...ETAPAS.map(etapa => ETAPA_LABEL[etapa])];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[var(--surface-subtle)]">
            <th scope="col" className="rounded-l-[var(--radius-input)] py-2 pl-3 pr-3">
              <Text variant="label" as="span" className="text-[var(--text-secondary)]">Objetivo</Text>
            </th>
            {colunas.map((coluna, index) => (
              <th
                key={coluna}
                scope="col"
                className={`px-2 py-2 text-center ${index === colunas.length - 1 ? 'rounded-r-[var(--radius-input)]' : ''}`}
              >
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">{coluna}</Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(linha => {
            const funcao = linha.funcao;
            return (
              <tr key={chaveDaLinha(linha)} className="border-b border-[var(--border-color)] last:border-b-0">
                <th scope="row" className="py-2 pl-3 pr-3 font-normal">
                  <span className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: linha.cor }} aria-hidden />
                    {funcao ? (
                      <label htmlFor={`meta-${funcao}`}>
                        <Text variant="body" as="span">{linha.nome}</Text>
                      </label>
                    ) : (
                      <Text variant="body" as="span">{linha.nome}</Text>
                    )}
                  </span>
                </th>
                <td className="px-2 py-1.5">
                  <span className="flex justify-center">
                    {funcao ? (
                      <CampoMeta linha={linha} onChange={value => onMetaChange(funcao, value)} />
                    ) : (
                      <Text variant="body" as="span" className="text-[var(--text-tertiary)]">—</Text>
                    )}
                  </span>
                </td>
                <td className="border-r border-[var(--border-color)] px-2 py-1 text-center">
                  <NumeroQueAbre
                    valor={linha.previsto}
                    rotulo={rotuloDoNumero(linha.previsto, linha, null)}
                    onAbrir={() => abrir(linha, null)}
                  />
                </td>
                {ETAPAS.map(etapa => (
                  <td key={etapa} className="px-2 py-1 text-center">
                    <NumeroQueAbre
                      valor={linha.porEtapa[etapa]}
                      rotulo={rotuloDoNumero(linha.porEtapa[etapa], linha, etapa)}
                      onAbrir={() => abrir(linha, etapa)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type LinhaDoPeriodo = { id: string; nome: string; cor?: string | null; texto: string };

function GrupoDoPeriodo({ titulo, linhas }: { titulo: string; linhas: LinhaDoPeriodo[] }) {
  return (
    <div className="stack-sm">
      <Text variant="eyebrow" as="p">{titulo}</Text>
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
            <Text variant="secondary" as="span" className="shrink-0 tabular-nums">{linha.texto}</Text>
          </li>
        ))}
      </ul>
    </div>
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
  const [filtroItens, setFiltroItens] = useState<FiltroDosItens | null>(null);
  const [semanasAbertas, setSemanasAbertas] = useState(false);
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

  const avisos: Array<{ id: string; texto: string; acao?: InlineNoticeAction }> = [];
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
      texto: n === 1 ? '1 conteúdo sem objetivo definido.' : `${n} conteúdos sem objetivo definido.`,
      acao: {
        rotulo: 'Ver quais',
        onClick: () => setFiltroItens({ titulo: 'Sem objetivo', objetivo: null, etapas: ETAPAS_DE_CONTEUDO }),
      },
    });
  }

  const numeros = [
    { id: 'limite', rotulo: periodo.modo === 'semana' ? 'Limite da semana' : 'Limite do período', valor: celula(contagem.limite) },
    { id: 'previstos', rotulo: 'Previstos', valor: String(contagem.previsto) },
    { id: 'postados', rotulo: 'Postados', valor: String(contagem.porEtapa.postado) },
    { id: 'prontos', rotulo: 'Prontos de reserva', valor: reserva == null ? String(estoque) : `${estoque} de ${reserva}` },
  ];

  const linhasObjetivo: LinhaObjetivo[] = FUNCOES.map(funcao => {
    const porEtapa = objetivos.get(funcao)?.porEtapa ?? contagemPorEtapaVazia();
    return {
      funcao,
      nome: FUNCAO_CURTA[funcao],
      cor: COR_DA_FUNCAO[funcao],
      meta: decisao?.metas[funcao] ?? null,
      previsto: somaDasEtapas(porEtapa),
      porEtapa,
    };
  });
  // Sem objetivo entra como linha para a soma bater com os previstos do período.
  const previstosSemObjetivo = somaDasEtapas(contagem.semObjetivoPorEtapa);
  if (previstosSemObjetivo > 0) {
    linhasObjetivo.push({
      funcao: null,
      nome: 'Sem objetivo',
      cor: 'var(--text-tertiary)',
      meta: null,
      previsto: previstosSemObjetivo,
      porEtapa: contagem.semObjetivoPorEtapa,
    });
  }

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


  const notaCapacidade = semLimite
    ? null
    : periodo.modo === 'semana'
      ? `Limite semanal de ${limiteSemanal}, salvo um ajuste desta semana.`
      : `Soma das semanas inteiras; nas semanas cortadas, ${limiteSemanal} × dias ÷ 7, arredondado.`;

  return (
    <div className="stack-lg">
      <PeriodoEditorialControl periodo={periodo} onChange={onPeriodoChange} />

      {/* Leitura do período: os números primeiro, numa faixa só. */}
      <div className="stack-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {numeros.map(item => (
            <Surface key={item.id} variant="info" padding="sm">
              <Text variant="label">{item.rotulo}</Text>
              <Text variant="itemTitle" as="p" className="mt-1 tabular-nums">{item.valor}</Text>
            </Surface>
          ))}
        </div>
        <Text variant="meta" as="p">
          {notaCapacidade ? `${notaCapacidade} ` : ''}Cada roteiro conta uma vez, na publicação original da grade. TikTok entra como extra da semana, fora do limite.
        </Text>
        {semLimite ? (
          <div className="flex flex-wrap items-center gap-3">
            <Text variant="secondary" as="p">Quantos roteiros cabem na sua semana?</Text>
            <AppButton variant="secondary" size="sm" onClick={onAbrirAjustes}>
              Definir limite
            </AppButton>
          </div>
        ) : null}
      </div>

      {avisos.length > 0 ? (
        <div className="stack-sm">
          {avisos.map(aviso => <InlineNotice key={aviso.id} texto={aviso.texto} acao={aviso.acao} />)}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CardConfiguracao icone={<Flag className="h-5 w-5" />} titulo="Prioridade do período">
          <CampoTexto
            key={`${periodo.inicio}:${periodo.fim}`}
            id="prioridade-periodo"
            nome="Prioridade do período"
            rows={4}
            placeholder={'O que merece atenção neste período?\nEx.: lançar a série Leia comigo e testar o horário das 19h.'}
            value={decisao?.prioridade ?? ''}
            onSave={prioridade => {
              if (prioridade === (decisao?.prioridade ?? '')) return;
              salvarDecisao(periodo, { prioridade });
            }}
          />
        </CardConfiguracao>

        <CardConfiguracao
          icone={<Layers className="h-5 w-5" />}
          titulo="Pilares e séries no período"
          acao={(
            <AppButton
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/editorial?aba=series')}
            >
              Ver todas as séries
            </AppButton>
          )}
        >
          {pilares.length > 0 || series.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {pilares.length > 0 ? <GrupoDoPeriodo titulo="Pilares" linhas={pilares} /> : null}
              {series.length > 0 ? <GrupoDoPeriodo titulo="Séries" linhas={series} /> : null}
            </div>
          ) : (
            <Text variant="secondary">Nenhum pilar ou série ativa neste período.</Text>
          )}
        </CardConfiguracao>
      </div>

      <CardConfiguracao
        icone={<Target className="h-5 w-5" />}
        titulo="Distribuição por objetivo"
        descricao="Metas opcionais para este período. Cada número abre o que está nele."
      >
        <MetasPorObjetivo
          linhas={linhasObjetivo}
          onMetaChange={(funcao, value) => salvarDecisao(periodo, {
            metas: metasCom(decisao?.metas ?? {}, funcao, value),
          })}
          onAbrir={setFiltroItens}
        />
        <Text variant="secondary">
          Planejamento é o post-it com data e sem conteúdo. As outras colunas seguem o status de cada conteúdo.
        </Text>
      </CardConfiguracao>

      <ItensDoPeriodoDialog
        filtro={filtroItens}
        itens={contagem.itens}
        periodo={periodo}
        onClose={() => setFiltroItens(null)}
      />

      {parciais.length > 0 ? (
        <Surface padding="sm" className="stack-sm">
          <DisclosureButton
            open={semanasAbertas}
            onToggle={() => setSemanasAbertas(aberto => !aberto)}
            controls="semanas-parciais"
          >
            <CalendarRange className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
            <Text variant="bodyStrong" as="span">Semanas que cruzam o período</Text>
            <Text variant="secondary" as="span">Ajuste a capacidade das semanas parciais.</Text>
          </DisclosureButton>
          {semanasAbertas ? (
            <ul id="semanas-parciais" className="stack-sm">
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
                    <Text variant="secondary" as="span" aria-hidden>Limite ajustado</Text>
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
                    <Text variant="secondary" as="span">
                      {semLimite ? 'Domingo a sábado.' : `Domingo a sábado. Vazio usa o limite de sempre (${limiteSemanal}).`}
                    </Text>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Surface>
      ) : null}
    </div>
  );
}
