import { useState } from 'react';
import { CalendarDays, Clock, Hash, Info, Pencil, Settings, Share2, UserRound } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { SidePanel } from '../../../../components/layout/SidePanel';
import { Badge } from '../../../../components/ui/Badge';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { ToggleRow } from '../../../../components/ui/ToggleSwitch';
import type { Platform, PostingTimeEntry } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { iconeDaConta, rotuloConta } from '../../../contas/lib/contas';
import { atualizarPreferencias } from '../../lib/editorialSettings';
import { PostingTimesEditor } from '../../../settings/components/PostingTimesEditor';
import { CampoStepper, CampoTexto, CardConfiguracao, inteiroOuNull } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

function resumoHorarios(entries: readonly PostingTimeEntry[], platforms: readonly Platform[]): string {
  const ids = new Set(entries.flatMap(entry => (entry.platformId ? [entry.platformId] : [])));
  const nomes = platforms.filter(platform => ids.has(platform.id)).map(platform => rotuloConta(platform));
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

type RitmoDraft = {
  limite: string;
  reserva: string;
  prontos: string;
};

function textoNumero(valor: number | null): string {
  return valor == null ? '' : String(valor);
}

function ritmoSalvo(preferencias: {
  limiteSemanal: number | null;
  reservaForaSeriesSemanal: number | null;
  reservaProntos: number | null;
}): RitmoDraft {
  return {
    limite: textoNumero(preferencias.limiteSemanal),
    reserva: textoNumero(preferencias.reservaForaSeriesSemanal),
    prontos: textoNumero(preferencias.reservaProntos),
  };
}

function reservaCabeNoLimite(ritmo: RitmoDraft): boolean {
  const limite = inteiroOuNull(ritmo.limite);
  const reserva = inteiroOuNull(ritmo.reserva);
  return !(reserva != null && limite != null && reserva > limite);
}

function ValorDoRitmo({
  rotulo,
  valor,
  unidade,
  hint,
}: {
  rotulo: string;
  valor: number | null;
  unidade: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 stack-xs">
      <Text variant="bodyStrong" as="p">{rotulo}</Text>
      <Text variant="itemTitle" as="p" className="tabular-nums">{valor == null ? '—' : String(valor)}</Text>
      <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">
        {valor == null ? 'Não definido' : unidade}
      </Text>
      <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">{hint}</Text>
    </div>
  );
}

/**
 * Aba Ajustes: o que vale para todos os períodos. Não tem seletor de período; o que muda
 * de um período para outro fica na aba Período.
 */
export function AjustesEditorialPanel() {
  const { state, settings, gravar, salvarPreferencias } = useEditorialPlano();
  const preferencias = settings.preferencias;
  const [horariosAbertos, setHorariosAbertos] = useState(false);
  const [editandoRitmo, setEditandoRitmo] = useState(false);
  const [ritmo, setRitmo] = useState<RitmoDraft>(() => ritmoSalvo(preferencias));
  const reservaInvalida = !reservaCabeNoLimite(ritmo);

  const abrirRitmo = () => {
    setRitmo(ritmoSalvo(preferencias));
    setEditandoRitmo(true);
  };

  const cancelarRitmo = () => {
    setRitmo(ritmoSalvo(preferencias));
    setEditandoRitmo(false);
  };

  const salvarRitmo = () => {
    if (reservaInvalida) return;
    const salvo = ritmoSalvo(preferencias);
    const mudou = ritmo.limite !== salvo.limite || ritmo.reserva !== salvo.reserva || ritmo.prontos !== salvo.prontos;
    if (mudou) {
      salvarPreferencias({
        limiteSemanal: inteiroOuNull(ritmo.limite),
        reservaForaSeriesSemanal: inteiroOuNull(ritmo.reserva),
        reservaProntos: inteiroOuNull(ritmo.prontos),
      });
    }
    setEditandoRitmo(false);
  };

  const ativas = state.platforms.filter(platform => platform.ativo);
  const referenciaAtual = state.platforms.find(platform => platform.id === preferencias.redeReferenciaId);
  const opcoesReferencia = referenciaAtual && !ativas.some(platform => platform.id === referenciaAtual.id)
    ? [referenciaAtual, ...ativas]
    : ativas;

  const opcoes = [
    {
      key: 'quickSeriesCreate',
      title: 'Criação rápida de séries',
      description: 'Crie com nome e cor e complete os detalhes depois.',
      enabled: settings.quickSeriesCreate,
      toggle: () => gravar(atualizarPreferencias({ ...settings, quickSeriesCreate: !settings.quickSeriesCreate }, {})),
    },
    {
      key: 'openInfoNotices',
      title: 'Avisar sobre informações em aberto',
      description: 'Sinaliza séries sem pilar, função, recorrência, formato ou esforço.',
      enabled: settings.openInfoNotices,
      toggle: () => gravar(atualizarPreferencias({ ...settings, openInfoNotices: !settings.openInfoNotices }, {})),
    },
  ] as const;

  const horarios = state.postingTimeEntries ?? [];
  const divisor = 'md:border-l md:border-[var(--border-color)] md:pl-6';

  return (
    <div className="stack-lg">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 t-body text-[var(--text-primary)]">
        <Info className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
        Estas configurações valem para todos os períodos.
        <span className="t-secondary text-[var(--text-secondary)]">Prioridades e metas ficam na aba Período.</span>
      </p>

      <CardConfiguracao
        icone={<CalendarDays className="h-5 w-5" />}
        titulo="Ritmo de criação"
        descricao={editandoRitmo
          ? 'Ajuste os números e salve. Nada é gravado a cada clique.'
          : 'Capacidade semanal e reserva de conteúdos.'}
        acao={editandoRitmo ? (
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton variant="secondary" size="sm" onClick={cancelarRitmo}>
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={salvarRitmo}
              disabled={reservaInvalida}
              disabledReason={reservaInvalida ? 'A reserva precisa caber no limite semanal.' : undefined}
            >
              Salvar
            </AppButton>
          </div>
        ) : (
          <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={abrirRitmo}>
            Editar
          </AppButton>
        )}
      >
        {editandoRitmo ? (
          <div className="grid gap-6 md:grid-cols-3">
            <CampoStepper
              id="limite-semanal"
              label="Publicações por semana"
              unidade="roteiros"
              hint="Cada roteiro conta uma vez, na publicação original da grade. Reposts e roteiros fora da grade não entram."
              value={ritmo.limite}
              onChange={limite => setRitmo(atual => ({ ...atual, limite }))}
            />
            <div className={divisor}>
              <CampoStepper
                id="reserva-fora-series"
                label="Espaços fora das séries"
                unidade="por semana"
                hint="Para publicidades, ideias e oportunidades. Já incluídos no total semanal."
                value={ritmo.reserva}
                onChange={reserva => setRitmo(atual => ({ ...atual, reserva }))}
                erro={reservaInvalida ? 'A reserva precisa caber no limite semanal.' : undefined}
              />
            </div>
            <div className={divisor}>
              <CampoStepper
                id="reserva-prontos"
                label="Conteúdos prontos de reserva"
                unidade="roteiros"
                hint="Finalizados e sem data de publicação. Exclui os que ainda precisam de edição e os já agendados."
                value={ritmo.prontos}
                onChange={prontos => setRitmo(atual => ({ ...atual, prontos }))}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <ValorDoRitmo
              rotulo="Publicações por semana"
              valor={preferencias.limiteSemanal}
              unidade="roteiros"
              hint="Cada roteiro conta uma vez, na publicação original da grade. Reposts e roteiros fora da grade não entram."
            />
            <div className={divisor}>
              <ValorDoRitmo
                rotulo="Espaços fora das séries"
                valor={preferencias.reservaForaSeriesSemanal}
                unidade="por semana"
                hint="Para publicidades, ideias e oportunidades. Já incluídos no total semanal."
              />
            </div>
            <div className={divisor}>
              <ValorDoRitmo
                rotulo="Conteúdos prontos de reserva"
                valor={preferencias.reservaProntos}
                unidade="roteiros"
                hint="Finalizados e sem data de publicação. Exclui os que ainda precisam de edição e os já agendados."
              />
            </div>
          </div>
        )}
      </CardConfiguracao>

      <div className="grid gap-4 lg:grid-cols-2">
        <CardConfiguracao icone={<Share2 className="h-5 w-5" />} titulo="Redes e calendário">
          <div className="stack-lg">
            <div className="stack-sm">
              <label htmlFor="rede-referencia">
                <Text variant="bodyStrong" as="span">Rede de referência</Text>
              </label>
              <SelectField
                id="rede-referencia"
                block
                value={preferencias.redeReferenciaId ?? ''}
                describedBy="rede-referencia-hint"
                leadingIcon={referenciaAtual ? (
                  <PlatformIcon platform={iconeDaConta(referenciaAtual)} colored className="h-5 w-5" />
                ) : undefined}
                onChange={value => salvarPreferencias({ redeReferenciaId: value || null })}
                options={[
                  { value: '', label: 'Nenhuma' },
                  ...opcoesReferencia.map(platform => ({ value: platform.id, label: rotuloConta(platform) })),
                ]}
              />
              <Text variant="secondary" className="text-[var(--text-secondary)]">
                <span id="rede-referencia-hint">Usada como base para o calendário.</span>
              </Text>
            </div>
            <div className="stack-sm border-t border-[var(--border-color)] pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="bodyStrong" as="h3">Horários de postagem</Text>
                <Badge variant="neutral">{horarios.length === 0 ? 'Não definidos' : 'Definidos'}</Badge>
              </div>
              <Text variant="secondary" className="text-[var(--text-secondary)]">
                {horarios.length === 0
                  ? 'Compartilhados com Contas e horários.'
                  : `${resumoHorarios(horarios, state.platforms)} Compartilhados com Contas e horários.`}
              </Text>
              <AppButton
                variant="secondary"
                className="mt-1 self-start"
                leftIcon={<Clock className="h-4 w-4" />}
                onClick={() => setHorariosAbertos(true)}
              >
                Configurar horários
              </AppButton>
            </div>
          </div>
        </CardConfiguracao>

        <CardConfiguracao icone={<Hash className="h-5 w-5" />} titulo="Hashtags fora das séries">
          <div className="stack-sm">
            <CampoTexto
              id="hashtags-fora-series"
              label="Hashtags padrão"
              rows={5}
              placeholder="#hashtag1 #hashtag2"
              value={preferencias.hashtagsForaSeries}
              onSave={hashtagsForaSeries => {
                if (hashtagsForaSeries === preferencias.hashtagsForaSeries) return;
                salvarPreferencias({ hashtagsForaSeries });
              }}
            />
            <Text variant="secondary" className="text-[var(--text-secondary)]">
              Para conteúdos que não pertencem a uma série.
            </Text>
          </div>
        </CardConfiguracao>
      </div>

      <CardConfiguracao icone={<UserRound className="h-5 w-5" />} titulo="Perfil e rotina">
        <div className="grid gap-6 md:grid-cols-2">
          <CampoTexto
            id="publico-linguagem"
            label="Público, linguagem e assuntos"
            placeholder="Quem você quer alcançar, como se comunica e sobre o que fala…"
            value={preferencias.publicoLinguagem}
            onSave={publicoLinguagem => {
              if (publicoLinguagem === preferencias.publicoLinguagem) return;
              salvarPreferencias({ publicoLinguagem });
            }}
          />
          <div className={divisor}>
            <CampoTexto
              id="disponibilidade"
              label="Dias de produção e compromissos"
              placeholder="Registre os dias disponíveis e os compromissos fixos…"
              value={preferencias.disponibilidade}
              onSave={disponibilidade => {
                if (disponibilidade === preferencias.disponibilidade) return;
                salvarPreferencias({ disponibilidade });
              }}
            />
          </div>
        </div>
      </CardConfiguracao>

      <CardConfiguracao icone={<Settings className="h-5 w-5" />} titulo="Preferências">
        <div className="-mt-2 md:pl-[3.25rem]">
          {opcoes.map((row, index) => (
            <ToggleRow
              key={row.key}
              id={`ajustes-${row.key}`}
              enabled={row.enabled}
              onToggle={row.toggle}
              title={row.title}
              className={cn('gap-4 py-2', index > 0 && 'border-t border-[var(--border-color)]')}
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <Text variant="body" as="span">{row.title}</Text>
                <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">{row.description}</Text>
              </span>
            </ToggleRow>
          ))}
        </div>
      </CardConfiguracao>

      <SidePanel
        open={horariosAbertos}
        onClose={() => setHorariosAbertos(false)}
        title="Horários de postagem"
        subtitle={referenciaAtual
          ? `Preferências atuais de ${rotuloConta(referenciaAtual)}. Salvar atualiza este resumo e a tela Contas e horários.`
          : 'Nenhuma conta está marcada como base. Escolha a conta nas abas antes de alterar o horário dela. Global vale nos dias sem horário próprio.'}
        widthClassName="max-w-3xl"
      >
        <PostingTimesEditor
          contaInicialId={preferencias.redeReferenciaId}
          comecarEditando
          aoSalvar={() => setHorariosAbertos(false)}
        />
      </SidePanel>
    </div>
  );
}
