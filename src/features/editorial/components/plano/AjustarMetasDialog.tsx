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

export interface AjustarMetasDialogProps {
  open: boolean;
  onClose: () => void;
  periodo: { inicio: string; fim: string };
  decisao: DecisaoPeriodo | null;
  platforms: readonly Platform[];
  defaultProducao: number;
  defaultPublicacao: number;
  onSalvar: (patch: Partial<Omit<DecisaoPeriodo, 'inicio' | 'fim'>>) => void;
}

export function AjustarMetasDialog({
  open,
  onClose,
  periodo,
  decisao,
  platforms,
  defaultProducao,
  defaultPublicacao,
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
      setPrioridade(decisao?.prioridade ?? 'Foco em Cosmere & Ritmo de Final de Ano');
      setPrioridadeNivel(decisao?.prioridadeNivel ?? 'Alta');
      setPausaEditorial(decisao?.pausaEditorial ?? 'Pausa editorial no feriado de 15 a 17 de novembro.');
      setMetasProducao(String(decisao?.metasProducao ?? defaultProducao));
      setMetasPublicacao(String(decisao?.metasPublicacao ?? defaultPublicacao));
      setMetasPorConta(decisao?.metasPorConta ?? {});
    }
  }, [open, decisao, defaultProducao, defaultPublicacao]);

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

  const contasExibidas = platforms.length > 0 ? platforms : [
    { id: 'instagram_default', nome: 'Instagram Principal', handle: 'annestudio' } as Platform,
    { id: 'tiktok_default', nome: 'TikTok Editorial', handle: 'anne_resenhas' } as Platform,
    { id: 'youtube_default', nome: 'Canal Criaki Longo', handle: 'youtube.com/@criaki' } as Platform,
  ];

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="md:max-w-[680px]" ariaLabel="Ajustar Metas do Período">
      <OverlayHeader
        title="Ajustar Metas do Período"
        subtitle={`Metas para o ciclo ${periodo.inicio} até ${periodo.fim}.`}
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
              value={metasPublicacao}
              onChange={e => setMetasPublicacao(e.target.value)}
            />
          </div>
        </div>

        <div className="stack-sm pt-2 border-t border-[var(--border-subtle)]">
          <Text variant="itemTitle" as="h4">
            Metas Individuais por Conta
          </Text>
          <div className="stack-sm">
            {contasExibidas.map(conta => {
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
                          Ritmo semanal
                        </Text>
                      </label>
                      <input
                        id={`ritmo-${conta.id}`}
                        type="text"
                        placeholder="~3 posts/sem"
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
