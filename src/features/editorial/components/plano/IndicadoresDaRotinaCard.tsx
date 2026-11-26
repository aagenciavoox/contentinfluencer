import { useState } from 'react';
import { Gauge, Pencil } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import { atualizarIndicador } from '../../lib/editorialSettings';
import {
  INDICADORES_DE_PRODUCAO,
  rascunhoDaFaixa,
  textoDaFaixa,
  validarFaixa,
  type ErroDaFaixa,
  type IndicadorDeProducao,
  type IndicadoresProducao,
  type RascunhoDaFaixa,
} from '../../lib/indicadoresProducao';
import { CAMPO, CardConfiguracao } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

const CAMPOS: Array<{ id: keyof RascunhoDaFaixa; rotulo: string }> = [
  { id: 'minimo', rotulo: 'Mínimo' },
  { id: 'meta', rotulo: 'Meta' },
  { id: 'maximo', rotulo: 'Máximo' },
];

type RascunhosIndicadores = Record<IndicadorDeProducao, RascunhoDaFaixa>;
type ErrosIndicadores = Partial<Record<IndicadorDeProducao, ErroDaFaixa[]>>;

function criarRascunhos(indicadores: IndicadoresProducao | undefined): RascunhosIndicadores {
  return Object.fromEntries(
    INDICADORES_DE_PRODUCAO.map(({ id }) => [id, rascunhoDaFaixa(indicadores?.[id] ?? null)]),
  ) as RascunhosIndicadores;
}

/**
 * Indicadores opcionais da rotina. Só a meta é obrigatória quando a faixa é usada.
 * Mínimo e máximo viram referência de alerta na Saúde; entre eles, é progresso.
 * O teto de gravações por dia continua separado, na capacidade.
 */
export function IndicadoresDaRotinaCard({ embutido = false }: { embutido?: boolean } = {}) {
  const { settings, gravar } = useEditorialPlano();
  const [editando, setEditando] = useState(false);
  const [rascunhos, setRascunhos] = useState<RascunhosIndicadores>(() => criarRascunhos(settings.indicadoresProducao));
  const [erros, setErros] = useState<ErrosIndicadores>({});
  const [gravando, setGravando] = useState(false);

  const abrirEdicao = () => {
    setRascunhos(criarRascunhos(settings.indicadoresProducao));
    setErros({});
    setEditando(true);
  };

  const cancelarEdicao = () => {
    setRascunhos(criarRascunhos(settings.indicadoresProducao));
    setErros({});
    setEditando(false);
  };

  const salvarTodos = async () => {
    const novosErros: ErrosIndicadores = {};
    let temErro = false;
    let proximo = settings;
    let mudou = false;

    for (const { id } of INDICADORES_DE_PRODUCAO) {
      const { faixa, erros: lista } = validarFaixa(rascunhos[id]);
      if (lista.length > 0) {
        novosErros[id] = lista;
        temErro = true;
      } else {
        const atual = settings.indicadoresProducao?.[id] ?? null;
        if (JSON.stringify(faixa) !== JSON.stringify(atual)) {
          proximo = atualizarIndicador(proximo, id, faixa);
          mudou = true;
        }
      }
    }

    setErros(novosErros);
    if (temErro) return;

    if (mudou) {
      setGravando(true);
      try {
        await gravar(proximo);
      } finally {
        setGravando(false);
      }
    }
    setEditando(false);
  };

  return (
    <CardConfiguracao
      embutido={embutido}
      icone={<Gauge className="h-5 w-5" />}
      titulo="Ritmo de criação"
      descricao="Comece pela meta. Se quiser, acrescente um mínimo, um máximo ou os dois. O teto de gravações por dia fica em Gravação."
      acao={editando ? (
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton variant="secondary" size="sm" onClick={cancelarEdicao} disabled={gravando}>
            Cancelar
          </AppButton>
          <AppButton variant="primary" size="sm" onClick={() => void salvarTodos()} disabled={gravando}>
            {gravando ? 'Salvando…' : 'Salvar'}
          </AppButton>
        </div>
      ) : (
        <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={abrirEdicao}>
          Editar
        </AppButton>
      )}
    >
      {editando ? (
        <div className="stack-md">
          {INDICADORES_DE_PRODUCAO.map(item => {
            const rascunho = rascunhos[item.id];
            const errosItem = erros[item.id] ?? [];
            const erroDe = (campo: keyof RascunhoDaFaixa) => errosItem.find(e => e.campo === campo)?.mensagem;
            const temPreenchido = Boolean(
              rascunho.minimo.trim() || rascunho.meta.trim() || rascunho.maximo.trim(),
            );

            return (
              <div key={item.id} className="stack-sm border-t border-[var(--border-subtle)] pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center">
                    <Text variant="bodyStrong" as="h4">{item.titulo}</Text>
                    <Ajuda rotulo={`Sobre ${item.titulo}`} texto={item.ajuda} />
                  </div>
                  {temPreenchido ? (
                    <AppButton
                      variant="ghost"
                      size="sm"
                      disabled={gravando}
                      onClick={() => {
                        setRascunhos(atual => ({
                          ...atual,
                          [item.id]: { minimo: '', meta: '', maximo: '' },
                        }));
                        setErros(atual => ({ ...atual, [item.id]: [] }));
                      }}
                    >
                      Limpar
                    </AppButton>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CAMPOS.map(campo => {
                    const campoId = `indicador-${item.id}-${campo.id}`;
                    const erro = erroDe(campo.id);
                    return (
                      <label key={campo.id} htmlFor={campoId} className="flex flex-col gap-1">
                        <Text variant="meta" as="span">
                          {campo.rotulo}
                          {campo.id === 'meta' && temPreenchido
                            ? <span className="text-[var(--brand-accent-text)]"> *</span>
                            : null}
                        </Text>
                        <input
                          id={campoId}
                          type="text"
                          inputMode="numeric"
                          className={CAMPO}
                          value={rascunho[campo.id]}
                          aria-invalid={erro ? true : undefined}
                          aria-describedby={erro ? `${campoId}-erro` : undefined}
                          style={erro ? { borderColor: 'var(--danger)' } : undefined}
                          onChange={event => {
                            const valor = event.target.value.slice(0, 4);
                            setRascunhos(atual => ({
                              ...atual,
                              [item.id]: { ...atual[item.id], [campo.id]: valor },
                            }));
                            if (errosItem.length > 0) {
                              setErros(atual => ({ ...atual, [item.id]: [] }));
                            }
                          }}
                        />
                        {erro ? <Text id={`${campoId}-erro`} variant="meta" as="span" className="texto-erro">{erro}</Text> : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] divide-y divide-[var(--border-subtle)]">
          {INDICADORES_DE_PRODUCAO.map(item => {
            const gravada = settings.indicadoresProducao?.[item.id] ?? null;
            return (
              <div
                key={item.id}
                className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="inline-flex items-center">
                  <Text variant="bodyStrong" as="h4">{item.titulo}</Text>
                  <Ajuda rotulo={`Sobre ${item.titulo}`} texto={item.ajuda} />
                </div>
                {gravada ? (
                  <Badge variant="neutral" className="tabular-nums">
                    {textoDaFaixa(gravada)} {item.unidade}
                  </Badge>
                ) : (
                  <Text variant="meta" className="text-[var(--text-tertiary)]">
                    Não definido
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CardConfiguracao>
  );
}
