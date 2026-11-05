import { ValorVazio } from '../../../../components/ui/ValorVazio';
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock, Hash, Pencil, Share2, Target, Undo2, UserRound } from 'lucide-react';
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
import { atualizarPreferencias } from '../../lib/editorialSettings';
import { agendarVigencia, desfazerMudanca, diretrizNoDomingo, domingosParaVigencia, mudancasAgendadas } from '../../lib/vigencias';
import { ProporcaoObjetivosEditor, proporcaoEmTexto, ResumoDaProporcao } from './ProporcaoObjetivosEditor';
import { ContasEFormatosCard } from './ContasEFormatosCard';
import { VariedadeConcentracaoCard } from './VariedadeConcentracaoCard';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes, ValeAPartirDe } from './ValeAPartirDe';

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
  dotColor = '#10b981',
  helper,
}: {
  rotulo: string;
  valor: number | null;
  unidade: string;
  dotColor?: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between transition-all hover:border-[var(--border-strong)]">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Text variant="label" as="span" className="tracking-wider uppercase text-[var(--text-tertiary)] truncate">
            {rotulo}
          </Text>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: valor != null ? dotColor : 'var(--text-tertiary)' }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <Text variant="sectionTitle" as="div" className="tabular-nums text-[var(--text-primary)]">
            {valor == null ? <ValorVazio /> : String(valor)}
          </Text>
          {valor != null ? (
            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
              {unidade}
            </Text>
          ) : null}
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
          {valor == null ? 'Não definido' : helper ?? 'Meta ativa'}
        </Text>
      </div>
    </div>
  );
}

/** Aviso de uma mudança agendada, com o botão de desfazer só aquela parte. */
function MudancaAgendadaAviso({ texto, onDesfazer }: { texto: string; onDesfazer: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
      <Text variant="meta" as="p" className="min-w-[12rem] flex-1 text-[var(--text-primary)]">{texto}</Text>
      <AppButton variant="ghost" size="sm" leftIcon={<Undo2 className="h-4 w-4" />} onClick={onDesfazer}>
        Desfazer
      </AppButton>
    </div>
  );
}

/** Que parte dos ajustes cada aba do Editorial mostra. */
export type SecaoAjustes = 'capacidade' | 'proporcao' | 'contas' | 'avisos' | 'operacional';

/**
 * Aba Ajustes: o que vale para todos os períodos. Não tem seletor de período; o que muda
 * de um período para outro fica na aba Período.
 */
export function AjustesEditorialPanel({ secao = 'capacidade' }: { secao?: SecaoAjustes } = {}) {
  const { state, settings, gravar, salvarPreferencias } = useEditorialPlano();
  const preferencias = settings.preferencias;
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const { estaSemana } = domingosParaVigencia(hoje);
  const [horariosAbertos, setHorariosAbertos] = useState(false);
  const [editandoRitmo, setEditandoRitmo] = useState(false);
  const [editandoProporcao, setEditandoProporcao] = useState(false);
  const [ritmo, setRitmo] = useState<RitmoDraft>(() => ritmoSalvo(preferencias));
  const [desdeRitmo, setDesdeRitmo] = useState(estaSemana);
  const [desdeProporcao, setDesdeProporcao] = useState(estaSemana);
  const reservaInvalida = !reservaCabeNoLimite(ritmo);
  const limiteMudou = ritmo.limite !== textoNumero(preferencias.limiteSemanal);
  const mudancas = mudancasAgendadas(settings, hoje);

  const abrirRitmo = () => {
    setRitmo(ritmoSalvo(preferencias));
    setDesdeRitmo(estaSemana);
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
      // Reserva, prontos e gravações valem já; o limite vale a partir da segunda escolhida.
      let proximo = atualizarPreferencias(settings, {
        reservaForaSeriesSemanal: inteiroOuNull(ritmo.reserva),
        reservaProntos: inteiroOuNull(ritmo.prontos),
        // Zero é "sem limite": não há aviso de gravação.
        limiteGravacoesDia: inteiroOuNull(ritmo.gravacoes) || null,
      });
      if (limiteMudou) {
        proximo = agendarVigencia(proximo, desdeRitmo, {
          limiteSemanal: inteiroOuNull(ritmo.limite),
          proporcaoFuncoes: diretrizNoDomingo(settings, desdeRitmo, hoje).proporcaoFuncoes,
        }, hoje);
      }
      gravar(proximo);
    }
    setEditandoRitmo(false);
  };

  const salvarProporcaoDesde = (proporcao: Parameters<typeof proporcaoEmTexto>[0]) => {
    gravar(agendarVigencia(settings, desdeProporcao, {
      limiteSemanal: diretrizNoDomingo(settings, desdeProporcao, hoje).limiteSemanal,
      proporcaoFuncoes: proporcao,
    }, hoje));
    setEditandoProporcao(false);
  };

  const ativas = state.platforms.filter(platform => platform.ativo);
  const referenciaAtual = state.platforms.find(platform => platform.id === preferencias.redeReferenciaId);
  const opcoesReferencia = referenciaAtual && !ativas.some(platform => platform.id === referenciaAtual.id)
    ? [referenciaAtual, ...ativas]
    : ativas;

  const horarios = state.postingTimeEntries ?? [];

  return (
    <div className="stack-lg">
      {secao === 'capacidade' ? (<>
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
              label="Roteiros por semana"
              unidade="roteiros"
              hint="Cada roteiro conta uma vez, na publicação original. Reposts e roteiros fora das metas não entram. Você escolhe a partir de quando vale."
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
            {limiteMudou ? (
              <div className="md:col-span-2 xl:col-span-4">
                <ValeAPartirDe id="limite-desde" valor={desdeRitmo} onChange={setDesdeRitmo} hoje={hoje} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <ValorDoRitmo
              rotulo="Roteiros por semana"
              valor={preferencias.limiteSemanal}
              unidade="roteiros"
              dotColor="#10b981"
              helper="Total do ciclo semanal"
            />
            <ValorDoRitmo
              rotulo="Espaços fora das séries"
              valor={preferencias.reservaForaSeriesSemanal}
              unidade="por semana"
              dotColor="#3b82f6"
              helper="Ideias e pautas avulsas"
            />
            <ValorDoRitmo
              rotulo="Roteiros de reserva"
              valor={preferencias.reservaProntos}
              unidade="roteiros"
              dotColor="#a855f7"
              helper="Estoque sem data"
            />
            <ValorDoRitmo
              rotulo="Gravações por dia"
              valor={preferencias.limiteGravacoesDia}
              unidade="no máximo"
              dotColor="#ec4899"
              helper="Aviso de sobrecarga diária"
            />
          </div>
        )}
        {!editandoRitmo ? mudancas.filter(mudanca => mudanca.limite).map(mudanca => (
          <MudancaAgendadaAviso
            key={mudanca.vigenteDesde}
            texto={`A partir de dom, ${diaMes(mudanca.vigenteDesde)}: ${mudanca.limite!.para == null ? 'sem limite de publicações' : `${mudanca.limite!.para} roteiros por semana`}.`}
            onDesfazer={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'limite', hoje))}
          />
        )) : null}
      </CardConfiguracao>

      <div id="dias-de-gravacao">
      <CardConfiguracao
        icone={<Clock className="h-5 w-5" />}
        titulo="Avisos do que falta para postar"
        descricao="No dia em que você grava, ou alguns dias antes da postagem, o Calendário e o Hoje listam o que ainda falta no que já está no Calendário."
      >
        <div className="stack-md">
          <div className="stack-xs">
            <Text variant="label" as="p">Dias em que grava</Text>
            <div className="flex flex-wrap gap-2">
              {([
                [1, 'Seg'],
                [2, 'Ter'],
                [3, 'Qua'],
                [4, 'Qui'],
                [5, 'Sex'],
                [6, 'Sáb'],
                [7, 'Dom'],
              ] as const).map(([dia, rotulo]) => {
                const marcado = preferencias.diasGravacao.includes(dia);
                return (
                  <AppButton
                    key={dia}
                    variant={marcado ? 'primary' : 'secondary'}
                    size="xs"
                    onClick={() => {
                      const dias = marcado
                        ? preferencias.diasGravacao.filter(item => item !== dia)
                        : [...preferencias.diasGravacao, dia].sort((a, b) => a - b);
                      gravar(atualizarPreferencias(settings, {diasGravacao: dias}));
                    }}
                  >
                    {rotulo}
                  </AppButton>
                );
              })}
            </div>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Vazio desliga o lote do dia de gravar.
            </Text>
          </div>
          <CampoStepper
            id="antecedencia-postagem"
            label="Dias antes da postagem"
            unidade="dias"
            hint="Avisa nesse prazo e no dia. Vazio desliga a antecedência."
            value={textoNumero(preferencias.antecedenciaPostagemDias)}
            onChange={valor => {
              gravar(atualizarPreferencias(settings, {
                antecedenciaPostagemDias: inteiroOuNull(valor),
              }));
            }}
          />
        </div>
      </CardConfiguracao>
      </div>
      </>) : null}

      {secao === 'proporcao' ? (
      <CardConfiguracao
        icone={<Target className="h-5 w-5" />}
        titulo="Proporção por objetivo"
        descricao="Quanto do limite vai para cada objetivo, em %. A meta de cada período sai daqui. Você escolhe a partir de quando vale; os períodos passados mantêm a proporção que tinham."
        acao={editandoProporcao ? undefined : (
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => {
              setDesdeProporcao(estaSemana);
              setEditandoProporcao(true);
            }}
          >
            {settings.proporcaoFuncoes ? 'Editar proporção' : 'Definir proporção'}
          </AppButton>
        )}
      >
        {editandoProporcao ? (
          <div className="stack-lg">
            <ValeAPartirDe id="proporcao-desde" valor={desdeProporcao} onChange={setDesdeProporcao} hoje={hoje} />
            <ProporcaoObjetivosEditor
              idBase="proporcao-ajustes"
              valor={settings.proporcaoFuncoes}
              onCancelar={() => setEditandoProporcao(false)}
              onSalvar={salvarProporcaoDesde}
            />
          </div>
        ) : (
          <ResumoDaProporcao proporcao={settings.proporcaoFuncoes} />
        )}
        {!editandoProporcao ? mudancas.filter(mudanca => mudanca.proporcao).map(mudanca => (
          <MudancaAgendadaAviso
            key={mudanca.vigenteDesde}
            texto={`A partir de dom, ${diaMes(mudanca.vigenteDesde)}: ${mudanca.proporcao!.para ? proporcaoEmTexto(mudanca.proporcao!.para) : 'sem proporção definida'}.`}
            onDesfazer={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'proporcao', hoje))}
          />
        )) : null}
      </CardConfiguracao>

      ) : null}

      {secao === 'contas' ? (<>
      <ContasEFormatosCard />

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
      </>) : null}

      {secao === 'avisos' ? <VariedadeConcentracaoCard /> : null}

      {secao === 'operacional' ? (
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
      ) : null}

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
