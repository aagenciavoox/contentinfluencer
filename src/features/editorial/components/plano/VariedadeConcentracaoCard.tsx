import { useMemo, useState } from 'react';
import { endOfMonth, format, parseISO } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { ChoiceChips } from '../../../../components/ui/ChoiceChips';
import { SelectField } from '../../../../components/ui/SelectField';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { generateUUID } from '../../../../utils/uuid';
import { rotuloConta } from '../../../contas/lib/contas';
import {
  excecoesEmVigor,
  FAIXAS_CONCENTRACAO,
  LIMITES_CONCENTRACAO_PADRAO,
  problemaDaExcecao,
  type ExcecaoConcentracao,
  type LimitesConcentracao,
} from '../../lib/concentracao';
import { CAMPO, CAMPO_BASE, CampoStepper, inteiroOuNull } from './campos';
import { EditorialDrawer } from './EditorialDrawer';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes } from './ValeAPartirDe';

type LimitesDraft = {
  repeticoes: string;
  janela: string;
  percentual: string;
  minimo: string;
  assuntoRepeticoes: string;
  assuntoJanela: string;
  contarSequencia: boolean;
};

type ModoDrawer = 'fechado' | 'regras' | 'nova-excecao';
type OrigemExcecao = 'pagina' | 'regras';

function draftDe(limites: LimitesConcentracao): LimitesDraft {
  return {
    repeticoes: String(limites.obraRepeticoes),
    janela: String(limites.obraJanelaDias),
    percentual: String(Math.round(limites.assuntoFracaoMax * 100)),
    minimo: String(limites.assuntoMinPautas),
    assuntoRepeticoes: String(limites.assuntoRepeticoes),
    assuntoJanela: String(limites.assuntoJanelaDias),
    contarSequencia: limites.contarSequencia,
  };
}

function foraDaFaixa(valor: number | null, faixa: { min: number; max: number }): string | undefined {
  if (valor == null) return 'Preencha um número.';
  if (valor < faixa.min || valor > faixa.max) return `Entre ${faixa.min} e ${faixa.max}.`;
  return undefined;
}

type Alvo = { id: string; nome: string };

function novaExcecaoVazia(hoje: string): ExcecaoConcentracao {
  return {
    id: generateUUID(),
    tipo: 'obra',
    alvoId: '',
    platformId: null,
    inicio: hoje,
    fim: format(endOfMonth(parseISO(hoje)), 'yyyy-MM-dd'),
    nota: '',
  };
}

/**
 * Variedade e concentração em modo leitura na página.
 * Edição de regras e adição/remoção de exceções acontecem no mesmo drawer, sem empilhar drawers.
 */
export function VariedadeConcentracaoCard({ embutido: _embutido = false }: { embutido?: boolean } = {}) {
  const { state, settings, gravar } = useEditorialPlano();
  const limites = settings.concentracao ?? LIMITES_CONCENTRACAO_PADRAO;
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const excecoesSalvas = settings.excecoesConcentracao ?? [];
  const emVigor = excecoesEmVigor(excecoesSalvas, hoje);

  const [modo, setModo] = useState<ModoDrawer>('fechado');
  const [origemExcecao, setOrigemExcecao] = useState<OrigemExcecao>('pagina');
  const [draft, setDraft] = useState<LimitesDraft>(() => draftDe(limites));
  const [excecoesDraft, setExcecoesDraft] = useState<ExcecaoConcentracao[]>(excecoesSalvas);
  const [excecaoForm, setExcecaoForm] = useState<ExcecaoConcentracao>(() => novaExcecaoVazia(hoje));
  const [buscaExcecao, setBuscaExcecao] = useState('');

  const obras: Alvo[] = useMemo(
    () => state.bibliotecaItems
      .map(item => ({ id: item.id, nome: item.titulo?.trim() || 'Obra sem título' }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [state.bibliotecaItems],
  );
  const assuntos: Alvo[] = useMemo(
    () => state.temas
      .map(tema => ({ id: tema.id, nome: tema.nome.trim() || 'Assunto sem nome' }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [state.temas],
  );
  const contas = useMemo(
    () => state.platforms.filter(conta => conta.ativo).map(conta => ({ id: conta.id, rotulo: rotuloConta(conta) })),
    [state.platforms],
  );

  const nomeDoAlvo = (excecao: ExcecaoConcentracao) => (
    (excecao.tipo === 'obra' ? obras : assuntos).find(item => item.id === excecao.alvoId)?.nome
      ?? (excecao.tipo === 'obra' ? 'Obra removida' : 'Assunto removido')
  );
  const nomeDaConta = (platformId: string | null) => (
    platformId ? contas.find(conta => conta.id === platformId)?.rotulo ?? 'Conta inativa' : 'Todas as contas'
  );

  const repeticoes = inteiroOuNull(draft.repeticoes);
  const janela = inteiroOuNull(draft.janela);
  const percentual = inteiroOuNull(draft.percentual);
  const minimo = inteiroOuNull(draft.minimo);
  const assuntoRepeticoes = inteiroOuNull(draft.assuntoRepeticoes);
  const assuntoJanela = inteiroOuNull(draft.assuntoJanela);
  const erros = {
    assuntoRepeticoes: foraDaFaixa(assuntoRepeticoes, FAIXAS_CONCENTRACAO.assuntoRepeticoes),
    assuntoJanela: foraDaFaixa(assuntoJanela, FAIXAS_CONCENTRACAO.assuntoJanelaDias),
    repeticoes: foraDaFaixa(repeticoes, FAIXAS_CONCENTRACAO.obraRepeticoes),
    janela: foraDaFaixa(janela, FAIXAS_CONCENTRACAO.obraJanelaDias),
    percentual: foraDaFaixa(percentual, FAIXAS_CONCENTRACAO.assuntoPercentual),
    minimo: foraDaFaixa(minimo, FAIXAS_CONCENTRACAO.assuntoMinPautas),
  };
  const regrasInvalidas = Object.values(erros).some(Boolean);
  const problemaExcecao = problemaDaExcecao(excecaoForm);

  const salvoDraft = draftDe(limites);
  const dirtyRegras = JSON.stringify(draft) !== JSON.stringify(salvoDraft)
    || JSON.stringify(excecoesDraft) !== JSON.stringify(excecoesSalvas);
  const dirtyExcecao = Boolean(
    excecaoForm.alvoId
    || excecaoForm.nota.trim()
    || excecaoForm.platformId != null
    || excecaoForm.tipo !== 'obra',
  );
  const dirty = modo === 'regras'
    ? dirtyRegras
    : modo === 'nova-excecao'
      ? (dirtyExcecao || (origemExcecao === 'regras' && dirtyRegras))
      : false;

  const abrirRegras = () => {
    setDraft(draftDe(limites));
    setExcecoesDraft(excecoesSalvas);
    setModo('regras');
  };

  const abrirNovaExcecao = (origem: OrigemExcecao) => {
    if (origem === 'pagina') {
      setDraft(draftDe(limites));
      setExcecoesDraft(excecoesSalvas);
    }
    setOrigemExcecao(origem);
    setExcecaoForm(novaExcecaoVazia(hoje));
    setBuscaExcecao('');
    setModo('nova-excecao');
  };

  const fechar = () => {
    setModo('fechado');
    setBuscaExcecao('');
  };

  const salvarRegras = () => {
    if (regrasInvalidas) return;
    const fracao = percentual === Math.round(limites.assuntoFracaoMax * 100)
      ? limites.assuntoFracaoMax
      : percentual! / 100;
    gravar({
      ...settings,
      concentracao: {
        contarSequencia: draft.contarSequencia,
        assuntoRepeticoes: assuntoRepeticoes!,
        assuntoJanelaDias: assuntoJanela!,
        obraRepeticoes: repeticoes!,
        obraJanelaDias: janela!,
        assuntoFracaoMax: fracao,
        assuntoMinPautas: minimo!,
      },
      excecoesConcentracao: excecoesDraft,
    });
    setModo('fechado');
  };

  const salvarExcecao = () => {
    if (problemaExcecao != null) return;
    const limpa: ExcecaoConcentracao = { ...excecaoForm, nota: excecaoForm.nota.trim() };
    if (origemExcecao === 'regras') {
      setExcecoesDraft(atual => [...atual, limpa]);
      setModo('regras');
      return;
    }
    gravar({ ...settings, excecoesConcentracao: [...excecoesSalvas, limpa] });
    setModo('fechado');
  };

  const listaAlvos = excecaoForm.tipo === 'obra' ? obras : assuntos;
  const alvoEscolhido = listaAlvos.find(item => item.id === excecaoForm.alvoId) ?? null;
  const termoBusca = buscaExcecao.trim().toLocaleLowerCase('pt-BR');
  const encontrados = termoBusca
    ? listaAlvos.filter(item => item.nome.toLocaleLowerCase('pt-BR').includes(termoBusca)).slice(0, 8)
    : [];
  const emVigorDraft = excecoesEmVigor(excecoesDraft, hoje);

  const textoExcecoes = emVigor.length === 0
    ? 'nenhuma exceção'
    : emVigor.length === 1
      ? '1 exceção ativa'
      : `${emVigor.length} exceções ativas`;

  return (
    <div className="h-full">
      <Surface padding="lg" className="flex h-full flex-col justify-between gap-4">
        <div className="stack-xs">
          <Text variant="itemTitle" as="h3">Variedade e concentração</Text>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
            3 critérios · {textoExcecoes}
          </Text>
        </div>

        <div className="flex justify-end">
          <AppButton variant="secondary" size="sm" onClick={abrirRegras}>
            Editar
          </AppButton>
        </div>
      </Surface>

      <EditorialDrawer
        open={modo !== 'fechado'}
        title={modo === 'nova-excecao' ? 'Nova exceção de concentração' : 'Editar variedade e concentração'}
        subtitle={modo === 'nova-excecao'
          ? 'Cala o aviso da obra ou assunto apenas nas datas escolhidas.'
          : 'Ajuste os critérios de repetição e gerencie exceções em vigor.'}
        escopoConta="Geral"
        secao="Regras e avisos"
        onBack={modo === 'nova-excecao' && origemExcecao === 'regras' ? () => setModo('regras') : undefined}
        backLabel="Voltar para regras"
        dirty={dirty}
        onClose={fechar}
        onSave={modo === 'nova-excecao' ? salvarExcecao : salvarRegras}
        saveLabel={modo === 'nova-excecao' ? (origemExcecao === 'regras' ? 'Adicionar à lista' : 'Salvar exceção') : 'Salvar regras'}
        canSave={modo === 'nova-excecao' ? problemaExcecao == null : !regrasInvalidas}
        saveDisabledReason={modo === 'nova-excecao'
          ? (problemaExcecao ?? undefined)
          : (regrasInvalidas ? 'Confira os números destacados.' : undefined)}
        footerLeft={modo === 'regras' ? (
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => setDraft(draftDe(LIMITES_CONCENTRACAO_PADRAO))}
          >
            Voltar ao padrão
          </AppButton>
        ) : undefined}
      >
        {modo === 'regras' ? (
          <div className="stack-lg">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoStepper
                id="concentracao-repeticoes"
                label="Mesma obra"
                unidade="pautas ou mais"
                hint="Quantas pautas da mesma obra disparam o aviso."
                value={draft.repeticoes}
                onChange={valor => setDraft(atual => ({ ...atual, repeticoes: valor }))}
                erro={erros.repeticoes}
              />
              <CampoStepper
                id="concentracao-janela"
                label="Dentro de"
                unidade="dias"
                hint="A janela em dias corridos em que essas pautas são contadas."
                value={draft.janela}
                onChange={valor => setDraft(atual => ({ ...atual, janela: valor }))}
                erro={erros.janela}
              />
              <CampoStepper
                id="concentracao-percentual"
                label="Mesmo assunto"
                unidade="% das pautas"
                hint="Avisa quando um assunto passa desta fatia das pautas do intervalo."
                value={draft.percentual}
                onChange={valor => setDraft(atual => ({ ...atual, percentual: valor }))}
                erro={erros.percentual}
              />
              <CampoStepper
                id="concentracao-minimo"
                label="Com pelo menos"
                unidade="pautas no intervalo"
                hint="Mínimo de pautas para o aviso pela fração do assunto. Não altera a janela em dias."
                value={draft.minimo}
                onChange={valor => setDraft(atual => ({ ...atual, minimo: valor }))}
                erro={erros.minimo}
              />
              <CampoStepper
                id="concentracao-assunto-repeticoes"
                label="Mesmo assunto na janela"
                unidade="pautas ou mais"
                hint="Quantas pautas do mesmo assunto disparam o aviso em dias corridos."
                value={draft.assuntoRepeticoes}
                onChange={valor => setDraft(atual => ({ ...atual, assuntoRepeticoes: valor }))}
                erro={erros.assuntoRepeticoes}
              />
              <CampoStepper
                id="concentracao-assunto-janela"
                label="Janela do assunto"
                unidade="dias"
                hint="Independente da janela da obra e da fração do intervalo."
                value={draft.assuntoJanela}
                onChange={valor => setDraft(atual => ({ ...atual, assuntoJanela: valor }))}
                erro={erros.assuntoJanela}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
              <span className="inline-flex min-w-0 items-center">
                <label htmlFor="concentracao-sequencia">
                  <Text variant="bodyStrong" as="span">Contar sequência uma vez</Text>
                </label>
                <Ajuda
                  rotulo="Sobre contar sequência uma vez"
                  texto="Quando ligado, a sequência da mesma série ou wave e da mesma obra conta uma vez nas janelas de obra e assunto."
                />
              </span>
              <ToggleSwitch
                id="concentracao-sequencia"
                label="Contar sequência uma vez"
                enabled={draft.contarSequencia}
                onToggle={() => setDraft(atual => ({ ...atual, contarSequencia: !atual.contarSequencia }))}
              />
            </div>

            <div className="stack-sm border-t border-[var(--border-subtle)] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text variant="bodyStrong" as="h3">Exceções em vigor</Text>
                <AppButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => abrirNovaExcecao('regras')}
                >
                  Adicionar exceção
                </AppButton>
              </div>
              {emVigorDraft.length === 0 ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                  Nenhuma exceção em vigor.
                </Text>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3">
                  {emVigorDraft.map(excecao => (
                    <li key={excecao.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Text variant="body" as="p">
                          {excecao.tipo === 'obra' ? 'Obra' : 'Assunto'}: {nomeDoAlvo(excecao)}
                        </Text>
                        <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
                          {diaMes(excecao.inicio)} a {diaMes(excecao.fim)} · {nomeDaConta(excecao.platformId)}
                          {excecao.nota ? ` · ${excecao.nota}` : ''}
                        </Text>
                      </div>
                      <AppButton
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setExcecoesDraft(atual => atual.filter(item => item.id !== excecao.id))}
                      >
                        Remover
                      </AppButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : modo === 'nova-excecao' ? (
          <div className="stack-lg">
            <div className="stack-sm">
              <Text variant="bodyStrong" as="span">O que concentra de propósito</Text>
              <ChoiceChips<ExcecaoConcentracao['tipo']>
                label="Tipo da exceção"
                value={excecaoForm.tipo}
                onChange={tipo => {
                  if (!tipo) return;
                  setExcecaoForm(atual => ({ ...atual, tipo, alvoId: '' }));
                  setBuscaExcecao('');
                }}
                options={[
                  { value: 'obra', label: 'Uma obra', description: 'Várias pautas do mesmo livro, filme ou série' },
                  { value: 'assunto', label: 'Um assunto', description: 'Um assunto que se repete no intervalo' },
                ]}
              />
            </div>

            <div className="stack-xs">
              <label htmlFor="excecao-busca">
                <Text variant="bodyStrong" as="span">{excecaoForm.tipo === 'obra' ? 'Obra' : 'Assunto'}</Text>
              </label>
              {alvoEscolhido ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{alvoEscolhido.nome}</Badge>
                  <AppButton variant="ghost" size="sm" onClick={() => setExcecaoForm(atual => ({ ...atual, alvoId: '' }))}>
                    Trocar
                  </AppButton>
                </div>
              ) : (
                <>
                  <input
                    id="excecao-busca"
                    type="search"
                    autoComplete="off"
                    className={CAMPO}
                    placeholder={excecaoForm.tipo === 'obra' ? 'Buscar pelo título' : 'Buscar pelo nome'}
                    value={buscaExcecao}
                    onChange={event => setBuscaExcecao(event.target.value)}
                  />
                  {termoBusca && encontrados.length === 0 ? (
                    <Text variant="meta" className="text-[var(--text-secondary)]">Nada encontrado.</Text>
                  ) : null}
                  {encontrados.length > 0 ? (
                    <ul className="stack-xs">
                      {encontrados.map(item => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                            onClick={() => {
                              setExcecaoForm(atual => ({ ...atual, alvoId: item.id }));
                              setBuscaExcecao('');
                            }}
                          >
                            <Text variant="body" as="span">{item.nome}</Text>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="stack-xs" htmlFor="excecao-inicio">
                <Text variant="bodyStrong" as="span">De</Text>
                <input
                  id="excecao-inicio"
                  type="date"
                  className={`${CAMPO_BASE} min-h-11`}
                  value={excecaoForm.inicio}
                  onChange={event => setExcecaoForm(atual => ({ ...atual, inicio: event.target.value }))}
                />
              </label>
              <label className="stack-xs" htmlFor="excecao-fim">
                <Text variant="bodyStrong" as="span">Até</Text>
                <input
                  id="excecao-fim"
                  type="date"
                  className={`${CAMPO_BASE} min-h-11`}
                  min={excecaoForm.inicio}
                  value={excecaoForm.fim}
                  onChange={event => setExcecaoForm(atual => ({ ...atual, fim: event.target.value }))}
                />
              </label>
            </div>

            <div className="stack-xs">
              <Text variant="bodyStrong" as="span">Conta</Text>
              <SelectField
                ariaLabel="Conta da exceção"
                block
                value={excecaoForm.platformId ?? ''}
                onChange={platformId => setExcecaoForm(atual => ({ ...atual, platformId: platformId || null }))}
                options={[{ value: '', label: 'Todas as contas' }, ...contas.map(conta => ({ value: conta.id, label: conta.rotulo }))]}
              />
              <Text variant="meta" className="text-[var(--text-secondary)]">
                Exceção de uma conta só cala o aviso quando a análise é daquela conta.
              </Text>
            </div>

            <label className="stack-xs" htmlFor="excecao-nota">
              <Text variant="bodyStrong" as="span">Por quê</Text>
              <input
                id="excecao-nota"
                type="text"
                className={CAMPO}
                placeholder="Ex.: mês temático do lançamento"
                value={excecaoForm.nota}
                onChange={event => setExcecaoForm(atual => ({ ...atual, nota: event.target.value }))}
              />
            </label>
          </div>
        ) : null}
      </EditorialDrawer>
    </div>
  );
}
