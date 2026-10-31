import { ValorVazio } from '../../../../components/ui/ValorVazio';
import { useState } from 'react';
import { CalendarDays, Clock, Hash, Pencil, Share2, Target, UserRound } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { SidePanel } from '../../../../components/layout/SidePanel';
import { Badge } from '../../../../components/ui/Badge';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Platform, PostingTimeEntry } from '../../../../lib/database';
import { iconeDaConta, rotuloConta } from '../../../contas/lib/contas';
import { PostingTimesEditor } from '../../../settings/components/PostingTimesEditor';
import { CampoStepper, CampoTexto, CardConfiguracao, inteiroOuNull } from './campos';
import { ProporcaoObjetivosEditor, ResumoDaProporcao } from './ProporcaoObjetivosEditor';
import { useEditorialPlano } from './useEditorialPlano';

function resumoHorarios(entries: readonly PostingTimeEntry[], platforms: readonly Platform[]): string {
  const ids = new Set(entries.flatMap(entry => (entry.platformId ? [entry.platformId] : [])));
  const nomes = platforms.filter(platform => ids.has(platform.id)).map(platform => rotuloConta(platform));
  const global = entries.some(entry => !entry.platformId);
  if (nomes.length === 0 && !global) return '';
  if (nomes.length === 0) return 'Todas as contas usam o padrão geral.';
  const amostra = nomes.slice(0, 3).join(', ');
  const resto = nomes.length > 3 ? ` e mais ${nomes.length - 3}` : '';
  const frase = nomes.length === 1
    ? `${amostra} tem horários próprios`
    : `${amostra}${resto} têm horários próprios`;
  return global ? `${frase}. As outras usam o padrão geral.` : `${frase}.`;
}

type RitmoDraft = {
  limite: string;
  reserva: string;
  prontos: string;
  gravacoes: string;
};

function textoNumero(valor: number | null): string {
  return valor == null ? '' : String(valor);
}

function ritmoSalvo(preferencias: {
  limiteSemanal: number | null;
  reservaForaSeriesSemanal: number | null;
  reservaProntos: number | null;
  limiteGravacoesDia: number | null;
}): RitmoDraft {
  return {
    limite: textoNumero(preferencias.limiteSemanal),
    reserva: textoNumero(preferencias.reservaForaSeriesSemanal),
    prontos: textoNumero(preferencias.reservaProntos),
    gravacoes: textoNumero(preferencias.limiteGravacoesDia),
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
}: {
  rotulo: string;
  valor: number | null;
  unidade: string;
}) {
  return (
    <div className="min-w-0 stack-xs">
      <Text variant="bodyStrong" as="p">{rotulo}</Text>
      <Text variant="itemTitle" as="p" className="tabular-nums">{valor == null ? <ValorVazio /> : String(valor)}</Text>
      <Text variant="secondary" as="p">
        {valor == null ? 'Não definido' : unidade}
      </Text>
    </div>
  );
}

/**
 * Aba Ajustes: o que vale para todos os períodos. Não tem seletor de período; o que muda
 * de um período para outro fica na aba Período.
 */
export function AjustesEditorialPanel() {
  const { state, settings, salvarPreferencias, salvarProporcao } = useEditorialPlano();
  const preferencias = settings.preferencias;
  const [horariosAbertos, setHorariosAbertos] = useState(false);
  const [editandoRitmo, setEditandoRitmo] = useState(false);
  const [editandoProporcao, setEditandoProporcao] = useState(false);
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
    const mudou = ritmo.limite !== salvo.limite
      || ritmo.reserva !== salvo.reserva
      || ritmo.prontos !== salvo.prontos
      || ritmo.gravacoes !== salvo.gravacoes;
    if (mudou) {
      salvarPreferencias({
        limiteSemanal: inteiroOuNull(ritmo.limite),
        reservaForaSeriesSemanal: inteiroOuNull(ritmo.reserva),
        reservaProntos: inteiroOuNull(ritmo.prontos),
        // Zero é "sem limite": não há aviso de gravação.
        limiteGravacoesDia: inteiroOuNull(ritmo.gravacoes) || null,
      });
    }
    setEditandoRitmo(false);
  };

  const ativas = state.platforms.filter(platform => platform.ativo);
  const referenciaAtual = state.platforms.find(platform => platform.id === preferencias.redeReferenciaId);
  const opcoesReferencia = referenciaAtual && !ativas.some(platform => platform.id === referenciaAtual.id)
    ? [referenciaAtual, ...ativas]
    : ativas;

  const horarios = state.postingTimeEntries ?? [];

  return (
    <div className="stack-lg">
      <Text variant="secondary" as="p">
        Prioridade e metas de cada semana ficam no Planejamento.
      </Text>

      <CardConfiguracao
        icone={<CalendarDays className="h-5 w-5" />}
        titulo="Ritmo de criação"
        descricao={editandoRitmo
          ? 'Ajuste os números e salve. Nada é gravado a cada clique.'
          : undefined}
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
              disabledReason={reservaInvalida ? 'A reserva cabe dentro do limite semanal.' : undefined}
            >
              Salvar
            </AppButton>
          </div>
        ) : (
          <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={abrirRitmo}>
            Editar ritmo
          </AppButton>
        )}
      >
        {editandoRitmo ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <CampoStepper
              id="limite-semanal"
              label="Publicações por semana"
              unidade="roteiros"
              hint="Cada roteiro conta uma vez, na publicação original. Reposts e roteiros fora das metas não entram. Mudar vale a partir desta semana."
              value={ritmo.limite}
              onChange={limite => setRitmo(atual => ({ ...atual, limite }))}
            />
            <div>
              <CampoStepper
                id="reserva-fora-series"
                label="Espaços fora das séries"
                unidade="por semana"
                hint="Para publicidades, ideias e oportunidades. Já incluídos no total semanal."
                value={ritmo.reserva}
                onChange={reserva => setRitmo(atual => ({ ...atual, reserva }))}
                erro={reservaInvalida ? 'A reserva cabe dentro do limite semanal.' : undefined}
              />
            </div>
            <div>
              <CampoStepper
                id="reserva-prontos"
                label="Roteiros prontos de reserva"
                unidade="roteiros"
                hint="Finalizados e sem data de publicação. Exclui os que ainda precisam de edição e os já agendados."
                value={ritmo.prontos}
                onChange={prontos => setRitmo(atual => ({ ...atual, prontos }))}
              />
            </div>
            <div>
              <CampoStepper
                id="limite-gravacoes-dia"
                label="Gravações por dia"
                unidade="no máximo"
                hint="O Planejamento avisa quando um dia passa disso. Vazio, não há aviso."
                value={ritmo.gravacoes}
                onChange={gravacoes => setRitmo(atual => ({ ...atual, gravacoes }))}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <ValorDoRitmo
              rotulo="Publicações por semana"
              valor={preferencias.limiteSemanal}
              unidade="roteiros"
            />
            <div>
              <ValorDoRitmo
                rotulo="Espaços fora das séries"
                valor={preferencias.reservaForaSeriesSemanal}
                unidade="por semana"
              />
            </div>
            <div>
              <ValorDoRitmo
                rotulo="Roteiros prontos de reserva"
                valor={preferencias.reservaProntos}
                unidade="roteiros"
              />
            </div>
            <div>
              <ValorDoRitmo
                rotulo="Gravações por dia"
                valor={preferencias.limiteGravacoesDia}
                unidade="no máximo"
              />
            </div>
          </div>
        )}
      </CardConfiguracao>

      <CardConfiguracao
        icone={<Target className="h-5 w-5" />}
        titulo="Proporção por objetivo"
        descricao="Quanto do limite vai para cada objetivo, em %. A meta de cada período sai daqui. Mudar vale a partir desta semana; os períodos passados mantêm a proporção que tinham."
        acao={editandoProporcao ? undefined : (
          <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditandoProporcao(true)}>
            {settings.proporcaoFuncoes ? 'Editar proporção' : 'Definir proporção'}
          </AppButton>
        )}
      >
        {editandoProporcao ? (
          <ProporcaoObjetivosEditor
            idBase="proporcao-ajustes"
            valor={settings.proporcaoFuncoes}
            onCancelar={() => setEditandoProporcao(false)}
            onSalvar={proporcao => {
              salvarProporcao(proporcao);
              setEditandoProporcao(false);
            }}
          />
        ) : (
          <ResumoDaProporcao proporcao={settings.proporcaoFuncoes} />
        )}
      </CardConfiguracao>

      <CardConfiguracao icone={<Share2 className="h-5 w-5" />} titulo="Redes e horários">
        <div className="grid-form">
          <div className="stack-sm">
            <label htmlFor="rede-referencia">
              <Text variant="bodyStrong" as="span">Conta de referência</Text>
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
            <Text variant="secondary">
              <span id="rede-referencia-hint">Usada como base para o calendário.</span>
            </Text>
          </div>
          <div className="stack-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="bodyStrong" as="h3">Horários de postagem</Text>
              <Badge variant="neutral">{horarios.length === 0 ? 'Não definidos' : 'Definidos'}</Badge>
            </div>
            {horarios.length > 0 ? (
              <Text variant="secondary">
                {resumoHorarios(horarios, state.platforms)}
              </Text>
            ) : null}
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

      <div className="grid gap-4 lg:grid-cols-2">
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
            <Text variant="secondary">
              Preenche hashtags vazias de roteiros sem série. Não sobrescreve o que já está escrito.
            </Text>
          </div>
        </CardConfiguracao>

        <CardConfiguracao icone={<UserRound className="h-5 w-5" />} titulo="Perfil editorial">
          <div className="stack-lg">
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
            <Text variant="secondary">
              Referência ao escrever e no contexto do assistente. Não altera a grade sozinho.
            </Text>
          </div>
        </CardConfiguracao>
      </div>

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
