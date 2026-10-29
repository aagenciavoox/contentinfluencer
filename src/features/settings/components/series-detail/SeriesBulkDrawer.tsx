import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { RichTextEditor } from '../../../../components/editors/RichTextEditor';
import { Drawer } from '../../../../components/overlays/Drawer';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { SegmentTabs } from '../../../../components/ui/SegmentTabs';
import { SelectField } from '../../../../components/ui/SelectField';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import type { Content, Platform, Serie, Temporada } from '../../../../lib/database';
import { notifySaveFeedback } from '../../../../lib/saveFeedback';
import { ERRORS } from '../../../../lib/uiCopy';
import { generateUUID } from '../../../../utils/uuid';
import { destinosPadraoAtivos, publicacoesDosDestinos, type DestinoPlataforma } from '../../../editorial/lib/destinations';
import { filhosDaSerie } from '../../../editorial/lib/serieArvore';
import {
  aplicarContextoNoRascunho,
  apagarRascunhoMassa,
  blocosPendentes,
  conteudoDoBloco,
  gravarRascunhoMassa,
  lerRascunhoMassa,
  marcarCriados,
  type BlocoMassa,
  type ModoBloco,
  type RascunhoMassa,
} from '../../lib/seriesBulkDraft';

export type PedidoMassa = {
  nonce: number;
  origem: 'massa' | 'grupo';
  serieId: string;
  temporadaId: string | null;
};

function opcoesQuadro(serieId: string, series: readonly Serie[]) {
  const self = series.find(item => item.id === serieId);
  const opcoes = self ? [{ value: self.id, label: self.name?.trim() || 'Série' }] : [];
  const caminhar = (id: string, prefixo: string) => {
    for (const filho of filhosDaSerie(id, series)) {
      const nome = filho.name?.trim() || 'Quadro';
      const label = prefixo ? `${prefixo} · ${nome}` : nome;
      opcoes.push({ value: filho.id, label });
      caminhar(filho.id, label);
    }
  };
  caminhar(serieId, '');
  return opcoes;
}

function catalogoDestinos(plataformas: readonly Platform[]): DestinoPlataforma[] {
  return plataformas
    .filter(plataforma => plataforma.ativo)
    .map(plataforma => ({ id: plataforma.id, nome: plataforma.nome }));
}

export function SeriesBulkDrawer({
  open,
  onClose,
  seriePaginaId,
  serieNome,
  series,
  temporadas,
  plataformas,
  destinosPadrao,
  pedido,
  idsExistentes,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  seriePaginaId: string;
  serieNome: string;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  plataformas: readonly Platform[];
  destinosPadrao: readonly string[];
  pedido: PedidoMassa | null;
  idsExistentes: ReadonlySet<string>;
  onCreate: (contents: Content[]) => Promise<void>;
}) {
  const [rascunho, setRascunho] = useState<RascunhoMassa>(() => lerRascunhoMassa(seriePaginaId));
  const [serieAtual, setSerieAtual] = useState(seriePaginaId);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [parcial, setParcial] = useState<string | null>(null);
  const [descartarAberto, setDescartarAberto] = useState(false);
  const pedidoVisto = useRef<number | null>(null);

  if (serieAtual !== seriePaginaId) {
    setSerieAtual(seriePaginaId);
    setRascunho(lerRascunhoMassa(seriePaginaId));
    setErro(null);
    setParcial(null);
  }

  const atualizar = (next: RascunhoMassa) => {
    setRascunho(next);
    gravarRascunhoMassa(seriePaginaId, next);
  };

  useEffect(() => {
    if (!pedido || pedidoVisto.current === pedido.nonce) return;
    pedidoVisto.current = pedido.nonce;
    setErro(null);
    setParcial(null);
    setRascunho(atual => {
      const next = aplicarContextoNoRascunho(
        atual,
        { serieId: pedido.serieId, temporadaId: pedido.temporadaId },
        pedido.origem,
        generateUUID(),
      );
      gravarRascunhoMassa(seriePaginaId, next);
      return next;
    });
  }, [pedido, seriePaginaId]);

  const quadros = useMemo(() => opcoesQuadro(seriePaginaId, series), [seriePaginaId, series]);
  const pendentes = useMemo(
    () => blocosPendentes(rascunho.blocos, idsExistentes),
    [idsExistentes, rascunho.blocos],
  );
  const mostraQuadro = quadros.length > 1;
  const mostraTemporada = temporadas.length > 0;

  const alterar = (id: string, patch: Partial<BlocoMassa>) => {
    setRascunho(atual => {
      const next = {
        blocos: atual.blocos.map(bloco => (bloco.id === id ? { ...bloco, ...patch } : bloco)),
      };
      gravarRascunhoMassa(seriePaginaId, next);
      return next;
    });
  };

  const remover = (id: string) => {
    setRascunho(atual => {
      const next = { blocos: atual.blocos.filter(bloco => bloco.id !== id) };
      gravarRascunhoMassa(seriePaginaId, next);
      return next;
    });
  };

  const adicionarOutro = () => {
    setRascunho(atual => {
      const ultimo = atual.blocos.at(-1);
      const next = {
        blocos: [...atual.blocos, {
          id: generateUUID(),
          modo: ultimo?.modo ?? 'roteiro',
          serieId: ultimo?.serieId || seriePaginaId,
          temporadaId: ultimo?.temporadaId ?? null,
          titulo: '',
          texto: '',
          criado: false,
        }],
      };
      gravarRascunhoMassa(seriePaginaId, next);
      return next;
    });
  };

  const descartar = () => {
    apagarRascunhoMassa(seriePaginaId);
    setRascunho({ blocos: [] });
    setDescartarAberto(false);
    setErro(null);
    setParcial(null);
    onClose();
  };

  const criar = async () => {
    if (pendentes.length === 0) {
      setErro('Preencha o título. No roteiro, escreva o texto também.');
      return;
    }
    setBusy(true);
    setErro(null);
    setParcial(null);
    const feitos = new Set<string>();
    const destinos = destinosPadraoAtivos(destinosPadrao, catalogoDestinos(plataformas));
    try {
      for (const bloco of pendentes) {
        const destino = series.find(item => item.id === bloco.serieId);
        if (!destino) throw new Error('Série do episódio não encontrada');
        const base = conteudoDoBloco(bloco, destino, series);
        const content: Content = {
          ...base,
          plataformas: publicacoesDosDestinos({ destinos, contentId: base.id }),
        };
        await onCreate([content]);
        feitos.add(bloco.id);
      }
      const restantes = rascunho.blocos.filter(bloco => !feitos.has(bloco.id) && !bloco.criado);
      if (restantes.length === 0) {
        apagarRascunhoMassa(seriePaginaId);
        setRascunho({ blocos: [] });
      } else {
        atualizar({ blocos: restantes });
      }
      notifySaveFeedback({
        status: 'success',
        message: pendentes.length === 1 ? 'Episódio criado' : `${pendentes.length} episódios criados`,
      });
      onClose();
    } catch (err) {
      console.error('[SeriesBulkDrawer]', err);
      const next = { blocos: marcarCriados(rascunho.blocos, feitos) };
      atualizar(next);
      const faltam = pendentes.length - feitos.size;
      if (feitos.size > 0) {
        setParcial(`${feitos.size} ${feitos.size === 1 ? 'entrou' : 'entraram'}; ${faltam} ${faltam === 1 ? 'ficou' : 'ficaram'} de fora. Tentar de novo não duplica o que já entrou.`);
      }
      setErro(ERRORS.criarRoteiro);
    } finally {
      setBusy(false);
    }
  };

  const quantidade = pendentes.length;

  return (
    <>
      <Drawer open={open} onClose={onClose} widthClassName="max-w-none md:max-w-3xl">
        <OverlayHeader
          title="Adicionar episódios em massa"
          subtitle={serieNome}
          onClose={onClose}
        />
        <OverlayBody className="stack-lg">
          {rascunho.blocos.map((bloco, index) => {
            const opcoesTemp = [
              ...temporadas.map(item => ({ value: item.id, label: item.nome })),
              { value: 'none', label: 'Sem temporada' },
            ];
            if (bloco.temporadaId && !opcoesTemp.some(item => item.value === bloco.temporadaId)) {
              opcoesTemp.unshift({ value: bloco.temporadaId, label: 'Temporada' });
            }
            return (
              <Surface key={bloco.id} variant="outlined" padding="md" className="stack-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-sm font-medium text-[var(--text-primary)]">
                      {index + 1}
                    </span>
                    <Text variant="itemTitle" as="span">Episódio {index + 1}</Text>
                    {bloco.criado ? <Badge variant="neutral">Criado</Badge> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <SegmentTabs<ModoBloco>
                      value={bloco.modo}
                      onChange={modo => alterar(bloco.id, { modo })}
                      ariaLabel={`Tipo do episódio ${index + 1}`}
                      options={[
                        { id: 'roteiro', label: 'Roteiro' },
                        { id: 'ideia', label: 'Ideia' },
                      ]}
                    />
                    <AppButton
                      variant="secondary"
                      size="sm"
                      iconOnly
                      aria-label={`Remover episódio ${index + 1}`}
                      onClick={() => remover(bloco.id)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </AppButton>
                  </span>
                </div>

                {mostraQuadro || mostraTemporada ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {mostraQuadro ? (
                      <label className="stack-xs">
                        <Text variant="label" as="span">Quadro</Text>
                        <SelectField
                          block
                          ariaLabel={`Quadro do episódio ${index + 1}`}
                          value={quadros.some(item => item.value === bloco.serieId) ? bloco.serieId : quadros[0]?.value || bloco.serieId}
                          onChange={serieId => alterar(bloco.id, { serieId })}
                          options={quadros}
                          disabled={busy || bloco.criado}
                        />
                      </label>
                    ) : null}
                    {mostraTemporada ? (
                      <label className="stack-xs">
                        <Text variant="label" as="span">Temporada</Text>
                        <SelectField
                          block
                          ariaLabel={`Temporada do episódio ${index + 1}`}
                          value={bloco.temporadaId || 'none'}
                          onChange={valor => alterar(bloco.id, { temporadaId: valor === 'none' ? null : valor })}
                          options={opcoesTemp}
                          disabled={busy || bloco.criado}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <label className="stack-xs">
                  <Text variant="label" as="span">Título do episódio</Text>
                  <input
                    value={bloco.titulo}
                    disabled={busy || bloco.criado}
                    onChange={event => alterar(bloco.id, { titulo: event.target.value })}
                    className="ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                  />
                </label>

                <div className="stack-xs">
                  <Text variant="label" as="p">{bloco.modo === 'ideia' ? 'Ideia' : 'Roteiro completo'}</Text>
                  {bloco.criado ? (
                    <Text variant="secondary">{bloco.texto ? 'Texto já gravado neste episódio.' : 'Episódio já criado.'}</Text>
                  ) : (
                    <RichTextEditor
                      documentId={bloco.id}
                      content={bloco.texto}
                      onChange={html => alterar(bloco.id, { texto: html })}
                      formatBar="writing"
                      meter="none"
                      placeholder={bloco.modo === 'ideia' ? 'Anote a ideia…' : 'Escreva o roteiro…'}
                      editorViewportClassName="max-h-72 min-h-36"
                    />
                  )}
                </div>
              </Surface>
            );
          })}

          <AppButton
            variant="secondary"
            onClick={adicionarOutro}
            disabled={busy}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Adicionar outro episódio
          </AppButton>

          {parcial ? <Text variant="secondary">{parcial}</Text> : null}
          {erro ? <Text variant="meta" className="text-[var(--danger)]">{erro}</Text> : null}
        </OverlayBody>
        <OverlayFooter className="flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 stack-xs">
            <Text variant="body" as="p">
              {quantidade === 1 ? '1 episódio para criar' : `${quantidade} episódios para criar`}
            </Text>
            <Text variant="meta" as="p">Sem data de publicação</Text>
            <Text variant="meta" as="p">Seu rascunho é mantido ao fechar.</Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              variant="secondary"
              onClick={() => setDescartarAberto(true)}
              disabled={busy || rascunho.blocos.length === 0}
            >
              Descartar
            </AppButton>
            <AppButton variant="secondary" onClick={onClose} disabled={busy}>Fechar</AppButton>
            <AppButton variant="primary" onClick={() => void criar()} disabled={busy || quantidade === 0}>
              {busy ? 'Criando…' : quantidade === 1 ? 'Criar 1 episódio' : `Criar ${quantidade} episódios`}
            </AppButton>
          </div>
        </OverlayFooter>
      </Drawer>
      <ConfirmModal
        open={descartarAberto}
        message="Descartar este rascunho? Os episódios que ainda não foram criados saem desta lista. Os que já entraram continuam na série."
        confirmLabel="Descartar rascunho"
        cancelLabel="Manter rascunho"
        onConfirm={descartar}
        onCancel={() => setDescartarAberto(false)}
      />
    </>
  );
}
