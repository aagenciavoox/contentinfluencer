import {useEffect, useMemo, useState} from 'react';
import {AppButton} from '../../../components/ui/AppButton';
import {SelectField} from '../../../components/ui/SelectField';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import type {Content, Platform} from '../../../lib/database';
import {contasAtivas, redeDaConta} from '../../contas/lib/contas';
import type {PlanejamentoPostIt} from '../lib/postIt';
import {
  type ContaNoCalendario,
  type DestinoSalvar,
  type LinhaSalvarCalendario,
  linhasParaSalvarNoCalendario,
  textoHorariosDescartados,
} from '../lib/salvarNoCalendario';

type ModoData = 'mesmo' | 'por-conta';

export type ConfirmacaoSalvarCalendario = {
  linhas: LinhaSalvarCalendario[];
  time: string | null;
  horarioPorConta: Map<string, ContaNoCalendario[]> | null;
};

function destinoLabel(destino: DestinoSalvar): string {
  if (destino === 'ideia') return 'Ideia';
  if (destino === 'roteiro') return 'Roteiro';
  return 'Manter';
}

export function SalvarNoCalendarioDialog({
  open,
  postIts,
  contents,
  platforms,
  ids,
  onClose,
  onConfirm,
}: {
  open: boolean;
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  platforms: readonly Platform[];
  ids?: readonly string[];
  onClose: () => void;
  onConfirm: (confirmacao: ConfirmacaoSalvarCalendario) => void;
}) {
  const iniciais = useMemo(
    () => linhasParaSalvarNoCalendario(postIts, contents, ids),
    [postIts, contents, ids],
  );
  const [linhas, setLinhas] = useState<LinhaSalvarCalendario[]>(iniciais);
  const [modo, setModo] = useState<ModoData>('mesmo');
  const [time, setTime] = useState('');
  const [porConta, setPorConta] = useState<Record<string, ContaNoCalendario[]>>({});

  useEffect(() => {
    if (!open) return;
    setLinhas(iniciais);
    setModo('mesmo');
    setTime('');
    const mapa: Record<string, ContaNoCalendario[]> = {};
    for (const linha of iniciais) {
      const postIt = postIts.find(item => item.id === linha.postItId);
      if (!postIt?.date) continue;
      const content = postIt.contentId ? contents.find(item => item.id === postIt.contentId) : null;
      const contas = content && content.plataformas.length > 0
        ? content.plataformas.map(plataforma => ({
          platformId: plataforma.platformId,
          date: postIt.date as string,
          time: plataforma.publishTime ?? null,
        }))
        : contasAtivas(platforms).map(conta => ({
          platformId: conta.id,
          date: postIt.date as string,
          time: null,
        }));
      mapa[linha.postItId] = contas;
    }
    setPorConta(mapa);
  }, [open, iniciais, postIts, contents, platforms]);

  const avisoHorario = useMemo(() => {
    if (modo !== 'mesmo' || !time.trim()) return null;
    const mensagens = linhas.flatMap(linha => {
      const postIt = postIts.find(item => item.id === linha.postItId);
      const content = postIt?.contentId ? contents.find(item => item.id === postIt.contentId) : null;
      if (!content) return [];
      const texto = textoHorariosDescartados(content, time, platformId => {
        const conta = platforms.find(item => item.id === platformId);
        return conta?.nome || platformId;
      });
      return texto ? [texto] : [];
    });
    return mensagens.length > 0 ? mensagens.join(' ') : null;
  }, [modo, time, linhas, postIts, contents, platforms]);

  const precisaEscolher = linhas.some(linha => !linha.opcoes.manter || linha.opcoes.ideia || linha.opcoes.roteiro);
  const aplicarTodos = (destino: DestinoSalvar) => {
    setLinhas(current => current.map(linha => {
      if (destino === 'ideia' && !linha.opcoes.ideia) return linha;
      if (destino === 'roteiro' && !linha.opcoes.roteiro) return linha;
      if (destino === 'manter' && !linha.opcoes.manter) return linha;
      return {...linha, destino};
    }));
  };

  const confirmar = () => {
    onConfirm({
      linhas,
      time: time.trim() || null,
      horarioPorConta: modo === 'por-conta'
        ? new Map(Object.entries(porConta))
        : null,
    });
  };

  const rotuloConta = (platformId: string) => {
    const conta = platforms.find(item => item.id === platformId);
    if (!conta) return platformId;
    const rede = redeDaConta(conta);
    return conta.nome || rede || platformId;
  };

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="max-w-lg" ariaLabel="Salvar no calendário">
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title="Salvar no calendário"
          subtitle="O dia do post-it vira a data do roteiro em todas as telas."
          onClose={onClose}
        />
        <OverlayBody className="stack-lg">
          {linhas.length === 0 ? (
            <Text variant="body" as="p" className="text-[var(--text-secondary)]">
              Nada com dia para salvar. Coloque o post-it num dia primeiro.
            </Text>
          ) : (
            <>
              {precisaEscolher ? (
                <section className="stack-sm">
                  <Text variant="label" as="p">O que cada nota vira</Text>
                  <div className="flex flex-wrap gap-2">
                    <AppButton variant="secondary" size="xs" onClick={() => aplicarTodos('ideia')}>
                      Todas ideia
                    </AppButton>
                    <AppButton variant="secondary" size="xs" onClick={() => aplicarTodos('roteiro')}>
                      Todas roteiro
                    </AppButton>
                    {linhas.some(linha => linha.opcoes.manter) ? (
                      <AppButton variant="ghost" size="xs" onClick={() => aplicarTodos('manter')}>
                        Manter o que já existe
                      </AppButton>
                    ) : null}
                  </div>
                  <ul className="stack-sm">
                    {linhas.map(linha => {
                      const opcoes = [
                        ...(linha.opcoes.ideia ? [{value: 'ideia', label: 'Ideia'}] : []),
                        ...(linha.opcoes.roteiro ? [{value: 'roteiro', label: 'Roteiro'}] : []),
                        ...(linha.opcoes.manter ? [{value: 'manter', label: 'Manter'}] : []),
                      ];
                      return (
                        <li
                          key={linha.postItId}
                          className="flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border-color)] px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <Text variant="body" as="p" className="truncate">{linha.texto}</Text>
                            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">{linha.date}</Text>
                          </div>
                          {opcoes.length > 1 ? (
                            <SelectField
                              id={`destino-${linha.postItId}`}
                              ariaLabel="Destino"
                              value={linha.destino}
                              onChange={value => setLinhas(current => current.map(item =>
                                item.postItId === linha.postItId
                                  ? {...item, destino: value as DestinoSalvar}
                                  : item,
                              ))}
                              options={opcoes}
                              className="w-36 shrink-0"
                            />
                          ) : (
                            <Text variant="meta" as="span" className="shrink-0 text-[var(--text-secondary)]">
                              {destinoLabel(linha.destino)}
                            </Text>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              <section className="stack-sm">
                <Text variant="label" as="p">Dia e horário</Text>
                <SelectField
                  id="modo-data-calendario"
                  ariaLabel="Como gravar a data"
                  value={modo}
                  onChange={value => setModo(value === 'por-conta' ? 'por-conta' : 'mesmo')}
                  options={[
                    {value: 'mesmo', label: 'O mesmo em todas as contas'},
                    {value: 'por-conta', label: 'Cada rede no seu dia'},
                  ]}
                />
                {modo === 'mesmo' ? (
                  <>
                    <label className="block" htmlFor="horario-salvar-calendario">
                      <Text variant="label" as="span" className="mb-2 block text-[var(--text-tertiary)]">
                        Horário (opcional)
                      </Text>
                      <input
                        id="horario-salvar-calendario"
                        type="time"
                        value={time}
                        onChange={event => setTime(event.target.value)}
                        className="input w-full max-w-[10rem]"
                      />
                    </label>
                    {avisoHorario ? (
                      <Text variant="meta" as="p" role="status" className="text-[var(--text-secondary)]">
                        {avisoHorario}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <ul className="stack-md">
                    {linhas.map(linha => (
                      <li key={linha.postItId} className="stack-sm">
                        <Text variant="body" as="p">{linha.texto}</Text>
                        {(porConta[linha.postItId] ?? []).map((conta, index) => (
                          <div key={`${linha.postItId}-${conta.platformId}`} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_8rem_7rem]">
                            <Text variant="meta" as="p" className="self-center text-[var(--text-secondary)]">
                              {rotuloConta(conta.platformId)}
                            </Text>
                            <label className="block" htmlFor={`data-${linha.postItId}-${conta.platformId}`}>
                              <span className="sr-only">Data de {rotuloConta(conta.platformId)}</span>
                              <input
                                id={`data-${linha.postItId}-${conta.platformId}`}
                                type="date"
                                value={conta.date}
                                onChange={event => setPorConta(current => ({
                                  ...current,
                                  [linha.postItId]: (current[linha.postItId] ?? []).map((item, i) =>
                                    i === index ? {...item, date: event.target.value} : item,
                                  ),
                                }))}
                                className="input w-full"
                              />
                            </label>
                            <label className="block" htmlFor={`hora-${linha.postItId}-${conta.platformId}`}>
                              <span className="sr-only">Horário de {rotuloConta(conta.platformId)}</span>
                              <input
                                id={`hora-${linha.postItId}-${conta.platformId}`}
                                type="time"
                                value={conta.time ?? ''}
                                onChange={event => setPorConta(current => ({
                                  ...current,
                                  [linha.postItId]: (current[linha.postItId] ?? []).map((item, i) =>
                                    i === index ? {...item, time: event.target.value || null} : item,
                                  ),
                                }))}
                                className="input w-full"
                              />
                            </label>
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </OverlayBody>
        <OverlayFooter>
          <AppButton variant="secondary" onClick={onClose}>Cancelar</AppButton>
          <AppButton variant="primary" onClick={confirmar} disabled={linhas.length === 0}>
            Salvar no calendário
          </AppButton>
        </OverlayFooter>
      </div>
    </Dialog>
  );
}
