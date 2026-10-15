import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Surface } from '../../../../components/ui/Surface';
import { TagSelect } from '../../../../components/ui/TagSelect';
import { Text } from '../../../../components/ui/Text';
import { ToggleRow } from '../../../../components/ui/ToggleSwitch';
import type { Platform, PostingTimeEntry } from '../../../../lib/database';
import { atualizarPreferencias } from '../../lib/editorialSettings';
import { CampoNumero, CampoTexto, digitos, inteiroOuNull } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

function resumoHorarios(entries: readonly PostingTimeEntry[], platforms: readonly Platform[]): string {
  const ids = new Set(entries.flatMap(entry => (entry.platformId ? [entry.platformId] : [])));
  const nomes = platforms.filter(platform => ids.has(platform.id)).map(platform => platform.nome);
  const global = entries.some(entry => !entry.platformId);
  if (nomes.length === 0 && !global) return 'Nenhuma rede tem horário de postagem definido.';
  if (nomes.length === 0) return 'Há um horário geral, sem rede específica.';
  const amostra = nomes.slice(0, 3).join(', ');
  const resto = nomes.length > 3 ? ` e mais ${nomes.length - 3}` : '';
  const frase = nomes.length === 1
    ? `${amostra} tem horário definido`
    : `${amostra}${resto} têm horário definido`;
  return global ? `${frase}. Há também um horário geral.` : `${frase}.`;
}

function Grupo({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="stack-sm">
      <div>
        <Text variant="sectionTitle" as="h2">{titulo}</Text>
        {descricao ? <Text variant="secondary" className="mt-1">{descricao}</Text> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Aba Ajustes: o que vale para todos os períodos. Não tem seletor de período; o que muda
 * de um período para outro fica na aba Período.
 */
export function AjustesEditorialPanel() {
  const { state, settings, gravar, salvarPreferencias } = useEditorialPlano();
  const preferencias = settings.preferencias;
  const limite = preferencias.limiteSemanal;
  const [reservaDraft, setReservaDraft] = useState<string | null>(null);
  const reservaSalva = preferencias.reservaForaSeriesSemanal;
  const reservaMostrada = reservaDraft ?? (reservaSalva == null ? '' : String(reservaSalva));

  const aoMudarReserva = (value: string) => {
    const quantidade = inteiroOuNull(value);
    if (quantidade != null && limite != null && quantidade > limite) {
      setReservaDraft(digitos(value));
      return;
    }
    setReservaDraft(null);
    salvarPreferencias({ reservaForaSeriesSemanal: quantidade });
  };

  // Uma reserva que não cabia volta a valer assim que o limite cresce o bastante.
  useEffect(() => {
    if (reservaDraft == null) return;
    const quantidade = inteiroOuNull(reservaDraft);
    if (quantidade != null && limite != null && quantidade > limite) return;
    setReservaDraft(null);
    if (quantidade === preferencias.reservaForaSeriesSemanal) return;
    salvarPreferencias({ reservaForaSeriesSemanal: quantidade });
  }, [limite, reservaDraft]);

  const ativas = state.platforms.filter(platform => platform.ativo);
  const referenciaAtual = state.platforms.find(platform => platform.id === preferencias.redeReferenciaId);
  const opcoesReferencia = referenciaAtual && !ativas.some(platform => platform.id === referenciaAtual.id)
    ? [referenciaAtual, ...ativas]
    : ativas;

  const opcoes = [
    {
      key: 'quickSeriesCreate',
      title: 'Criação rápida de série',
      description: 'Na tela Séries, criar uma série só com nome e cor e completar depois.',
      enabled: settings.quickSeriesCreate,
      toggle: () => gravar(atualizarPreferencias({ ...settings, quickSeriesCreate: !settings.quickSeriesCreate }, {})),
    },
    {
      key: 'openInfoNotices',
      title: 'Avisos de informações em aberto',
      description: 'Mostrar quando uma série ainda não tem pilar, função, recorrência, formato ou esforço.',
      enabled: settings.openInfoNotices,
      toggle: () => gravar(atualizarPreferencias({ ...settings, openInfoNotices: !settings.openInfoNotices }, {})),
    },
  ] as const;

  return (
    <div className="stack-xl">
      <Text variant="secondary" className="max-w-xl">
        Vale para todos os períodos. O que muda de um período para outro, como prioridade e metas, fica na aba Período.
      </Text>

      <Grupo titulo="Ritmo">
        <Surface className="stack-lg">
          <CampoNumero
            id="limite-semanal"
            label="Quantos roteiros você consegue publicar por semana?"
            hint="Conte posts de feed, vídeos e lives. Stories e reposts ficam separados. É o limite, não uma obrigação de preenchê-lo."
            value={limite == null ? '' : String(limite)}
            onChange={value => salvarPreferencias({ limiteSemanal: inteiroOuNull(value) })}
          />
          <CampoNumero
            id="reserva-fora-series"
            label="Quantos roteiros fora das séries reservar por semana?"
            hint="Parte do limite para publicidades, ideias e oportunidades. Já está incluída no total."
            value={reservaMostrada}
            onChange={aoMudarReserva}
            erro={reservaDraft != null ? 'A reserva precisa caber no limite semanal.' : undefined}
          />
          <CampoNumero
            id="reserva-prontos"
            label="Quantos roteiros prontos você quer manter de reserva?"
            hint="Roteiros finalizados e sem data de publicação. Gravados que precisam de edição e roteiros já agendados ficam fora."
            value={preferencias.reservaProntos == null ? '' : String(preferencias.reservaProntos)}
            onChange={value => salvarPreferencias({ reservaProntos: inteiroOuNull(value) })}
          />
        </Surface>
      </Grupo>

      <Grupo titulo="Redes">
        <Surface className="stack-lg">
          <TagSelect
            id="rede-referencia"
            label="Qual rede usar como base para o calendário?"
            placeholder="Nenhuma"
            searchable
            maxSelections={1}
            values={preferencias.redeReferenciaId ? [preferencias.redeReferenciaId] : []}
            options={opcoesReferencia.map(platform => ({ value: platform.id, label: platform.nome }))}
            onChange={values => salvarPreferencias({ redeReferenciaId: values[0] ?? null })}
          />
          <div className="stack-sm">
            <Text variant="bodyStrong" as="span">Horários de postagem</Text>
            <Text variant="secondary">
              {resumoHorarios(state.postingTimeEntries ?? [], state.platforms)}{' '}
              <Link
                to="/configuracoes/plataformas"
                className="text-[var(--text-primary)] underline underline-offset-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Editar nas plataformas
              </Link>
            </Text>
          </div>
          <CampoTexto
            id="hashtags-fora-series"
            label="Hashtags fora das séries"
            rows={3}
            placeholder="#hashtag1 #hashtag2"
            value={preferencias.hashtagsForaSeries}
            onSave={hashtagsForaSeries => {
              if (hashtagsForaSeries === preferencias.hashtagsForaSeries) return;
              salvarPreferencias({ hashtagsForaSeries });
            }}
          />
        </Surface>
      </Grupo>

      <Grupo titulo="Perfil">
        <Surface className="stack-lg">
          <CampoTexto
            id="publico-linguagem"
            label="Público, linguagem e assuntos do perfil"
            value={preferencias.publicoLinguagem}
            onSave={publicoLinguagem => {
              if (publicoLinguagem === preferencias.publicoLinguagem) return;
              salvarPreferencias({ publicoLinguagem });
            }}
          />
          <CampoTexto
            id="disponibilidade"
            label="Dias para produzir e compromissos"
            value={preferencias.disponibilidade}
            onSave={disponibilidade => {
              if (disponibilidade === preferencias.disponibilidade) return;
              salvarPreferencias({ disponibilidade });
            }}
          />
        </Surface>
      </Grupo>

      <Grupo titulo="Opções">
        <div className="grid gap-3 sm:grid-cols-2">
          {opcoes.map(row => (
            <Surface key={row.key} padding="none">
              <ToggleRow
                id={`ajustes-${row.key}`}
                enabled={row.enabled}
                onToggle={row.toggle}
                title={row.title}
                className="gap-4 p-4"
              >
                <Text variant="bodyStrong" as="span" className="block">{row.title}</Text>
                <Text variant="secondary" as="span" className="mt-1 block">{row.description}</Text>
              </ToggleRow>
            </Surface>
          ))}
        </div>
      </Grupo>
    </div>
  );
}
