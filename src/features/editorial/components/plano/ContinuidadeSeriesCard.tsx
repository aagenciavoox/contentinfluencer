import { useState } from 'react';
import { Activity, Plus, Trash2 } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import type { Platform, Serie } from '../../../../lib/database';
import { generateUUID } from '../../../../utils/uuid';
import { rotuloConta } from '../../../contas/lib/contas';
import {
  acompanhamentoGeral,
  acompanhamentosPorEscopo,
  acompanhaNoGeral,
  chaveDoEscopo,
  comAcompanhamentoGeral,
  metaDoEscopo,
  novoAcompanhamento,
  serieAcompanhada,
} from '../../lib/acompanhamento';
import { situacaoDaFrequencia, TEXTO_SEM_ANCORA, textoFrequencia } from '../../lib/apuracaoSerie';
import type { AcompanhamentoSerie, MetaDaSerieNoEscopo } from '../../lib/continuidadeEscopo';
import { FORMATOS_DA_REDE, rotuloDoFormato } from '../../lib/publicacoes';
import { CAMPO, CardConfiguracao } from './campos';

function textoDaSituacao(serie: Serie): { texto: string; pode: boolean } {
  const situacao = situacaoDaFrequencia(serie);
  if (situacao.tipo === 'definida') return { texto: textoFrequencia(situacao.freq), pode: true };
  // Tem frequência, falta o início dos ciclos: pode marcar, a Saúde mostra a pendência.
  if (situacao.tipo === 'sem-ancora') return { texto: TEXTO_SEM_ANCORA, pode: true };
  if (situacao.tipo === 'incompleta') return { texto: 'Frequência incompleta: escolha a unidade', pode: false };
  if (situacao.tipo === 'sob-demanda') return { texto: 'Sob demanda', pode: false };
  return { texto: 'Sem frequência definida', pode: false };
}

function ehQuadro(serie: Serie): boolean {
  return serie.tipoAgrupamento === 'quadro' || (serie.tipoAgrupamento == null && Boolean(serie.parentId));
}

const FORMATOS = [...new Set(Object.values(FORMATOS_DA_REDE).flatMap(lista => [...(lista ?? [])]))];

const UNIDADES = [
  { value: 'semana', label: 'por semana' },
  { value: 'quinzena', label: 'a cada 14 dias' },
  { value: 'mes', label: 'por mês' },
];

/** Uma linha do editor: o acompanhamento e a meta do mesmo escopo (vazia = usa a meta geral da série). */
type Linha = AcompanhamentoSerie & {
  metaVezes: string;
  metaUnidade: MetaDaSerieNoEscopo['unidade'];
  metaAPartirDe: string;
};

function linhasDaSerie(serie: Serie): Linha[] {
  return acompanhamentosPorEscopo(serie).map(item => {
    const meta = metaDoEscopo(serie.metasPorEscopo, item);
    return {
      ...item,
      metaVezes: meta ? String(meta.vezes) : '',
      metaUnidade: meta?.unidade ?? 'semana',
      metaAPartirDe: meta?.aPartirDe ?? '',
    };
  });
}

function rotuloDoEscopo(linha: Pick<AcompanhamentoSerie, 'escopo' | 'platformId' | 'formato'>, contas: readonly Platform[]): string {
  const conta = contas.find(item => item.id === linha.platformId);
  const nomeConta = conta ? rotuloConta(conta) : null;
  if (linha.escopo === 'conta') return nomeConta ?? 'Conta removida';
  const formato = linha.formato ? rotuloDoFormato(linha.formato, conta?.rede ?? null) : 'Formato';
  return nomeConta ? `${formato} em ${nomeConta}` : `${formato} em todas as contas`;
}

function diaMesCurto(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

/** "Geral: de 10/11 até 20/12 · até 10 dias sem episódio", só com o que foi definido. */
function regrasDoGeral(serie: Serie): string | null {
  const geral = acompanhamentoGeral(serie);
  if (!geral?.ativo) return null;
  const partes = [
    geral.inicio && geral.termino ? `de ${diaMesCurto(geral.inicio)} até ${diaMesCurto(geral.termino)}`
      : geral.inicio ? `a partir de ${diaMesCurto(geral.inicio)}`
        : geral.termino ? `até ${diaMesCurto(geral.termino)}` : null,
    geral.distanciaMaxDias ? `até ${geral.distanciaMaxDias} dias sem episódio` : null,
    geral.evitarDiasSeguidos ? 'evita dias seguidos' : null,
  ].filter(Boolean);
  return partes.length > 0 ? `Geral: ${partes.join(', ')}` : null;
}

function numeroDeDias(texto: string): number | null {
  const n = Number.parseInt(texto.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Início, término, distância máxima e dias seguidos: os mesmos campos no geral e em cada escopo. */
function RegrasDoAcompanhamento({
  item,
  onChange,
}: {
  item: Pick<AcompanhamentoSerie, 'inicio' | 'termino' | 'distanciaMaxDias' | 'evitarDiasSeguidos'>;
  onChange: (patch: Partial<AcompanhamentoSerie>) => void;
}) {
  return (
    <>
      <div className="grid-form">
        <label className="flex flex-col gap-1"><Text variant="meta" as="span">Início (opcional)</Text>
          <input type="date" className={CAMPO} value={item.inicio ?? ''} onChange={event => onChange({ inicio: event.target.value || null })} /></label>
        <label className="flex flex-col gap-1"><Text variant="meta" as="span">Término (opcional)</Text>
          <input type="date" className={CAMPO} value={item.termino ?? ''} onChange={event => onChange({ termino: event.target.value || null })} /></label>
        <label className="flex flex-col gap-1"><Text variant="meta" as="span">Distância máxima sem episódio (dias)</Text>
          <input type="text" inputMode="numeric" className={CAMPO} value={item.distanciaMaxDias ?? ''}
            onChange={event => onChange({ distanciaMaxDias: numeroDeDias(event.target.value) })} /></label>
      </div>
      <label className="flex w-fit items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={item.evitarDiasSeguidos} onChange={event => onChange({ evitarDiasSeguidos: event.target.checked })} className="h-4 w-4 accent-[var(--brand-accent)]" />
        <Text variant="body" as="span">Avisar episódios em dias seguidos</Text>
      </label>
    </>
  );
}

/** Regras do acompanhamento geral e acompanhamento por conta ou formato, com a meta daquele escopo. */
function EscoposDaSerie({ serie, contas, onClose }: { serie: Serie; contas: readonly Platform[]; onClose: () => void }) {
  const { dispatch } = useAppContext();
  const [linhas, setLinhas] = useState<Linha[]>(() => linhasDaSerie(serie));
  // Só existe com a série marcada: as regras do geral (antes do início, nenhum aviso).
  const [geral, setGeral] = useState<AcompanhamentoSerie | null>(() => acompanhamentoGeral(serie));
  const [erro, setErro] = useState<string | null>(null);

  const mudar = (id: string, patch: Partial<Linha>) => setLinhas(prev => prev.map(linha => (linha.id === id ? { ...linha, ...patch } : linha)));
  const adicionar = (escopo: 'conta' | 'formato') => {
    const base = novoAcompanhamento(serie.id, escopo, escopo === 'conta' ? contas[0]?.id ?? null : null, escopo === 'formato' ? FORMATOS[0] ?? 'reels' : null, generateUUID());
    setLinhas(prev => [...prev, { ...base, metaVezes: '', metaUnidade: 'semana', metaAPartirDe: '' }]);
  };

  const salvar = () => {
    const chaves = linhas.map(chaveDoEscopo);
    if (new Set(chaves).size !== chaves.length) { setErro('Há dois acompanhamentos no mesmo escopo. Deixe só um.'); return; }
    if (linhas.some(linha => linha.escopo === 'conta' && !linha.platformId)) { setErro('Escolha a conta.'); return; }
    if ([...linhas, ...(geral ? [geral] : [])].some(linha => linha.inicio && linha.termino && linha.inicio > linha.termino)) { setErro('O término vem antes do início.'); return; }
    if (linhas.some(linha => linha.metaVezes && linha.metaUnidade === 'quinzena' && !linha.metaAPartirDe)) {
      setErro('Meta a cada 14 dias precisa da data de início dos ciclos.');
      return;
    }
    const acompanhamentos: AcompanhamentoSerie[] = [
      ...(geral
        ? [{ ...geral, inicio: geral.inicio || null, termino: geral.termino || null }]
        : (serie.acompanhamentos ?? []).filter(item => item.escopo === 'geral')),
      ...linhas.map(({ metaVezes: _v, metaUnidade: _u, metaAPartirDe: _a, ...item }) => ({
        ...item,
        platformId: item.escopo === 'conta' || item.escopo === 'formato' ? item.platformId || null : null,
        inicio: item.inicio || null,
        termino: item.termino || null,
      })),
    ];
    // Só as metas dos escopos que ficaram: removido ou trocado, a meta do escopo antigo sai junto.
    const metas: MetaDaSerieNoEscopo[] = [
      ...linhas.flatMap(linha => {
        const vezes = Number.parseInt(linha.metaVezes, 10);
        if (!Number.isFinite(vezes) || vezes <= 0) return [];
        return [{ serieId: serie.id, platformId: linha.platformId || null, formato: linha.formato || null, vezes, unidade: linha.metaUnidade, aPartirDe: linha.metaAPartirDe || null }];
      }),
    ];
    void dispatch({ type: 'UPDATE_SERIE', payload: { ...serie, acompanhamentos, metasPorEscopo: metas, updatedAt: new Date().toISOString() } });
    onClose();
  };

  const opcoesConta = contas.map(conta => ({ value: conta.id, label: rotuloConta(conta) }));

  return (
    <div className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3">
      {geral ? (
        <div className="stack-xs">
          <Text variant="bodyStrong" as="span">Geral (todas as contas)</Text>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Antes do início não há aviso nem pendência; depois do término, a série sai da conferência.
          </Text>
          <RegrasDoAcompanhamento item={geral} onChange={patch => setGeral(atual => (atual ? { ...atual, ...patch } : atual))} />
        </div>
      ) : (
        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          Marque a série para definir início, término e as regras do acompanhamento geral.
        </Text>
      )}
      <Text variant="meta" as="p" className="border-t border-[var(--border-subtle)] pt-2 text-[var(--text-secondary)]">
        Por conta ou formato: cada escopo é conferido à parte na Saúde. Sem meta própria, o escopo usa a meta geral da série.
      </Text>
      {linhas.length === 0 ? <Text variant="meta" as="p">Nenhum acompanhamento por conta ou formato.</Text> : null}
      {linhas.map(linha => (
        <div key={linha.id} className="stack-xs border-t border-[var(--border-subtle)] pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text variant="bodyStrong" as="span">{rotuloDoEscopo(linha, contas)}</Text>
            <AppButton variant="ghost" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setLinhas(prev => prev.filter(item => item.id !== linha.id))}>
              Remover
            </AppButton>
          </div>
          <div className="grid-form">
            {linha.escopo === 'formato' ? (
              <SelectField block ariaLabel="Formato" value={linha.formato ?? ''} onChange={formato => mudar(linha.id, { formato })}
                options={FORMATOS.map(formato => ({ value: formato, label: rotuloDoFormato(formato) }))} />
            ) : null}
            <SelectField block ariaLabel="Conta" value={linha.platformId ?? ''} onChange={platformId => mudar(linha.id, { platformId: platformId || null })}
              options={linha.escopo === 'formato' ? [{ value: '', label: 'Todas as contas' }, ...opcoesConta] : opcoesConta} />
          </div>
          <RegrasDoAcompanhamento item={linha} onChange={patch => mudar(linha.id, patch)} />
          <div className="grid-form">
            <label className="flex flex-col gap-1"><Text variant="meta" as="span">Meta neste escopo (vazio = meta geral)</Text>
              <input type="text" inputMode="numeric" className={CAMPO} value={linha.metaVezes}
                onChange={event => mudar(linha.id, { metaVezes: event.target.value.replace(/\D/g, '').slice(0, 2) })} /></label>
            <SelectField block ariaLabel="Período da meta" value={linha.metaUnidade}
              onChange={unidade => mudar(linha.id, { metaUnidade: (unidade || 'semana') as Linha['metaUnidade'] })} options={UNIDADES} />
            <label className="flex flex-col gap-1"><Text variant="meta" as="span">Meta a partir de</Text>
              <input type="date" className={CAMPO} value={linha.metaAPartirDe} onChange={event => mudar(linha.id, { metaAPartirDe: event.target.value })} /></label>
          </div>
          <label className="flex w-fit items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={linha.ativo} onChange={event => mudar(linha.id, { ativo: event.target.checked })} className="h-4 w-4 accent-[var(--brand-accent)]" />
            <Text variant="body" as="span">Acompanhando</Text>
          </label>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} disabled={contas.length === 0} onClick={() => adicionar('conta')}>Por conta</AppButton>
        <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => adicionar('formato')}>Por formato</AppButton>
      </div>
      {erro ? <Text variant="meta" as="p" className="text-[var(--accent-red)]">{erro}</Text> : null}
      <div className="flex gap-2">
        <AppButton variant="primary" size="sm" onClick={salvar}>Salvar</AppButton>
        <AppButton variant="ghost" size="sm" onClick={onClose}>Cancelar</AppButton>
      </div>
    </div>
  );
}

/**
 * Quais séries (e quadros com meta própria) entram na Continuidade da Saúde, no geral
 * e por conta ou formato. Grava em serie_acompanhamento pela ação de atualizar a série.
 */
export function ContinuidadeSeriesCard() {
  const { state, dispatch } = useAppContext();
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const contas = state.platforms.filter(conta => conta.ativo);
  const lista = state.series
    .filter(serie => serie.ativa !== false && serie.tipoAgrupamento !== 'familia')
    .filter(serie => !ehQuadro(serie) || situacaoDaFrequencia(serie).tipo !== 'sem-frequencia' || serieAcompanhada(serie))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'));
  const marcadas = lista.filter(serieAcompanhada).length;
  // Sem a tabela nenhuma série vem com a lista; uma série recém-criada sem ela não indica migração faltando.
  const semTabela = state.series.length > 0 && state.series.every(serie => serie.acompanhamentos === undefined);

  const alternar = (serie: Serie, valor: boolean) => {
    void dispatch({ type: 'UPDATE_SERIE', payload: { ...comAcompanhamentoGeral(serie, valor, generateUUID), updatedAt: new Date().toISOString() } });
  };

  return (
    <CardConfiguracao
      icone={<Activity className="h-5 w-5" />}
      titulo="Continuidade na Saúde"
      descricao="Marque as séries e os quadros com meta própria que a Saúde do Planejamento deve conferir intervalo a intervalo. Também dá para acompanhar uma conta ou um formato à parte, com meta própria."
    >
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {marcadas === 0 ? 'Nenhuma acompanhada.' : `${marcadas} de ${lista.length} acompanhadas.`}
      </Text>
      {semTabela ? (
        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
          Acompanhar por conta ou formato precisa da migração 20261103120000.
        </Text>
      ) : null}
      <ul className="stack-xs mt-2">
        {lista.map(serie => {
          const { texto, pode } = textoDaSituacao(serie);
          const marcada = acompanhaNoGeral(serie);
          const escopos = acompanhamentosPorEscopo(serie);
          const id = `continuidade-${serie.id}`;
          return (
            <li key={serie.id} className="stack-xs">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={id} className="flex min-w-0 items-center gap-2 cursor-pointer">
                  <input
                    id={id}
                    type="checkbox"
                    checked={marcada}
                    // Marcada que perdeu a frequência ainda pode ser desmarcada.
                    disabled={!pode && !marcada}
                    onChange={event => alternar(serie, event.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[var(--brand-accent)]"
                  />
                  <Text variant="body" as="span" className="truncate">
                    {serie.name}{ehQuadro(serie) ? ' (quadro)' : ''}
                  </Text>
                </label>
                <span className="flex shrink-0 items-center gap-2">
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{texto}</Text>
                  {serie.acompanhamentos !== undefined ? (
                    <AppButton variant="ghost" size="sm" onClick={() => setAbertaId(abertaId === serie.id ? null : serie.id)}>
                      {escopos.length > 0 ? `Detalhes (${escopos.length} por conta ou formato)` : 'Detalhes'}
                    </AppButton>
                  ) : null}
                </span>
              </div>
              {abertaId !== serie.id && (regrasDoGeral(serie) || escopos.length > 0) ? (
                <Text variant="meta" as="p" className="pl-6 text-[var(--text-tertiary)]">
                  {[
                    regrasDoGeral(serie),
                    ...escopos.map(item => `${rotuloDoEscopo(item, state.platforms)}${item.ativo ? '' : ' (desligado)'}`),
                  ].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {abertaId === serie.id ? <EscoposDaSerie serie={serie} contas={contas} onClose={() => setAbertaId(null)} /> : null}
            </li>
          );
        })}
      </ul>
    </CardConfiguracao>
  );
}
