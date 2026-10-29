import { useState } from 'react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import type { FuncaoEditorial } from '../../../../lib/database';
import { FUNCAO_CURTA, FUNCOES } from '../../lib/funcoes';
import { proporcaoIgual, somaDaProporcao, type ProporcaoFuncoes } from '../../lib/proporcaoObjetivos';
import { CAMPO_BASE } from './campos';

type Rascunho = Record<FuncaoEditorial, string>;

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

/** Linha só de leitura: "Atrair 30% · Converter 20% …". */
export function ResumoDaProporcao({ proporcao }: { proporcao: ProporcaoFuncoes | null }) {
  const efetiva = proporcao ?? proporcaoIgual();
  const padraoInicial = !proporcao;
  const soma = somaDaProporcao(efetiva);
  return (
    <div className="stack-xs">
      {padraoInicial ? (
        <Text variant="secondary" as="p">Divisão igual (padrão inicial). Confirme ou mude para valer nas metas do período.</Text>
      ) : null}
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {FUNCOES.filter(funcao => efetiva[funcao] != null).map(funcao => (
          <li key={funcao}>
            <Text variant="body" as="span">{FUNCAO_CURTA[funcao]} </Text>
            <Text variant="bodyStrong" as="span" className="tabular-nums">{efetiva[funcao]}%</Text>
          </li>
        ))}
      </ul>
      {!padraoInicial && soma !== 100 ? (
        <Text variant="meta" as="p">A soma está em {soma}%. As metas são calculadas sobre esse total; para ficar exato, ajuste para 100%.</Text>
      ) : null}
    </div>
  );
}

/**
 * Percentual por objetivo, com a soma ao vivo. Só grava em "Salvar proporção":
 * vazio em todos apaga a proporção.
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FUNCOES.map(funcao => {
          const id = `${idBase}-${funcao}`;
          return (
            <div key={funcao} className="flex min-w-0 flex-col gap-1">
              <label htmlFor={id}>
                <Text variant="bodyStrong" as="span">{FUNCAO_CURTA[funcao]}</Text>
              </label>
              <span className="flex items-center gap-1.5">
                <input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="—"
                  aria-describedby={somaId}
                  value={rascunho[funcao]}
                  onChange={event => {
                    const valorDigitado = percentualDoTexto(event.target.value);
                    setRascunho(atual => ({ ...atual, [funcao]: valorDigitado == null ? '' : String(valorDigitado) }));
                  }}
                  className={`${CAMPO_BASE} min-h-9 w-20 py-1 text-center tabular-nums pointer-coarse:min-h-11`}
                />
                <Text variant="body" as="span" className="text-[var(--text-secondary)]" aria-hidden>%</Text>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={somaId} role="status" aria-live="polite" className="flex items-baseline gap-1.5">
          <Text variant="secondary" as="span">Soma</Text>
          <Text
            variant="bodyStrong"
            as="span"
            className={`tabular-nums ${fecha || vazio ? '' : 'text-[color-mix(in_srgb,var(--warning)_var(--tint-text-share),var(--text-primary))]'}`}
          >
            {soma}% de 100%
          </Text>
          {!fecha && !vazio ? (
            <Text variant="meta" as="span">{soma < 100 ? `faltam ${100 - soma}%` : `passou ${soma - 100}%`}</Text>
          ) : null}
        </p>
        <AppButton variant="secondary" size="sm" onClick={() => setRascunho(rascunhoDe(proporcaoIgual()))}>
          Distribuir igualmente
        </AppButton>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
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
  );
}
