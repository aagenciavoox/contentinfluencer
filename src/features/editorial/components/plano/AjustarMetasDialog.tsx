import { useState, useEffect } from 'react';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { Dialog } from '../../../../components/overlays/Dialog';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import type { Platform } from '../../../../lib/database';
import type { DecisaoPeriodo } from '../../lib/editorialSettings';
import { rotuloDoPeriodo, type PeriodoSelecionado } from './PeriodoEditorialControl';

export interface AjustarMetasDialogProps {
  open: boolean;
  onClose: () => void;
  periodo: PeriodoSelecionado;
  decisao: DecisaoPeriodo | null;
  platforms: readonly Platform[];
  /** O que a meta vale sem número escrito: o ritmo semanal vezes as semanas. null = sem meta. */
  producaoCalculada: number | null;
  publicacaoCalculada: number | null;
  onSalvar: (patch: Partial<Omit<DecisaoPeriodo, 'inicio' | 'fim'>>) => void;
}

export function AjustarMetasDialog({
  open,
  onClose,
  periodo,
  decisao,
  platforms,
  producaoCalculada,
  publicacaoCalculada,
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

  useEffect(() => {
    if (open) {
      setPrioridade(decisao?.prioridade ?? '');
      setPrioridadeNivel(decisao?.prioridadeNivel ?? 'Alta');
      setPausaEditorial(decisao?.pausaEditorial ?? '');
      // Campo vazio segue o ritmo; só um número escrito vira meta ajustada.
      setMetasProducao(decisao?.metasProducao != null ? String(decisao.metasProducao) : '');
      setMetasPublicacao(decisao?.metasPublicacao != null ? String(decisao.metasPublicacao) : '');
      setMetasPorConta(decisao?.metasPorConta ?? {});
    }
  }, [open, decisao]);

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
    });
    onClose();
  };

  const placeholderMeta = (calculada: number | null) =>
    calculada == null ? 'Sem meta' : `${calculada} pelo ritmo`;

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
              placeholder="Ex.: Pausa editorial no feriado..."
              value={pausaEditorial}
              onChange={e => setPausaEditorial(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="stack-xs">
            <label htmlFor="meta-producao">
              <Text variant="bodyStrong" as="span">
                Meta de Produção (Roteiros)
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
          </div>

          <div className="stack-xs">
            <label htmlFor="meta-publicacao">
              <Text variant="bodyStrong" as="span">
                Meta de Publicação (Posts)
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
          </div>
        </div>

        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
          Em branco, produção e publicação seguem o ritmo semanal da aba Ritmo.
        </Text>

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
