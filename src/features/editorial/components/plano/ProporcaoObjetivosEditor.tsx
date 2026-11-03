import { useState } from 'react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import type { FuncaoEditorial } from '../../../../lib/database';
import { FUNCAO_CURTA, FUNCOES } from '../../lib/funcoes';
import { proporcaoIgual, somaDaProporcao, type ProporcaoFuncoes } from '../../lib/proporcaoObjetivos';
import { cn } from '../../../../lib/utils';

type Rascunho = Record<FuncaoEditorial, string>;

const OBJETIVO_CONFIG: Record<FuncaoEditorial, { nome: string; etapa: string; cor: string }> = {
  atrair: { nome: 'Atrair alcance', etapa: 'Topo', cor: '#0284c7' },
  converter: { nome: 'Converter', etapa: 'Topo', cor: '#059669' },
  aprofundar: { nome: 'Aprofundar', etapa: 'Meio', cor: '#7c3aed' },
  comunidade: { nome: 'Comunidade', etapa: 'Meio', cor: '#d97706' },
  acao: { nome: 'Ação', etapa: 'Fundo', cor: '#db2777' },
  reter: { nome: 'Reter', etapa: 'Fidelização', cor: '#4f46e5' },
};

function rascunhoDe(proporcao: ProporcaoFuncoes | null): Rascunho {
  const rascunho = {} as Rascunho;
  for (const funcao of FUNCOES) {
    const valor = proporcao?.[funcao];
    rascunho[funcao] = valor == null ? '' : String(valor);
  }
  return rascunho;
}

function percentualDoTexto(texto: string): number | null {
  const limpo = texto.replace(/\D/g, '').slice(0, 3);
  if (!limpo) return null;
  return Math.min(100, Number.parseInt(limpo, 10));
}

function proporcaoDoRascunho(rascunho: Rascunho): ProporcaoFuncoes | null {
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

/** Exibição visual da proporção com barra segmentada e mini-cards por objetivo. */
export function ResumoDaProporcao({ proporcao }: { proporcao: ProporcaoFuncoes | null }) {
  if (!proporcao) {
    return <Text variant="secondary">Nenhuma proporção definida. As metas ficam em branco até você definir.</Text>;
  }
  const efetiva = proporcao;
  const soma = somaDaProporcao(efetiva);

  return (
    <div className="stack-md">
      {/* Barra de distribuição multi-segmento */}
      <div className="h-3 w-full rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] overflow-hidden flex border border-[var(--border-subtle)]">
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

      {/* Grid de objetivos com porcentagens e cores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {FUNCOES.map(funcao => {
          const cfg = OBJETIVO_CONFIG[funcao];
          const pct = efetiva[funcao] ?? 0;
          return (
            <div
              key={funcao}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.cor }} />
                <Text variant="meta" as="span" className="truncate text-[var(--text-secondary)]">
                  {FUNCAO_CURTA[funcao]}
                </Text>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <Text variant="sectionTitle" as="span" className="tabular-nums text-[var(--text-primary)]">
                  {pct}%
                </Text>
              </div>
              <div className="mt-2 h-1 w-full rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-[var(--radius-pill)]"
                  style={{ width: `${Math.min(100, pct)}%`, backgroundColor: cfg.cor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {soma !== 100 ? (
        <Text variant="meta" as="p" className="text-[var(--accent-orange)]">
          Pendência: a proporção salva soma {soma}%. Nada foi ajustado sozinho; as metas usam esse total até você editar e fechar em 100%.
        </Text>
      ) : null}
    </div>
  );
}

/**
 * Percentual por objetivo com barra em tempo real, cards individuais e soma ao vivo.
 */
export function ProporcaoObjetivosEditor({
  idBase,
  valor,
  onSalvar,
  onCancelar,
}: {
  idBase: string;
  valor: ProporcaoFuncoes | null;
  onSalvar: (proporcao: ProporcaoFuncoes | null) => void;
  onCancelar: () => void;
}) {
  const [rascunho, setRascunho] = useState<Rascunho>(() => rascunhoDe(valor));
  const proporcao = proporcaoDoRascunho(rascunho);
  const soma = somaDaProporcao(proporcao);
  const vazio = proporcao == null;
  const fecha = soma === 100;
  const podeSalvar = vazio || fecha;
  const somaId = `${idBase}-soma`;

  return (
    <div className="stack-md">
      {/* Barra de distribuição interativa multi-segmento */}
      <div className="h-3 w-full rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] overflow-hidden flex border border-[var(--border-subtle)]">
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

      {/* Grid de 6 cards editáveis de objetivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FUNCOES.map(funcao => {
          const cfg = OBJETIVO_CONFIG[funcao];
          const id = `${idBase}-${funcao}`;
          const val = percentualDoTexto(rascunho[funcao]) ?? 0;

          return (
            <div
              key={funcao}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5 flex flex-col justify-between transition-colors focus-within:border-[var(--border-strong)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.cor }} />
                  <label htmlFor={id} className="cursor-pointer min-w-0">
                    <Text variant="bodyStrong" as="span" className="truncate text-[var(--text-primary)]">
                      {FUNCAO_CURTA[funcao]}
                    </Text>
                  </label>
                </div>
                <span
                  className="px-2 py-0.5 rounded-[var(--radius-pill)]"
                  style={{ backgroundColor: `color-mix(in srgb, ${cfg.cor} 12%, transparent)` }}
                >
                  <Text variant="label" as="span" style={{ color: cfg.cor }} className="uppercase">
                    {cfg.etapa}
                  </Text>
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex-1 h-1.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                    style={{ width: `${Math.min(100, val)}%`, backgroundColor: cfg.cor }}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    id={id}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    aria-describedby={somaId}
                    value={rascunho[funcao]}
                    onChange={event => {
                      const valorDigitado = percentualDoTexto(event.target.value);
                      setRascunho(atual => ({ ...atual, [funcao]: valorDigitado == null ? '' : String(valorDigitado) }));
                    }}
                    className="input h-9 w-16 px-2 text-center tabular-nums"
                  />
                  <Text variant="body" as="span" className="text-[var(--text-secondary)]">%</Text>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar inferior com alinhamento e botões integrados */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <div id={somaId} role="status" aria-live="polite" className="flex items-center gap-2">
          <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Total:</Text>
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] border tabular-nums',
            fecha
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300'
              : vazio
                ? 'border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]'
                : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300'
          )}>
            <Text variant="label" as="span" className="text-current">
              {fecha ? '✓ ' : ''}{soma}% de 100%
            </Text>
          </span>
          {!fecha && !vazio ? (
            <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
              ({soma < 100 ? `faltam ${100 - soma}%` : `passou ${soma - 100}%`})
            </Text>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="ghost" size="sm" onClick={() => setRascunho(rascunhoDe(proporcaoIgual()))}>
            Distribuir igualmente
          </AppButton>
          <AppButton variant="secondary" size="sm" onClick={onCancelar}>
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            disabled={!podeSalvar}
            disabledReason={podeSalvar ? undefined : 'A soma precisa fechar em 100%.'}
            onClick={() => onSalvar(proporcao)}
          >
            Salvar proporção
          </AppButton>
        </div>
      </div>
    </div>
  );
}
