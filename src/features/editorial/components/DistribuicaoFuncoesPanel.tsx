import { useEffect, useMemo, useState } from 'react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { FuncaoEditorial, Pilar, Serie } from '../../../lib/database';
import type { EditorialSettings } from '../lib/editorialSettings';
import {
  distribuirEspacos,
  percentuaisFechamEm100,
  rotuloEspacos,
  semanasDaContagem,
  somaEspacosSemana,
  totalDaContagem,
} from '../lib/distribuirEspacos';
import {
  FUNCAO_DESCRICOES,
  FUNCAO_LABELS,
  FUNCOES,
  FUNIL_DA_FUNCAO,
  rotuloEtapaDaFuncao,
} from '../lib/funcoes';

type PercentDraft = Record<FuncaoEditorial, string>;
type EtapaId = 'topo' | 'meio' | 'fundo' | 'fora';

const AGRUPAMENTOS: Array<{ id: EtapaId; titulo: string }> = [
  { id: 'topo', titulo: 'Topo' },
  { id: 'meio', titulo: 'Meio' },
  { id: 'fundo', titulo: 'Fundo' },
  { id: 'fora', titulo: 'Fora do funil' },
];

const percentInputClass =
  'mt-1.5 min-h-11 w-full max-w-[8rem] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

function draftVazio(): PercentDraft {
  return {
    atrair: '',
    converter: '',
    aprofundar: '',
    comunidade: '',
    acao: '',
    reter: '',
  };
}

function draftDaDistribuicao(value: EditorialSettings['distribuicaoFuncoes']): PercentDraft {
  const draft = draftVazio();
  if (!value) return draft;
  for (const funcao of FUNCOES) draft[funcao] = String(value[funcao]);
  return draft;
}

function lerPercentual(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return Math.min(100, parsed);
}

function funcoesDaEtapa(etapa: EtapaId): FuncaoEditorial[] {
  return FUNCOES.filter(funcao => (FUNIL_DA_FUNCAO[funcao] ?? 'fora') === etapa);
}

export function DistribuicaoFuncoesPanel({
  pilares,
  series,
  settings,
  onOpenSerie,
  onChange,
}: {
  pilares: Pilar[];
  series: Serie[];
  settings: EditorialSettings;
  onOpenSerie: (serieId: string) => void;
  onChange: (distribuicaoFuncoes: Record<FuncaoEditorial, number>) => void;
}) {
  const salva = JSON.stringify(settings.distribuicaoFuncoes);
  const [draft, setDraft] = useState<PercentDraft>(() => draftDaDistribuicao(settings.distribuicaoFuncoes));

  useEffect(() => {
    const parsed = salva === 'null'
      ? null
      : JSON.parse(salva) as EditorialSettings['distribuicaoFuncoes'];
    setDraft(draftDaDistribuicao(parsed));
  }, [salva]);

  const totalSemana = somaEspacosSemana(pilares);
  const semanas = semanasDaContagem(totalSemana);
  const totalContagem = totalDaContagem(totalSemana);
  const numeros = useMemo(
    () => FUNCOES.map(funcao => lerPercentual(draft[funcao])),
    [draft],
  );
  const soma = numeros.reduce((acc, valor) => acc + valor, 0);
  const fecha = percentuaisFechamEm100(numeros);
  const previa = fecha && totalContagem > 0 ? distribuirEspacos(totalContagem, numeros) : null;
  const semFuncao = series.filter(serie => !serie.funcaoPadrao);
  const variam = series.filter(serie => serie.funcaoPadrao === 'varia');

  const salvar = () => {
    if (!fecha) return;
    const distribuicaoFuncoes = Object.fromEntries(
      FUNCOES.map((funcao, index) => [funcao, numeros[index]]),
    ) as Record<FuncaoEditorial, number>;
    onChange(distribuicaoFuncoes);
  };

  const atualizar = (funcao: FuncaoEditorial, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3);
    const next = digits === '' ? '' : String(Math.min(100, Number.parseInt(digits, 10)));
    setDraft(previous => ({ ...previous, [funcao]: next }));
  };

  return (
    <div className="stack-xl">
      <Surface>
        <Text variant="sectionTitle">Distribuição por função</Text>
        <Text variant="secondary" className="mt-1">
          Percentuais sobre os espaços da semana. A soma fecha em 100. O funil agrupa as funções e não guarda uma meta própria.
        </Text>
        <Text variant="body" className="mt-3">
          Pilares ativos: {rotuloEspacos(totalSemana)} por semana.
        </Text>
        {totalSemana > 0 && totalSemana < 8 ? (
          <Text variant="secondary" className="mt-1">
            Abaixo de 8 espaços por semana, a prévia e a contagem usam {semanas} semanas ({rotuloEspacos(totalContagem)}).
          </Text>
        ) : totalSemana >= 8 ? (
          <Text variant="secondary" className="mt-1">
            A prévia e a contagem usam esta semana ({rotuloEspacos(totalContagem)}).
          </Text>
        ) : (
          <Text variant="secondary" className="mt-1">
            A prévia em espaços aparece quando algum pilar ativo tiver espaços por semana.
          </Text>
        )}
        <Text variant="meta" className="mt-2 text-[var(--text-tertiary)]">
          Exemplo: 14 espaços e 35/30/20/15 viram 5, 4, 3 e 2.
        </Text>
      </Surface>

      {AGRUPAMENTOS.map(grupo => {
        const funcoes = funcoesDaEtapa(grupo.id);
        const pct = funcoes.reduce((acc, funcao) => acc + numeros[FUNCOES.indexOf(funcao)], 0);
        const spaces = previa
          ? funcoes.reduce((acc, funcao) => acc + previa[FUNCOES.indexOf(funcao)], 0)
          : null;
        return (
          <section key={grupo.id} aria-label={grupo.titulo} className="stack-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Text variant="sectionTitle">{grupo.titulo}</Text>
                <Text variant="meta" className="mt-1 text-[var(--text-tertiary)]">
                  Agrupamento calculado a partir das funções.
                </Text>
              </div>
              <Badge>{spaces == null ? `${pct}%` : `${pct}% · ${rotuloEspacos(spaces)}`}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {funcoes.map(funcao => {
                const indice = FUNCOES.indexOf(funcao);
                const seriesDaFuncao = series.filter(serie => serie.funcaoPadrao === funcao);
                return (
                  <Surface key={funcao}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Text variant="bodyStrong">{FUNCAO_LABELS[funcao]}</Text>
                        <Text variant="secondary" className="mt-1">{FUNCAO_DESCRICOES[funcao]}</Text>
                      </div>
                      <Badge>{rotuloEtapaDaFuncao(funcao)}</Badge>
                    </div>
                    <label className="mt-4 block" htmlFor={`distribuicao-${funcao}`}>
                      <Text variant="label" className="block">Percentual</Text>
                      <input
                        id={`distribuicao-${funcao}`}
                        inputMode="numeric"
                        value={draft[funcao]}
                        placeholder="0"
                        onChange={event => atualizar(funcao, event.target.value)}
                        className={percentInputClass}
                      />
                    </label>
                    <Text variant="meta" className="mt-1 text-[var(--text-tertiary)]">
                      {previa ? `Prévia: ${rotuloEspacos(previa[indice])}` : 'Prévia: —'}
                    </Text>
                    <Text variant="label" className="mt-4 block">Séries com esta função</Text>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {seriesDaFuncao.length > 0
                        ? seriesDaFuncao.map(serie => (
                          <AppButton
                            key={serie.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenSerie(serie.id)}
                          >
                            {serie.name}
                          </AppButton>
                        ))
                        : <Text variant="meta">Nenhuma série.</Text>}
                    </div>
                  </Surface>
                );
              })}
            </div>
          </section>
        );
      })}

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text variant="bodyStrong">Soma: {soma}%</Text>
            <Text variant="secondary" className="mt-1">
              {fecha
                ? 'A soma fecha em 100.'
                : `A soma está em ${soma}. Ela fecha em 100 para virar a prévia em espaços.`}
            </Text>
          </div>
          <AppButton
            variant="primary"
            onClick={salvar}
            disabled={!fecha}
            disabledReason={fecha ? undefined : 'A soma fecha em 100 para salvar.'}
          >
            Salvar distribuição
          </AppButton>
        </div>
      </Surface>

      <div className="grid gap-3 lg:grid-cols-2">
        <Surface>
          <Text variant="sectionTitle">Ainda sem função</Text>
          <Text variant="secondary" className="mt-1">
            Séries que ainda não têm uma função padrão.
          </Text>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {semFuncao.length > 0
              ? semFuncao.map(serie => (
                <AppButton key={serie.id} variant="ghost" size="sm" onClick={() => onOpenSerie(serie.id)}>
                  {serie.name}
                </AppButton>
              ))
              : <Text variant="meta">Nenhuma série.</Text>}
          </div>
        </Surface>
        <Surface>
          <Text variant="sectionTitle">Varia por conteúdo</Text>
          <Text variant="secondary" className="mt-1">
            Cada roteiro desta série escolhe a própria função.
          </Text>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {variam.length > 0
              ? variam.map(serie => (
                <AppButton key={serie.id} variant="ghost" size="sm" onClick={() => onOpenSerie(serie.id)}>
                  {serie.name}
                </AppButton>
              ))
              : <Text variant="meta">Nenhuma série.</Text>}
          </div>
        </Surface>
      </div>
    </div>
  );
}
