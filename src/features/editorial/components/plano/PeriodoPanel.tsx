import { useNavigate } from 'react-router-dom';
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
import { CAMPO_BASE, CampoNumero, CampoTexto, digitos, inteiroOuNull } from './campos';
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
      className={`${CAMPO_BASE} block min-h-9 w-16 py-1 text-right tabular-nums pointer-coarse:min-h-11`}
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
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border-color)]">
            <th scope="col" className="py-2 pr-3">
              <Text variant="label" as="span">Objetivo</Text>
            </th>
            {['Meta', ...COLUNAS.map(coluna => coluna.rotulo)].map(coluna => (
              <th key={coluna} scope="col" className="px-3 py-2 text-right">
                <Text variant="label" as="span">{coluna}</Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(linha => (
            <tr key={linha.funcao} className="border-b border-[var(--border-color)] last:border-b-0">
              <th scope="row" className="py-2 pr-3">
                <label htmlFor={`meta-${linha.funcao}`}>
                  <Text variant="body" as="span">{FUNCAO_CURTA[linha.funcao]}</Text>
                </label>
              </th>
              <td className="px-3 py-1.5 text-right">
                <span className="flex justify-end">
                  <CampoMeta linha={linha} onChange={value => onMetaChange(linha.funcao, value)} />
                </span>
              </td>
              {COLUNAS.map(coluna => (
                <td key={coluna.id} className="px-3 py-2 text-right tabular-nums">
                  <Text variant="body" as="span">{linha[coluna.id]}</Text>
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

function ListaDoPeriodo({ titulo, linhas }: { titulo: string; linhas: LinhaDoPeriodo[] }) {
  return (
    <Surface variant="info">
      <Text variant="bodyStrong">{titulo}</Text>
      <ul className="mt-3 stack-sm">
        {linhas.map(linha => (
          <li key={linha.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
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
    </Surface>
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
    { id: 'limite', rotulo: 'Limite', valor: celula(contagem.limite) },
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

  return (
    <div className="stack-lg">
      <PeriodoEditorialControl periodo={periodo} onChange={onPeriodoChange} />

      <Surface>
        <CampoTexto
          id="prioridade-periodo"
          label="Prioridade deste período"
          rows={2}
          placeholder="Ex.: lançar a série Leia comigo e testar o horário das 19h"
          value={decisao?.prioridade ?? ''}
          onSave={prioridade => {
            if (prioridade === (decisao?.prioridade ?? '')) return;
            salvarDecisao(periodo, { prioridade });
          }}
        />
      </Surface>

      {semLimite ? (
        <Surface className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="body">Defina quantos roteiros cabem por semana para ver a conta do período.</Text>
          <AppButton variant="secondary" size="sm" onClick={onAbrirAjustes}>
            Definir limite
          </AppButton>
        </Surface>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {numeros.map(item => (
            <Surface key={item.id} variant="info">
              <Text variant="label">{item.rotulo}</Text>
              <Text variant="itemTitle" as="p" className="mt-1 tabular-nums">{item.valor}</Text>
            </Surface>
          ))}
        </div>
      )}

      {avisos.length > 0 ? (
        <Surface>
          <Text variant="bodyStrong">Avisos</Text>
          <ul className="mt-3 stack-sm">
            {avisos.map(aviso => (
              <li key={aviso.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <Text variant="secondary" className="min-w-[12rem] flex-1">{aviso.texto}</Text>
                {aviso.acao ? (
                  <AppButton variant="secondary" size="sm" onClick={aviso.acao.onClick}>
                    {aviso.acao.rotulo}
                  </AppButton>
                ) : null}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <Surface>
        <div className="stack-sm">
          <Text variant="bodyStrong">Por objetivo</Text>
          <Text variant="secondary">A meta é opcional e vale só para este período.</Text>
        </div>
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
      </Surface>

      {parciais.length > 0 ? (
        <Surface>
          <div className="stack-md">
            <div className="stack-sm">
              <Text variant="bodyStrong">Semanas que cruzam o período</Text>
              <Text variant="secondary">
                {semLimite
                  ? 'Limite só para estas semanas, de domingo a sábado.'
                  : `Limite só para estas semanas, de domingo a sábado. Vazio usa o limite de sempre (${limiteSemanal}).`}
              </Text>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {parciais.map(semana => {
                const ajuste = decisao?.ajustesSemana.find(
                  item => item.inicio === semana.inicio && item.fim === semana.fim,
                );
                return (
                  <CampoNumero
                    key={`${semana.inicio}:${semana.fim}`}
                    id={`ajuste-${semana.inicio}`}
                    label={rotuloSemanaAjustada(semana.inicio, semana.fim)}
                    value={ajuste == null ? '' : String(ajuste.limite)}
                    onChange={value => {
                      const quantidade = inteiroOuNull(value);
                      const outros = (decisao?.ajustesSemana ?? []).filter(
                        item => !(item.inicio === semana.inicio && item.fim === semana.fim),
                      );
                      salvarDecisao(periodo, {
                        ajustesSemana: quantidade == null ? outros : [...outros, { ...semana, limite: quantidade }],
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>
        </Surface>
      ) : null}

      {pilares.length > 0 || series.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {pilares.length > 0 ? <ListaDoPeriodo titulo="Pilares neste período" linhas={pilares} /> : null}
          {series.length > 0 ? <ListaDoPeriodo titulo="Séries neste período" linhas={series} /> : null}
        </div>
      ) : null}

      <Text variant="secondary">{fraseProntos(estoque, reserva)}</Text>
    </div>
  );
}
