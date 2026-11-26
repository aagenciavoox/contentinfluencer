import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { SelectField } from '../../../../components/ui/SelectField';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { ANCORA_AVISOS } from '../../lib/abasEditorial';
import {
  avisoLigado,
  GRUPOS_DE_AVISOS,
  limiteSaturacaoQuadro,
} from '../../lib/avisosEditoriais';
import { atualizarAviso, atualizarLimiteSaturacao, type EditorialSettings } from '../../lib/editorialSettings';
import { EditorialDrawer } from './EditorialDrawer';
import { useEditorialPlano } from './useEditorialPlano';

interface AvisosEditorialPanelProps {
  onAbrirCapacidade?: () => void;
  embutido?: boolean;
}

/**
 * Resumo compacto dos avisos na página principal (sem os 19 switches).
 * "Configurar" abre o drawer com os 3 grupos expansíveis, switches e limites relacionados.
 */
export function AvisosEditorialPanel({ onAbrirCapacidade: _onAbrirCapacidade, embutido: _embutido = false }: AvisosEditorialPanelProps = {}) {
  const { settings, gravar } = useEditorialPlano();
  const [aberto, setAberto] = useState(false);
  const [rascunhoAvisos, setRascunhoAvisos] = useState<EditorialSettings['avisos']>(settings.avisos);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(GRUPOS_DE_AVISOS.map((grupo, idx) => [grupo.id, idx === 0]))
  ));
  const [gruposCompletos, setGruposCompletos] = useState<Record<string, boolean>>({});

  const LIMITE_INICIAL_GRUPO = 5;

  const todosAvisos = GRUPOS_DE_AVISOS.flatMap(grupo => grupo.avisos);
  const totalAvisos = todosAvisos.length;
  const avisosAtivos = todosAvisos.filter(aviso => avisoLigado(settings.avisos, aviso.tipo)).length;

  const dirty = aberto && JSON.stringify(rascunhoAvisos ?? {}) !== JSON.stringify(settings.avisos ?? {});

  const abrir = () => {
    setRascunhoAvisos(settings.avisos ? { ...settings.avisos } : {});
    setGruposAbertos(Object.fromEntries(GRUPOS_DE_AVISOS.map((grupo, idx) => [grupo.id, idx === 0])));
    setGruposCompletos({});
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setRascunhoAvisos(settings.avisos);
  };

  const salvar = () => {
    let proximo = settings;
    for (const aviso of todosAvisos) {
      const novoEstado = avisoLigado(rascunhoAvisos, aviso.tipo);
      if (novoEstado !== avisoLigado(settings.avisos, aviso.tipo)) {
        proximo = atualizarAviso(proximo, aviso.tipo, novoEstado);
      }
    }
    const novoLimiteQuadro = limiteSaturacaoQuadro(rascunhoAvisos);
    if (novoLimiteQuadro !== limiteSaturacaoQuadro(settings.avisos)) {
      proximo = atualizarLimiteSaturacao(proximo, novoLimiteQuadro);
    }
    if (proximo !== settings) {
      gravar(proximo);
    }
    setAberto(false);
  };

  const alternarGrupo = (id: string) => {
    setGruposAbertos(atual => ({ ...atual, [id]: !atual[id] }));
  };

  const ativosNoRascunho = todosAvisos.filter(aviso => avisoLigado(rascunhoAvisos, aviso.tipo)).length;

  return (
    <div id={ANCORA_AVISOS} className="scroll-mt-28 h-full">
      <Surface padding="lg" className="flex h-full flex-col justify-between gap-4">
        <div className="stack-xs">
          <Text variant="itemTitle" as="h3">Avisos</Text>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
            {avisosAtivos} de {totalAvisos} ativos · {GRUPOS_DE_AVISOS.length} grupos
          </Text>
        </div>

        <div className="flex justify-end">
          <AppButton variant="secondary" size="sm" onClick={abrir}>
            Configurar
          </AppButton>
        </div>
      </Surface>

      <EditorialDrawer
        open={aberto}
        title="Configurar avisos"
        escopoConta="Geral"
        secao="Regras e avisos"
        dirty={dirty}
        onClose={fechar}
        onSave={salvar}
        saveLabel="Salvar avisos"
      >
        <div className="stack-md">
          <div className="stack-sm">
            <Badge
              variant={ativosNoRascunho === totalAvisos ? 'success' : 'neutral'}
              className="w-fit tabular-nums"
            >
              {ativosNoRascunho} de {totalAvisos} ativos
            </Badge>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Escolha quais situações entram na Saúde do período.
            </Text>
          </div>

          <div className="stack-sm">
            {GRUPOS_DE_AVISOS.map(grupo => {
              const expandido = Boolean(gruposAbertos[grupo.id]);
              const ativosGrupo = grupo.avisos.filter(aviso => avisoLigado(rascunhoAvisos, aviso.tipo)).length;

              return (
                <div key={grupo.id} className="stack-xs">
                  <button
                    type="button"
                    aria-expanded={expandido}
                    onClick={() => alternarGrupo(grupo.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Text variant="bodyStrong" as="span" className="min-w-0 truncate">
                      {grupo.titulo}
                    </Text>
                    <span className="flex shrink-0 items-center gap-2 text-[var(--text-secondary)]">
                      <Text variant="meta" as="span" className="tabular-nums text-[var(--text-secondary)]">
                        {ativosGrupo} de {grupo.avisos.length}
                      </Text>
                      {expandido ? (
                        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </span>
                  </button>

                  {expandido ? (() => {
                    const mostrarTodos = Boolean(gruposCompletos[grupo.id]);
                    const visiveis = mostrarTodos ? grupo.avisos : grupo.avisos.slice(0, LIMITE_INICIAL_GRUPO);
                    const restantes = grupo.avisos.length - visiveis.length;
                    return (
                    <div className="divide-y divide-[var(--border-subtle)] px-2">
                      {visiveis.map(aviso => {
                        const id = `aviso-drawer-${aviso.tipo}`;
                        const ligado = avisoLigado(rascunhoAvisos, aviso.tipo);
                        return (
                          <div key={aviso.tipo} className="py-3 stack-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex min-w-0 items-center">
                                <label htmlFor={id}>
                                  <Text variant="body" as="span">{aviso.titulo}</Text>
                                </label>
                                <Ajuda rotulo={`Sobre ${aviso.titulo}`} texto={aviso.descricao} />
                              </span>
                              <ToggleSwitch
                                id={id}
                                label={aviso.titulo}
                                enabled={ligado}
                                onToggle={() => {
                                  const proximo = atualizarAviso(
                                    { ...settings, avisos: rascunhoAvisos },
                                    aviso.tipo,
                                    !ligado,
                                  );
                                  setRascunhoAvisos(proximo.avisos);
                                }}
                              />
                            </div>

                            {aviso.tipo === 'saturacao-quadro' && ligado ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-3 py-2">
                                <Text variant="meta" as="span" id="aviso-saturacao-limite-rotulo">
                                  Limite do mesmo quadro
                                </Text>
                                <SelectField
                                  id="aviso-saturacao-limite"
                                  ariaLabel="Limite do mesmo quadro por semana"
                                  describedBy="aviso-saturacao-limite-rotulo"
                                  value={String(limiteSaturacaoQuadro(rascunhoAvisos))}
                                  onChange={valor => {
                                    const proximo = atualizarLimiteSaturacao(
                                      { ...settings, avisos: rascunhoAvisos },
                                      valor === '1' ? 1 : 2,
                                    );
                                    setRascunhoAvisos(proximo.avisos);
                                  }}
                                  options={[
                                    { value: '1', label: '1 por semana' },
                                    { value: '2', label: '2 por semana' },
                                  ]}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {restantes > 0 ? (
                        <div className="py-2.5">
                          <button
                            type="button"
                            onClick={() => setGruposCompletos(atual => ({ ...atual, [grupo.id]: true }))}
                            className="t-label text-[var(--brand-accent-text)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          >
                            Mostrar mais {restantes} {restantes === 1 ? 'aviso' : 'avisos'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    );
                  })() : null}
                </div>
              );
            })}
          </div>
        </div>
      </EditorialDrawer>
    </div>
  );
}
