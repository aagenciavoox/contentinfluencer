import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { Dialog } from '../../../../components/overlays/Dialog';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import type { FuncaoEditorial, Platform } from '../../../../lib/database';
import type { AjusteSemana, DecisaoPeriodo, MetasPeriodo } from '../../lib/editorialSettings';
import type { OrigemDaMeta } from '../../lib/proporcaoObjetivos';
import { rotuloDoPeriodo, type PeriodoSelecionado } from './PeriodoEditorialControl';

/** Uma linha do objetivo no editor: a meta que vale, o que a proporção daria e de onde veio. */
export type ObjetivoNoEditor = {
  funcao: FuncaoEditorial;
  nome: string;
  meta: number | null;
  calculada: number | null;
  percentual: number | null;
  origem: OrigemDaMeta;
};

export interface AjustarMetasDialogProps {
  open: boolean;
  onClose: () => void;
  periodo: PeriodoSelecionado;
  decisao: DecisaoPeriodo | null;
  platforms: readonly Platform[];
  /** O que a meta vale sem número escrito: o ritmo semanal vezes as semanas. null = sem meta. */
  producaoCalculada: number | null;
  publicacaoCalculada: number | null;
  /** Distribuição por objetivo do período (proporção × meta, ou o ajuste já gravado). */
  objetivos?: readonly ObjetivoNoEditor[];
  /** Semanas domingo–sábado que o período só cobre em parte. */
  semanasParciais?: readonly { inicio: string; fim: string }[];
  limiteSemanal?: number | null;
  /** Meta de publicação que vale hoje, para conferir a soma por objetivo. */
  metaDoPeriodo?: number | null;
  onSalvar: (patch: Partial<Omit<DecisaoPeriodo, 'inicio' | 'fim'>>) => void;
}

function inteiro(texto: string): number | null {
  const limpo = texto.replace(/\D/g, '');
  if (!limpo) return null;
  const n = Number.parseInt(limpo, 10);
  return Number.isFinite(n) ? n : null;
}

function rotuloDaSemana(inicio: string, fim: string): string {
  const dia = (iso: string) => format(parseISO(iso), "d 'de' MMM", { locale: ptBR });
  return `${dia(inicio)} a ${dia(fim)}`;
}

/**
 * O editor de metas do período: o mesmo no Editorial e no Planejamento.
 * Foco, prioridade, pausa, metas, distribuição por objetivo e semanas que cruzam o período.
 */
export function AjustarMetasDialog({
  open,
  onClose,
  periodo,
  decisao,
  platforms,
  producaoCalculada,
  publicacaoCalculada,
  objetivos = [],
  semanasParciais = [],
  limiteSemanal = null,
  metaDoPeriodo = null,
  onSalvar,
}: AjustarMetasDialogProps) {
  const [prioridade, setPrioridade] = useState('');
  const [prioridadeNivel, setPrioridadeNivel] = useState('Alta');
  const [pausaEditorial, setPausaEditorial] = useState('');
  const [metasProducao, setMetasProducao] = useState('');
  const [metasPublicacao, setMetasPublicacao] = useState('');
  const [metasPorConta, setMetasPorConta] = useState<
    Record<string, { producao?: number; publicacao?: number; ritmoSemanal?: string }>
  >({});
  const [metasObjetivo, setMetasObjetivo] = useState<Record<string, string>>({});
  const [ajustesSemana, setAjustesSemana] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setPrioridade(decisao?.prioridade ?? '');
      setPrioridadeNivel(decisao?.prioridadeNivel ?? 'Alta');
      setPausaEditorial(decisao?.pausaEditorial ?? '');
      // Campo vazio segue o ritmo; só um número escrito vira meta ajustada.
      setMetasProducao(decisao?.metasProducao != null ? String(decisao.metasProducao) : '');
      setMetasPublicacao(decisao?.metasPublicacao != null ? String(decisao.metasPublicacao) : '');
      setMetasPorConta(decisao?.metasPorConta ?? {});
      // Só o número digitado para este período aparece; vazio segue a proporção.
      setMetasObjetivo(Object.fromEntries(objetivos.map(linha => [
        linha.funcao,
        linha.origem === 'ajustada' && linha.meta != null ? String(linha.meta) : '',
      ])));
      setAjustesSemana(Object.fromEntries(semanasParciais.map(semana => {
        const ajuste = decisao?.ajustesSemana.find(item => item.inicio === semana.inicio && item.fim === semana.fim);
        return [semana.inicio, ajuste == null ? '' : String(ajuste.limite)];
      })));
    }
    // Lê a decisão ao abrir; enquanto aberto, o rascunho é da pessoa.
  }, [open, decisao]);

  const metasDoRascunho = (): MetasPeriodo => {
    const metas: MetasPeriodo = {};
    for (const linha of objetivos) {
      const n = inteiro(metasObjetivo[linha.funcao] ?? '');
      if (n == null) continue;
      // Digitar o mesmo número da proporção não cria ajuste.
      if (linha.origem !== 'ajustada' && n === linha.calculada) continue;
      metas[linha.funcao] = n;
    }
    return metas;
  };

  const ajustesDoRascunho = (): AjusteSemana[] => {
    const parciais = new Set(semanasParciais.map(semana => `${semana.inicio}:${semana.fim}`));
    // Ajustes de outras semanas continuam como estavam.
    const outros = (decisao?.ajustesSemana ?? []).filter(item => !parciais.has(`${item.inicio}:${item.fim}`));
    const novos = semanasParciais.flatMap(semana => {
      const n = inteiro(ajustesSemana[semana.inicio] ?? '');
      return n == null ? [] : [{ inicio: semana.inicio, fim: semana.fim, limite: n }];
    });
    return [...outros, ...novos];
  };

  const handleSave = () => {
    const prod = parseInt(metasProducao, 10);
    const pub = parseInt(metasPublicacao, 10);
    onSalvar({
      prioridade: prioridade.trim(),
      prioridadeNivel,
      pausaEditorial: pausaEditorial.trim(),
      metasProducao: Number.isFinite(prod) ? prod : undefined,
      metasPublicacao: Number.isFinite(pub) ? pub : undefined,
      metasPorConta,
      ...(objetivos.length > 0 ? { metas: metasDoRascunho() } : {}),
      ...(semanasParciais.length > 0 ? { ajustesSemana: ajustesDoRascunho() } : {}),
    });
    onClose();
  };

  const placeholderMeta = (calculada: number | null) =>
    calculada == null ? 'Sem meta' : `${calculada} pelo ritmo`;

  // Soma do que vai valer por objetivo: o digitado ou o da proporção.
  const somaObjetivos = objetivos.reduce((soma, linha) => {
    const digitado = inteiro(metasObjetivo[linha.funcao] ?? '');
    return soma + (digitado ?? (linha.origem === 'ajustada' ? 0 : linha.calculada ?? 0));
  }, 0);
  const metaPublicacaoDigitada = inteiro(metasPublicacao);
  const metaParaConferir = metaPublicacaoDigitada ?? metaDoPeriodo;
  const algumObjetivoComNumero = objetivos.some(linha => inteiro(metasObjetivo[linha.funcao] ?? '') != null || linha.calculada != null);

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="md:max-w-[680px]" ariaLabel="Ajustar Metas do Período">
      <OverlayHeader
        title="Ajustar Metas do Período"
        subtitle={`Metas do período: ${rotuloDoPeriodo(periodo)}.`}
      />
      <OverlayBody className="stack-md">
        <div className="stack-xs">
          <label htmlFor="foco-periodo">
            <Text variant="bodyStrong" as="span">
              Foco / Prioridade Estratégica
            </Text>
          </label>
          <input
            id="foco-periodo"
            type="text"
            className="input w-full"
            placeholder="Ex.: Foco em Cosmere & Ritmo de Final de Ano"
            value={prioridade}
            onChange={e => setPrioridade(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="stack-xs">
            <label htmlFor="nivel-prioridade">
              <Text variant="bodyStrong" as="span">
                Nível de Prioridade
              </Text>
            </label>
            <SelectField
              id="nivel-prioridade"
              value={prioridadeNivel}
              onChange={val => setPrioridadeNivel(val)}
              options={[
                { value: 'Alta', label: 'Alta' },
                { value: 'Média', label: 'Média' },
                { value: 'Baixa', label: 'Baixa' },
              ]}
            />
          </div>

          <div className="stack-xs">
            <label htmlFor="pausa-editorial">
              <Text variant="bodyStrong" as="span">
                Pausas &amp; Exceções
              </Text>
            </label>
            <input
              id="pausa-editorial"
              type="text"
              className="input w-full"
              placeholder="Ex.: 24/12 a 26/12"
              aria-describedby="pausa-editorial-ajuda"
              value={pausaEditorial}
              onChange={e => setPausaEditorial(e.target.value)}
            />
            <Text id="pausa-editorial-ajuda" variant="meta" as="p" className="text-[var(--text-tertiary)]">
              Só pausa com data certa é descontada da meta. Sem data, fica para revisão.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="stack-xs">
            <label htmlFor="meta-producao">
              <Text variant="bodyStrong" as="span">
                Roteiros com data no período
              </Text>
            </label>
            <input
              id="meta-producao"
              type="number"
              min="0"
              className="input w-full"
              placeholder={placeholderMeta(producaoCalculada)}
              value={metasProducao}
              onChange={e => setMetasProducao(e.target.value)}
            />
            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
              Conta roteiros com data de publicação ou de gravação. Não indica produção concluída.
            </Text>
          </div>

          <div className="stack-xs">
            <label htmlFor="meta-publicacao">
              <Text variant="bodyStrong" as="span">
                Meta de publicação (conteúdos)
              </Text>
            </label>
            <input
              id="meta-publicacao"
              type="number"
              min="0"
              className="input w-full"
              placeholder={placeholderMeta(publicacaoCalculada)}
              value={metasPublicacao}
              onChange={e => setMetasPublicacao(e.target.value)}
            />
            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
              Cada conteúdo conta uma vez, como na Saúde. Um número aqui vale no lugar do ritmo.
            </Text>
          </div>
        </div>

        {objetivos.length > 0 ? (
          <div className="stack-sm pt-2 border-t border-[var(--border-subtle)]">
            <Text variant="itemTitle" as="h4">Distribuição por objetivo</Text>
            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
              Em branco, vale a proporção × meta do período. Um número vale só para este período e aparece também na Saúde.
            </Text>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {objetivos.map(linha => {
                const id = `meta-objetivo-${linha.funcao}`;
                return (
                  <div key={linha.funcao} className="stack-xs">
                    <label htmlFor={id}>
                      <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                        {linha.nome}{linha.percentual != null ? ` · ${linha.percentual}%` : ''}
                      </Text>
                    </label>
                    <input
                      id={id}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="input w-full py-1 tabular-nums"
                      placeholder={linha.calculada == null ? '—' : `${linha.calculada} pela proporção`}
                      value={metasObjetivo[linha.funcao] ?? ''}
                      onChange={event => {
                        const valor = event.target.value.replace(/\D/g, '');
                        setMetasObjetivo(atual => ({ ...atual, [linha.funcao]: valor }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
            {algumObjetivoComNumero && metaParaConferir != null && somaObjetivos !== metaParaConferir ? (
              <Text variant="meta" as="p" role="status" className="text-[#92400e] dark:text-[#fde68a]">
                As metas por objetivo somam {somaObjetivos}; a meta de publicação do período é {metaParaConferir}. Revise antes de usar a distribuição.
              </Text>
            ) : null}
          </div>
        ) : null}

        {semanasParciais.length > 0 ? (
          <div className="stack-sm pt-2 border-t border-[var(--border-subtle)]">
            <Text variant="itemTitle" as="h4">Semanas que cruzam o período</Text>
            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
              Quantas publicações cabem na parte da semana dentro do período. Vazio usa o ritmo proporcional aos dias.
            </Text>
            <div className="stack-xs">
              {semanasParciais.map(semana => {
                const id = `ajuste-dialog-${semana.inicio}`;
                return (
                  <div key={semana.inicio} className="flex flex-wrap items-center gap-3">
                    <label htmlFor={id} className="min-w-0 flex-1">
                      <Text variant="body" as="span">Semana de {rotuloDaSemana(semana.inicio, semana.fim)}</Text>
                    </label>
                    <input
                      id={id}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="input w-20 py-1 text-center tabular-nums"
                      placeholder={limiteSemanal == null ? '—' : 'ritmo'}
                      value={ajustesSemana[semana.inicio] ?? ''}
                      onChange={event => {
                        const valor = event.target.value.replace(/\D/g, '');
                        setAjustesSemana(atual => ({ ...atual, [semana.inicio]: valor }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="stack-sm pt-2 border-t border-[var(--border-subtle)]">
          <Text variant="itemTitle" as="h4">
            Metas Individuais por Conta
          </Text>
          <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
            Opcional. Sem número aqui, a conta mostra só quantos posts saíram.
          </Text>
          <div className="stack-sm">
            {platforms.length === 0 ? (
              <Text variant="secondary" as="p">Nenhuma conta ativa.</Text>
            ) : null}
            {platforms.map(conta => {
              const dadosConta = metasPorConta[conta.id] ?? {};
              return (
                <div
                  key={conta.id}
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 stack-xs"
                >
                  <Text variant="bodyStrong" as="p">
                    {conta.nome}
                  </Text>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor={`prod-${conta.id}`}>
                        <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">
                          Produção (roteiros)
                        </Text>
                      </label>
                      <input
                        id={`prod-${conta.id}`}
                        type="number"
                        min="0"
                        className="input w-full py-1"
                        value={dadosConta.producao ?? ''}
                        onChange={e => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          setMetasPorConta(prev => ({
                            ...prev,
                            [conta.id]: { ...prev[conta.id], producao: val },
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`pub-${conta.id}`}>
                        <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">
                          Publicação (posts)
                        </Text>
                      </label>
                      <input
                        id={`pub-${conta.id}`}
                        type="number"
                        min="0"
                        className="input w-full py-1"
                        value={dadosConta.publicacao ?? ''}
                        onChange={e => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          setMetasPorConta(prev => ({
                            ...prev,
                            [conta.id]: { ...prev[conta.id], publicacao: val },
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`ritmo-${conta.id}`}>
                        <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">
                          Posts por semana
                        </Text>
                      </label>
                      <input
                        id={`ritmo-${conta.id}`}
                        type="text"
                        placeholder="Ex.: 3"
                        className="input w-full py-1"
                        value={dadosConta.ritmoSemanal ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setMetasPorConta(prev => ({
                            ...prev,
                            [conta.id]: { ...prev[conta.id], ritmoSemanal: val },
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton variant="primary" onClick={handleSave}>
          Salvar Metas
        </AppButton>
      </OverlayFooter>
    </Dialog>
  );
}
