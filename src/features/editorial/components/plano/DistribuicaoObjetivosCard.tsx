import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Undo2 } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import type { FuncaoEditorial } from '../../../../lib/database';
import { inteiroNaoNegativo } from '../../../../lib/inteiro';
import { cn, tintedTextColor } from '../../../../lib/utils';
import { ANCORA_PROPORCAO } from '../../lib/abasEditorial';
import { COR_DA_FUNCAO, FUNCAO_CURTA, FUNCAO_DESCRICOES, FUNCOES } from '../../lib/funcoes';
import { proporcaoIgual, somaDaProporcao, type ProporcaoFuncoes } from '../../lib/proporcaoObjetivos';
import {
  agendarVigencia,
  desfazerMudanca,
  diretrizNoDomingo,
  domingosParaVigencia,
  mudancasAgendadas,
  vigenciaNaSemana,
} from '../../lib/vigencias';
import { EditorialDrawer } from './EditorialDrawer';
import { proporcaoEmTexto } from './ProporcaoObjetivosEditor';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes, segundaCurta, ValeAPartirDe } from './ValeAPartirDe';

type RascunhoProporcao = Record<FuncaoEditorial, string>;

const OBJETIVO_CONFIG: Record<FuncaoEditorial, { nome: string; etapa: string; cor: string }> = {
  atrair: { nome: 'Atrair alcance', etapa: 'Topo', cor: COR_DA_FUNCAO.atrair },
  converter: { nome: 'Converter', etapa: 'Topo', cor: COR_DA_FUNCAO.converter },
  aprofundar: { nome: 'Aprofundar', etapa: 'Meio', cor: COR_DA_FUNCAO.aprofundar },
  comunidade: { nome: 'Comunidade', etapa: 'Meio', cor: COR_DA_FUNCAO.comunidade },
  acao: { nome: 'Ação', etapa: 'Fundo', cor: COR_DA_FUNCAO.acao },
  reter: { nome: 'Reter', etapa: 'Fidelização', cor: COR_DA_FUNCAO.reter },
};

function rascunhoDe(proporcao: ProporcaoFuncoes | null): RascunhoProporcao {
  const rascunho = {} as RascunhoProporcao;
  for (const funcao of FUNCOES) {
    const valor = proporcao?.[funcao];
    rascunho[funcao] = valor == null ? '' : String(valor);
  }
  return rascunho;
}

function percentualDoTexto(texto: string): number | null {
  const n = inteiroNaoNegativo(texto);
  if (n == null) return null;
  return Math.min(100, n);
}

function proporcaoDoRascunho(rascunho: RascunhoProporcao): ProporcaoFuncoes | null {
  const proporcao: ProporcaoFuncoes = {};
  let algum = false;
  for (const funcao of FUNCOES) {
    const valor = percentualDoTexto(rascunho[funcao]);
    if (valor == null) continue;
    proporcao[funcao] = valor;
    algum = true;
  }
  return algum ? proporcao : null;
}

function mesmoRascunho(a: RascunhoProporcao, b: RascunhoProporcao): boolean {
  return FUNCOES.every(funcao => a[funcao] === b[funcao]);
}

/**
 * Cartão de leitura da distribuição por objetivo com barra de cores, percentuais em linha e data de vigência.
 * Edição acontece no drawer lateral e só permite salvar quando o total fechar 100%.
 */
export function DistribuicaoObjetivosCard() {
  const { settings, gravar } = useEditorialPlano();
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const { estaSemana } = domingosParaVigencia(hoje);
  const vigenciaAtual = vigenciaNaSemana(settings.vigencias, estaSemana);
  const mudancas = mudancasAgendadas(settings, hoje).filter(item => item.proporcao);

  const inicial = useMemo(() => rascunhoDe(settings.proporcaoFuncoes), [settings.proporcaoFuncoes]);
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoProporcao>(inicial);
  const [desde, setDesde] = useState(estaSemana);

  const proporcao = proporcaoDoRascunho(rascunho);
  const soma = somaDaProporcao(proporcao);
  const fecha = soma === 100;
  const numeroInvalido = FUNCOES.some(funcao => {
    const texto = rascunho[funcao].trim();
    return texto !== '' && inteiroNaoNegativo(texto) == null;
  });
  const podeSalvar = !numeroInvalido && fecha;
  const dirty = aberto && (!mesmoRascunho(rascunho, inicial) || desde !== estaSemana);

  const abrir = () => {
    setRascunho(inicial);
    setDesde(estaSemana);
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setRascunho(inicial);
    setDesde(estaSemana);
  };

  const salvar = () => {
    if (!podeSalvar || !proporcao) return;
    gravar(agendarVigencia(settings, desde, {
      limiteSemanal: diretrizNoDomingo(settings, desde, hoje).limiteSemanal,
      proporcaoFuncoes: proporcao,
    }, hoje));
    setAberto(false);
  };

  const rotuloVigencia = !vigenciaAtual?.vigenteDesde || vigenciaAtual.vigenteDesde === estaSemana
    ? 'Vigente desde esta semana'
    : `Vigente desde ${segundaCurta(vigenciaAtual.vigenteDesde)}`;

  const efetiva = settings.proporcaoFuncoes;

  return (
    <div id={ANCORA_PROPORCAO} className="scroll-mt-28">
      <Surface padding="lg" className="stack-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Text variant="itemTitle" as="h3">Distribuição por objetivo</Text>
            {efetiva ? (
              <Badge variant="neutral" className="tabular-nums">
                {rotuloVigencia}
              </Badge>
            ) : null}
          </div>
          <AppButton variant="secondary" size="sm" onClick={abrir}>
            Editar
          </AppButton>
        </div>

        {!efetiva ? (
          <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">
            Nenhuma distribuição definida. As metas ficam em branco até você definir.
          </Text>
        ) : (
          <div className="stack-md">
            <div className="flex h-2.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--surface-subtle)]">
              {FUNCOES.map(funcao => {
                const pct = efetiva[funcao] ?? 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={funcao}
                    style={{ width: `${pct}%`, backgroundColor: OBJETIVO_CONFIG[funcao].cor }}
                    className="h-full transition-all duration-300"
                    title={`${OBJETIVO_CONFIG[funcao].nome}: ${pct}%`}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {FUNCOES.map(funcao => {
                const cfg = OBJETIVO_CONFIG[funcao];
                const pct = efetiva[funcao] ?? 0;
                return (
                  <div key={funcao} className="flex items-center justify-between gap-3 min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cfg.cor }}
                        aria-hidden
                      />
                      <Text
                        variant="secondary"
                        as="span"
                        className={cn(
                          'truncate',
                          pct === 0 ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]',
                        )}
                      >
                        {FUNCAO_CURTA[funcao]}
                      </Text>
                    </span>
                    <Text
                      variant="bodyStrong"
                      as="span"
                      className={cn(
                        'shrink-0 tabular-nums',
                        pct === 0 ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]',
                      )}
                    >
                      {pct}%
                    </Text>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mudancas.map(mudanca => (
          <div
            key={mudanca.vigenteDesde}
            className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2"
          >
            <Text variant="meta" as="p" className="min-w-[12rem] flex-1 text-[var(--text-primary)]">
              A partir de seg., {diaMes(mudanca.vigenteDesde)}: {mudanca.proporcao!.para ? proporcaoEmTexto(mudanca.proporcao!.para) : 'sem proporção definida'}.
            </Text>
            <AppButton
              variant="ghost"
              size="sm"
              leftIcon={<Undo2 className="h-4 w-4" />}
              onClick={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'proporcao', hoje))}
            >
              Desfazer
            </AppButton>
          </div>
        ))}
      </Surface>

      <EditorialDrawer
        open={aberto}
        title="Editar distribuição por objetivo"
        subtitle="O total dos seis objetivos precisa fechar exatamente em 100%."
        escopoConta="Geral"
        secao="Planejamento"
        dirty={dirty}
        onClose={fechar}
        onSave={salvar}
        canSave={podeSalvar}
        saveDisabledReason={numeroInvalido ? 'Use apenas números inteiros.' : 'O total precisa fechar em 100%.'}
        saveLabel="Salvar distribuição"
        footerLeft={(
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => setRascunho(rascunhoDe(proporcaoIgual()))}
          >
            Distribuir igualmente
          </AppButton>
        )}
      >
        <div className="stack-lg">
          <div className="stack-sm">
            <div className="flex h-3 w-full overflow-hidden rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
              {FUNCOES.map(funcao => {
                const pct = percentualDoTexto(rascunho[funcao]) ?? 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={funcao}
                    style={{ width: `${pct}%`, backgroundColor: OBJETIVO_CONFIG[funcao].cor }}
                    className="h-full transition-all duration-300"
                    title={`${OBJETIVO_CONFIG[funcao].nome}: ${pct}%`}
                  />
                );
              })}
            </div>

            <div id="proporcao-drawer-soma" role="status" aria-live="polite" className="flex flex-wrap items-center gap-2">
              <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Total:</Text>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 tabular-nums',
                  fecha
                    ? 'border-[color-mix(in_srgb,var(--success)_40%,var(--border-color))] bg-[color-mix(in_srgb,var(--success)_14%,transparent)]'
                    : 'border-[color-mix(in_srgb,var(--warning)_40%,var(--border-color))] bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]',
                )}
                style={{ color: tintedTextColor(fecha ? 'var(--success)' : 'var(--warning)') }}
              >
                <Text variant="label" as="span" className="text-current">
                  {fecha ? '✓ ' : ''}{soma}% de 100%
                </Text>
              </span>
              {!fecha ? (
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                  {soma < 100 ? `Faltam ${100 - soma}% para fechar 100%.` : `Passou ${soma - 100}%. Ajuste os percentuais.`}
                </Text>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FUNCOES.map(funcao => {
              const cfg = OBJETIVO_CONFIG[funcao];
              const id = `proporcao-drawer-${funcao}`;
              const texto = rascunho[funcao];
              const invalido = texto.trim() !== '' && inteiroNaoNegativo(texto) == null;
              const val = percentualDoTexto(texto) ?? 0;

              return (
                <div
                  key={funcao}
                  className="flex flex-col justify-between rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5 transition-colors focus-within:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cfg.cor }} aria-hidden />
                      <label htmlFor={id} className="min-w-0 cursor-pointer">
                        <span className="inline-flex min-w-0 items-center">
                          <Text variant="bodyStrong" as="span" className="truncate text-[var(--text-primary)]">
                            {FUNCAO_CURTA[funcao]}
                          </Text>
                          <Ajuda rotulo={`Sobre ${FUNCAO_CURTA[funcao]}`} texto={FUNCAO_DESCRICOES[funcao]} />
                        </span>
                      </label>
                    </div>
                    <span
                      className="shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5"
                      style={{ backgroundColor: `color-mix(in srgb, ${cfg.cor} 12%, transparent)` }}
                    >
                      <Text variant="label" as="span" style={{ color: tintedTextColor(cfg.cor) }} className="uppercase">
                        {cfg.etapa}
                      </Text>
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--surface-subtle)]">
                      <div
                        className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                        style={{ width: `${Math.min(100, val)}%`, backgroundColor: cfg.cor }}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <input
                        id={id}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0"
                        aria-describedby="proporcao-drawer-soma"
                        aria-invalid={invalido || undefined}
                        value={texto}
                        onChange={event => {
                          setRascunho(atual => ({ ...atual, [funcao]: event.target.value.slice(0, 4) }));
                        }}
                        className="input h-9 w-16 px-2 text-center tabular-nums"
                      />
                      <Text variant="body" as="span" className="text-[var(--text-secondary)]">%</Text>
                    </div>
                  </div>
                  {invalido ? (
                    <Text variant="meta" as="p" className="mt-1 text-[var(--accent-red)]">
                      Use um número inteiro.
                    </Text>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <ValeAPartirDe
              id="proporcao-drawer-desde"
              valor={desde}
              onChange={setDesde}
              hoje={hoje}
              aparencia="cartoes"
            />
          </div>
        </div>
      </EditorialDrawer>
    </div>
  );
}
