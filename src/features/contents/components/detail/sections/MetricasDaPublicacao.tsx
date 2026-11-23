import { useState } from 'react';
import { AppButton } from '../../../../../components/ui/AppButton';
import { Surface } from '../../../../../components/ui/Surface';
import { Text } from '../../../../../components/ui/Text';
import { useAppContext } from '../../../../../context/AppContext';
import { useAuth } from '../../../../../context/AuthContext';
import { inteiroDoCampo } from '../../../../analises/lib/leituras';
import { interacoesDaMetrica, textoDeMetrica } from '../../../../analises/lib/publicacoes';
import type { ContentMetric, ContentPlataforma } from '../../../../../lib/database';
import { generateUUID } from '../../../../../utils/uuid';

function Campo({ id, rotulo, valor, onChange }: { id: string; rotulo: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <label htmlFor={id} className="block">
      <Text variant="label" as="span" className="mb-2 block">{rotulo}</Text>
      <input id={id} className="input" inputMode="numeric" value={valor} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

export function MetricasDaPublicacao({
  contentId,
  publicacoes,
  nomeDa,
}: {
  contentId: string;
  publicacoes: readonly ContentPlataforma[];
  nomeDa: (publicacao: ContentPlataforma) => string;
}) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const [aberta, setAberta] = useState<string | null>(null);
  const [views, setViews] = useState('');
  const [alcance, setAlcance] = useState('');
  const [interacoes, setInteracoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const comId = publicacoes.filter(publicacao => publicacao.id);
  if (!contentId || comId.length === 0) return null;

  const metricaDe = (publicacaoId: string) =>
    state.contentMetrics.find(item => item.publicacaoId === publicacaoId) ?? null;

  const abrir = (publicacao: ContentPlataforma) => {
    const existente = metricaDe(publicacao.id);
    const soma = interacoesDaMetrica(existente);
    setViews(existente?.views == null ? '' : String(existente.views));
    setAlcance(existente?.accountsReached == null ? '' : String(existente.accountsReached));
    setInteracoes(soma == null ? '' : String(soma));
    setAberta(publicacao.id);
  };

  const numeros = [inteiroDoCampo(views), inteiroDoCampo(alcance), inteiroDoCampo(interacoes)];
  const invalido = numeros.some(numero => numero === undefined);
  const vazio = numeros.every(numero => numero == null);

  const salvar = async (publicacao: ContentPlataforma) => {
    if (!user?.id || invalido || vazio || salvando) return;
    const existente = metricaDe(publicacao.id);
    const viewsNumero = inteiroDoCampo(views) ?? null;
    const alcanceNumero = inteiroDoCampo(alcance) ?? null;
    const interacoesNumero = inteiroDoCampo(interacoes) ?? null;
    const somaAtual = interacoesDaMetrica(existente);
    const mudouInteracoes = interacoesNumero !== somaAtual;
    const comments = existente?.comments ?? null;
    const saves = existente?.saves ?? null;
    const shares = existente?.shares ?? null;
    const resto = (comments ?? 0) + (saves ?? 0) + (shares ?? 0);
    const likesAjustadas = interacoesNumero == null ? null : interacoesNumero - resto;
    const cabeNasCurtidas = likesAjustadas == null || likesAjustadas >= 0;
    const agora = new Date().toISOString();
    const payload: ContentMetric = {
      id: existente?.id ?? generateUUID(),
      userId: user.id,
      contentId,
      platformId: publicacao.platformId,
      publicacaoId: publicacao.id,
      origem: 'manual',
      atualizadoEm: agora,
      views: viewsNumero,
      likes: mudouInteracoes && cabeNasCurtidas ? likesAjustadas : (existente?.likes ?? interacoesNumero),
      comments,
      saves,
      shares,
      reposts: existente?.reposts ?? null,
      newFollowers: existente?.newFollowers ?? null,
      accountsReached: alcanceNumero,
      watchTime: existente?.watchTime ?? null,
      retentionRate: existente?.retentionRate ?? null,
      completionRate: existente?.completionRate ?? null,
      qualitativeNotes: existente?.qualitativeNotes ?? null,
      registeredAt: existente?.registeredAt ?? agora,
      createdAt: existente?.createdAt ?? agora,
    };
    setSalvando(true);
    try {
      await dispatch({
        type: existente ? 'UPDATE_CONTENT_METRIC' : 'ADD_CONTENT_METRIC',
        payload,
      });
      setAberta(null);
    } catch {
      // O aviso de erro fica no AppContext.
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Surface as="section" variant="outlined" padding="lg" className="stack-sm">
      <Text variant="sectionTitle" as="h3">Resultados</Text>
      <Text variant="secondary" as="p">
        Visualizações, alcance e interações de cada conta. Interações somam curtidas, comentários, salvamentos e compartilhamentos.
      </Text>
      <ul className="stack-sm">
        {comId.map(publicacao => {
          const existente = metricaDe(publicacao.id);
          const soma = interacoesDaMetrica(existente);
          const abertaAqui = aberta === publicacao.id;
          const resto = (existente?.comments ?? 0) + (existente?.saves ?? 0) + (existente?.shares ?? 0);
          const interacoesNumero = inteiroDoCampo(interacoes);
          const interacoesAbaixoDoDetalhe = abertaAqui && interacoesNumero != null && interacoesNumero < resto;
          return (
            <li key={publicacao.id} className="stack-sm border-t border-[var(--border-color)] pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Text variant="bodyStrong" as="span">{nomeDa(publicacao)}</Text>
                {abertaAqui ? null : (
                  <AppButton variant="ghost" size="sm" onClick={() => abrir(publicacao)}>
                    {existente ? 'Editar' : 'Informar'}
                  </AppButton>
                )}
              </div>
              {abertaAqui ? (
                <form
                  className="stack-sm"
                  onSubmit={event => {
                    event.preventDefault();
                    void salvar(publicacao);
                  }}
                >
                  <div className="grid-form">
                    <Campo id={`views-${publicacao.id}`} rotulo="Visualizações" valor={views} onChange={setViews} />
                    <Campo id={`alcance-${publicacao.id}`} rotulo="Alcance" valor={alcance} onChange={setAlcance} />
                    <Campo id={`interacoes-${publicacao.id}`} rotulo="Interações" valor={interacoes} onChange={setInteracoes} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <AppButton type="button" variant="secondary" onClick={() => setAberta(null)}>Cancelar</AppButton>
                    <AppButton
                      type="submit"
                      variant="primary"
                      disabled={invalido || vazio || salvando || !user?.id || interacoesAbaixoDoDetalhe}
                      disabledReason={
                        invalido ? 'Use números inteiros.'
                          : vazio ? 'Informe visualizações, alcance ou interações.'
                            : interacoesAbaixoDoDetalhe ? 'As interações não cabem abaixo de comentários, salvamentos e compartilhamentos já informados.'
                              : undefined
                      }
                    >
                      Salvar
                    </AppButton>
                  </div>
                </form>
              ) : (
                <Text variant="meta" as="p">
                  Visualizações {textoDeMetrica(existente?.views ?? null)}
                  {' · '}Alcance {textoDeMetrica(existente?.accountsReached ?? null)}
                  {' · '}Interações {textoDeMetrica(soma)}
                </Text>
              )}
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
