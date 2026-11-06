import { useState } from 'react';
import { endOfMonth, format, parseISO } from 'date-fns';
import { Pencil, Plus, Shuffle, Trash2 } from 'lucide-react';
import { SidePanel } from '../../../../components/layout/SidePanel';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { ChoiceChips } from '../../../../components/ui/ChoiceChips';
import { SelectField } from '../../../../components/ui/SelectField';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { Text } from '../../../../components/ui/Text';
import { generateUUID } from '../../../../utils/uuid';
import { rotuloConta } from '../../../contas/lib/contas';
import {
  excecoesEmVigor,
  FAIXAS_CONCENTRACAO,
  LIMITES_CONCENTRACAO_PADRAO,
  limitesPadrao,
  problemaDaExcecao,
  rotuloFracao,
  type ExcecaoConcentracao,
  type LimitesConcentracao,
} from '../../lib/concentracao';
import { CAMPO, CAMPO_BASE, CampoStepper, CardConfiguracao, inteiroOuNull } from './campos';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes } from './ValeAPartirDe';

type LimitesDraft = { repeticoes: string; janela: string; percentual: string; minimo: string; assuntoRepeticoes: string; assuntoJanela: string };

function draftDe(limites: LimitesConcentracao): LimitesDraft {
  return {
    repeticoes: String(limites.obraRepeticoes),
    janela: String(limites.obraJanelaDias),
    percentual: String(Math.round(limites.assuntoFracaoMax * 100)),
    minimo: String(limites.assuntoMinPautas),
    assuntoRepeticoes: String(limites.assuntoRepeticoes),
    assuntoJanela: String(limites.assuntoJanelaDias),
  };
}

function foraDaFaixa(valor: number | null, faixa: { min: number; max: number }): string | undefined {
  if (valor == null) return 'Preencha um número.';
  if (valor < faixa.min || valor > faixa.max) return `Entre ${faixa.min} e ${faixa.max}.`;
  return undefined;
}

type Alvo = { id: string; nome: string };

/** Nova exceção: obra ou assunto, datas, conta (ou todas) e nota. A busca evita uma lista com a biblioteca inteira. */
function EditorDaExcecao({
  obras,
  assuntos,
  contas,
  hoje,
  onSalvar,
  onCancelar,
}: {
  obras: readonly Alvo[];
  assuntos: readonly Alvo[];
  contas: readonly { id: string; rotulo: string }[];
  hoje: string;
  onSalvar: (excecao: ExcecaoConcentracao) => void;
  onCancelar: () => void;
}) {
  const [rascunho, setRascunho] = useState<ExcecaoConcentracao>(() => ({
    id: generateUUID(),
    tipo: 'obra',
    alvoId: '',
    platformId: null,
    inicio: hoje,
    fim: format(endOfMonth(parseISO(hoje)), 'yyyy-MM-dd'),
    nota: '',
  }));
  const [busca, setBusca] = useState('');
  const mudar = (patch: Partial<ExcecaoConcentracao>) => setRascunho(atual => ({ ...atual, ...patch }));
  const lista = rascunho.tipo === 'obra' ? obras : assuntos;
  const escolhido = lista.find(item => item.id === rascunho.alvoId) ?? null;
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const encontrados = termo
    ? lista.filter(item => item.nome.toLocaleLowerCase('pt-BR').includes(termo)).slice(0, 8)
    : [];
  const problema = problemaDaExcecao(rascunho);

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <Text variant="bodyStrong" as="span">O que concentra de propósito</Text>
        <ChoiceChips<ExcecaoConcentracao['tipo']>
          label="Tipo da exceção"
          value={rascunho.tipo}
          onChange={tipo => {
            if (!tipo) return;
            mudar({ tipo, alvoId: '' });
            setBusca('');
          }}
          options={[
            { value: 'obra', label: 'Uma obra', description: 'Várias pautas do mesmo livro, filme ou série' },
            { value: 'assunto', label: 'Um assunto', description: 'Um assunto que se repete no intervalo' },
          ]}
        />
      </div>

      <div className="stack-xs">
        <label htmlFor="excecao-busca">
          <Text variant="bodyStrong" as="span">{rascunho.tipo === 'obra' ? 'Obra' : 'Assunto'}</Text>
        </label>
        {escolhido ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{escolhido.nome}</Badge>
            <AppButton variant="ghost" size="sm" onClick={() => mudar({ alvoId: '' })}>Trocar</AppButton>
          </div>
        ) : (
          <>
            <input
              id="excecao-busca"
              type="search"
              autoComplete="off"
              className={CAMPO}
              placeholder={rascunho.tipo === 'obra' ? 'Buscar pelo título' : 'Buscar pelo nome'}
              value={busca}
              onChange={event => setBusca(event.target.value)}
            />
            {termo && encontrados.length === 0 ? (
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
                        mudar({ alvoId: item.id });
                        setBusca('');
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
          <input id="excecao-inicio" type="date" className={`${CAMPO_BASE} min-h-11`} value={rascunho.inicio} onChange={event => mudar({ inicio: event.target.value })} />
        </label>
        <label className="stack-xs" htmlFor="excecao-fim">
          <Text variant="bodyStrong" as="span">Até</Text>
          <input id="excecao-fim" type="date" className={`${CAMPO_BASE} min-h-11`} min={rascunho.inicio} value={rascunho.fim} onChange={event => mudar({ fim: event.target.value })} />
        </label>
      </div>

      <div className="stack-xs">
        <Text variant="bodyStrong" as="span">Conta</Text>
        <SelectField
          ariaLabel="Conta da exceção"
          block
          value={rascunho.platformId ?? ''}
          onChange={platformId => mudar({ platformId: platformId || null })}
          options={[{ value: '', label: 'Todas as contas' }, ...contas.map(conta => ({ value: conta.id, label: conta.rotulo }))]}
        />
        <Text variant="meta" className="text-[var(--text-secondary)]">Exceção de uma conta só cala o aviso quando a análise é daquela conta.</Text>
      </div>

      <label className="stack-xs" htmlFor="excecao-nota">
        <Text variant="bodyStrong" as="span">Por quê</Text>
        <input
          id="excecao-nota"
          type="text"
          className={CAMPO}
          placeholder="Ex.: mês temático do lançamento"
          value={rascunho.nota}
          onChange={event => mudar({ nota: event.target.value })}
        />
      </label>

      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
        <AppButton variant="secondary" size="sm" onClick={onCancelar}>Cancelar</AppButton>
        <AppButton
          variant="primary"
          size="sm"
          disabled={problema != null}
          disabledReason={problema ?? undefined}
          onClick={() => onSalvar({ ...rascunho, nota: rascunho.nota.trim() })}
        >
          Salvar
        </AppButton>
      </div>
    </div>
  );
}

/**
 * Variedade e concentração (Ritmo & Regras). Os limites só avisam no Planejamento, não bloqueiam.
 * Exceção intencional cala o aviso daquela obra ou assunto só nas datas dela.
 */
export function VariedadeConcentracaoCard() {
  const { state, settings, gravar } = useEditorialPlano();
  const limites = settings.concentracao ?? LIMITES_CONCENTRACAO_PADRAO;
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<LimitesDraft>(() => draftDe(limites));
  const [novaExcecao, setNovaExcecao] = useState(false);
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const excecoes = settings.excecoesConcentracao ?? [];
  const emVigor = excecoesEmVigor(excecoes, hoje);

  const obras: Alvo[] = state.bibliotecaItems
    .map(item => ({ id: item.id, nome: item.titulo?.trim() || 'Obra sem título' }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const assuntos: Alvo[] = state.temas
    .map(tema => ({ id: tema.id, nome: tema.nome.trim() || 'Assunto sem nome' }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const contas = state.platforms.filter(conta => conta.ativo).map(conta => ({ id: conta.id, rotulo: rotuloConta(conta) }));
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
  const invalido = Object.values(erros).some(Boolean);

  const salvarLimites = () => {
    if (invalido) return;
    // O mesmo percentual de antes guarda a fração de antes (1/3 aparece como 33%, mas continua 1/3).
    const fracao = percentual === Math.round(limites.assuntoFracaoMax * 100) ? limites.assuntoFracaoMax : percentual! / 100;
    gravar({
      ...settings,
      concentracao: { contarSequencia: limites.contarSequencia, assuntoRepeticoes: assuntoRepeticoes!, assuntoJanelaDias: assuntoJanela!, obraRepeticoes: repeticoes!, obraJanelaDias: janela!, assuntoFracaoMax: fracao, assuntoMinPautas: minimo! },
    });
    setEditando(false);
  };

  return (
    <CardConfiguracao
      icone={<Shuffle className="h-5 w-5" />}
      titulo="Variedade e concentração"
      descricao="Quando o Planejamento avisa que uma obra ou um assunto está se repetindo. Só avisa, não bloqueia. Quadro em dias seguidos fica no acompanhamento de cada série, desligado por padrão."
      acao={editando ? undefined : (
        <AppButton
          variant="secondary"
          size="sm"
          leftIcon={<Pencil className="h-4 w-4" />}
          onClick={() => {
            setDraft(draftDe(limites));
            setEditando(true);
          }}
        >
          Editar limites
        </AppButton>
      )}
    >
      <div className="stack-lg">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="concentracao-sequencia" className="stack-xs">
            <Text variant="bodyStrong" as="span">Contar sequência uma vez</Text>
            <Text variant="secondary" as="span">Quando ligado, a sequência da mesma série ou wave e da mesma obra conta uma vez nas janelas de obra e assunto.</Text>
          </label>
          <ToggleSwitch
            id="concentracao-sequencia"
            label="Contar sequência uma vez"
            enabled={limites.contarSequencia}
            onToggle={() => gravar({...settings, concentracao: {...limites, contarSequencia: !limites.contarSequencia}})}
          />
        </div>
        {editando ? (
          <div className="stack-md">
            <div className="grid gap-6 md:grid-cols-2">
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
                onChange={valor => setDraft(atual => ({...atual, assuntoRepeticoes: valor}))}
                erro={erros.assuntoRepeticoes}
              />
              <CampoStepper
                id="concentracao-assunto-janela"
                label="Janela do assunto"
                unidade="dias"
                hint="Independente da janela da obra e da fração do intervalo."
                value={draft.assuntoJanela}
                onChange={valor => setDraft(atual => ({...atual, assuntoJanela: valor}))}
                erro={erros.assuntoJanela}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
              <AppButton variant="ghost" size="sm" onClick={() => setDraft(draftDe(LIMITES_CONCENTRACAO_PADRAO))}>
                Voltar ao padrão
              </AppButton>
              <div className="flex flex-wrap gap-2">
                <AppButton variant="secondary" size="sm" onClick={() => setEditando(false)}>Cancelar</AppButton>
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={salvarLimites}
                  disabled={invalido}
                  disabledReason={invalido ? 'Confira os números destacados.' : undefined}
                >
                  Salvar
                </AppButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="stack-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="body" as="p">
                Mesma obra: aviso com {limites.obraRepeticoes} pautas ou mais em {limites.obraJanelaDias} dias.
              </Text>
            </div>
            <Text variant="body" as="p">
              Mesmo assunto: aviso acima de {rotuloFracao(limites.assuntoFracaoMax)} das pautas do intervalo, com pelo menos {limites.assuntoMinPautas} pautas.
            </Text>
            <Text variant="body" as="p">
              Mesmo assunto: aviso com {limites.assuntoRepeticoes} pautas ou mais em {limites.assuntoJanelaDias} dias, mesmo com menos de {limites.assuntoMinPautas} pautas no intervalo.
            </Text>
            <div>
              <Badge variant="neutral">{limitesPadrao(limites) ? 'Limites padrão' : 'Limites seus'}</Badge>
            </div>
          </div>
        )}

        <div className="stack-sm border-t border-[var(--border-subtle)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <Text variant="bodyStrong" as="h3">Exceções</Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Concentração de propósito: cala o aviso daquela obra ou assunto só nas datas dela. Os outros avisos continuam.
              </Text>
            </div>
            <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNovaExcecao(true)}>
              Adicionar exceção
            </AppButton>
          </div>
          {emVigor.length === 0 ? (
            <Text variant="secondary" as="p">Nenhuma exceção em vigor.</Text>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {emVigor.map(excecao => (
                <li key={excecao.id} className="flex items-start justify-between gap-3 py-2">
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
                    onClick={() => gravar({ ...settings, excecoesConcentracao: excecoes.filter(item => item.id !== excecao.id) })}
                  >
                    Remover
                  </AppButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <SidePanel
        open={novaExcecao}
        onClose={() => setNovaExcecao(false)}
        title="Nova exceção"
        subtitle="Vale só nas datas escolhidas e vence sozinha no fim."
        widthClassName="max-w-2xl"
      >
        {novaExcecao ? (
          <EditorDaExcecao
            obras={obras}
            assuntos={assuntos}
            contas={contas}
            hoje={hoje}
            onCancelar={() => setNovaExcecao(false)}
            onSalvar={excecao => {
              gravar({ ...settings, excecoesConcentracao: [...excecoes, excecao] });
              setNovaExcecao(false);
            }}
          />
        ) : null}
      </SidePanel>
    </CardConfiguracao>
  );
}
