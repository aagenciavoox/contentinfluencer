import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Undo2 } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import { ANCORA_FAIXAS } from '../../lib/abasEditorial';
import { atualizarIndicador, atualizarPreferencias } from '../../lib/editorialSettings';
import {
  INDICADORES_DE_PRODUCAO,
  rascunhoDaFaixa,
  textoDaFaixa,
  validarFaixa,
  type ErroDaFaixa,
  type IndicadorDeProducao,
  type RascunhoDaFaixa,
} from '../../lib/indicadoresProducao';
import {
  agendarVigencia,
  desfazerMudanca,
  diretrizNoDomingo,
  domingosParaVigencia,
  mudancasAgendadas,
} from '../../lib/vigencias';
import { CAMPO, CampoStepper, inteiroOuNull } from './campos';
import { EditorialDrawer } from './EditorialDrawer';
import { PausasDoPeriodo } from './PausasDoPeriodo';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes, ValeAPartirDe } from './ValeAPartirDe';

const DIAS_SEMANA = [
  [1, 'Seg'],
  [2, 'Ter'],
  [3, 'Qua'],
  [4, 'Qui'],
  [5, 'Sex'],
  [6, 'Sáb'],
  [7, 'Dom'],
] as const;

const CAMPOS_INDICADOR: Array<{ id: keyof RascunhoDaFaixa; rotulo: string }> = [
  { id: 'minimo', rotulo: 'Mínimo' },
  { id: 'meta', rotulo: 'Meta' },
  { id: 'maximo', rotulo: 'Máximo' },
];

type RitmoCapacidadeDraft = {
  limite: string;
  minimo: string;
  maximo: string;
  reserva: string;
  prontos: string;
  antecedencia: string;
  diasGravacao: number[];
  tetoGravacoesDia: string;
  gravacaoMinimo: string;
  gravacaoMeta: string;
  gravacaoMaximo: string;
  indicadores: Record<IndicadorDeProducao, RascunhoDaFaixa>;
};

type ErrosIndicadores = Partial<Record<IndicadorDeProducao, ErroDaFaixa[]>>;

function textoNumero(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor);
}

function textoMinMax(minimo: number | null | undefined, maximo: number | null | undefined): string | undefined {
  const partes = [
    minimo != null ? `mín. ${minimo}` : null,
    maximo != null ? `máx. ${maximo}` : null,
  ].filter((parte): parte is string => parte != null);
  return partes.length > 0 ? partes.join(' · ') : undefined;
}

function resumoDias(dias: readonly number[]): string {
  if (dias.length === 0) return 'Não definido';
  const mapa = new Map<number, string>(DIAS_SEMANA);
  return [...dias]
    .sort((a, b) => a - b)
    .map(dia => mapa.get(dia))
    .filter((item): item is string => Boolean(item))
    .join(' · ');
}

function ordemDaFaixa(draft: RitmoCapacidadeDraft): string | undefined {
  const limite = inteiroOuNull(draft.limite);
  const minimo = inteiroOuNull(draft.minimo);
  const maximo = inteiroOuNull(draft.maximo);
  if (limite != null && minimo != null && minimo > limite) {
    return 'O mínimo de postagens precisa ser menor ou igual à meta.';
  }
  if (limite != null && maximo != null && maximo < limite) {
    return 'O máximo de postagens precisa ser maior ou igual à meta.';
  }
  const meta = inteiroOuNull(draft.gravacaoMeta);
  if (meta != null && meta > 0) {
    const gravacaoMinimo = inteiroOuNull(draft.gravacaoMinimo);
    const gravacaoMaximo = inteiroOuNull(draft.gravacaoMaximo);
    if (gravacaoMinimo != null && gravacaoMinimo > meta) {
      return 'O mínimo de gravação precisa ser menor ou igual à meta.';
    }
    if (gravacaoMaximo != null && gravacaoMaximo < meta) {
      return 'O máximo de gravação precisa ser maior ou igual à meta.';
    }
  }
  return undefined;
}

function reservaCabeNoLimite(draft: RitmoCapacidadeDraft): boolean {
  const limite = inteiroOuNull(draft.limite);
  const reserva = inteiroOuNull(draft.reserva);
  return !(reserva != null && limite != null && reserva > limite);
}

/**
 * Seção coesa de Ritmo e capacidade: reúne Postagens por semana, Planejamento, Gravação,
 * Ritmo de criação e Pausas em resumo compacto de leitura.
 * "Editar ritmo e capacidade" abre um único drawer agrupado; "Adicionar pausa" abre drawer próprio.
 */
export function RitmoECapacidadeCard() {
  const { settings, gravar } = useEditorialPlano();
  const preferencias = settings.preferencias;
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const { estaSemana } = domingosParaVigencia(hoje);
  const mudancasLimite = mudancasAgendadas(settings, hoje).filter(item => item.limite);

  const salvo = useMemo<RitmoCapacidadeDraft>(() => ({
    limite: textoNumero(preferencias.limiteSemanal),
    minimo: textoNumero(preferencias.minimoSemanal),
    maximo: textoNumero(preferencias.maximoSemanal),
    reserva: textoNumero(preferencias.reservaForaSeriesSemanal),
    prontos: textoNumero(preferencias.reservaProntos),
    antecedencia: textoNumero(preferencias.antecedenciaPostagemDias),
    diasGravacao: [...preferencias.diasGravacao].sort((a, b) => a - b),
    tetoGravacoesDia: textoNumero(preferencias.limiteGravacoesDia),
    gravacaoMinimo: textoNumero(preferencias.gravacaoMinimoSemanal),
    gravacaoMeta: textoNumero(preferencias.gravacaoMetaSemanal),
    gravacaoMaximo: textoNumero(preferencias.gravacaoMaximoSemanal),
    indicadores: Object.fromEntries(
      INDICADORES_DE_PRODUCAO.map(({ id }) => [id, rascunhoDaFaixa(settings.indicadoresProducao?.[id] ?? null)]),
    ) as Record<IndicadorDeProducao, RascunhoDaFaixa>,
  }), [preferencias, settings.indicadoresProducao]);

  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<RitmoCapacidadeDraft>(salvo);
  const [desde, setDesde] = useState(estaSemana);
  const [errosIndicadores, setErrosIndicadores] = useState<ErrosIndicadores>({});

  const faixaMudou = draft.limite !== salvo.limite
    || draft.minimo !== salvo.minimo
    || draft.maximo !== salvo.maximo
    || draft.gravacaoMinimo !== salvo.gravacaoMinimo
    || draft.gravacaoMeta !== salvo.gravacaoMeta
    || draft.gravacaoMaximo !== salvo.gravacaoMaximo;

  const dirty = aberto && (JSON.stringify(draft) !== JSON.stringify(salvo) || (faixaMudou && desde !== estaSemana));

  const reservaInvalida = !reservaCabeNoLimite(draft);
  const ordemInvalida = ordemDaFaixa(draft);
  const gravacaoMetaNum = inteiroOuNull(draft.gravacaoMeta);
  const gravacaoVisivel = gravacaoMetaNum != null && gravacaoMetaNum > 0;

  const validacaoIndicadores = useMemo(() => {
    const erros: ErrosIndicadores = {};
    let temErro = false;
    for (const { id } of INDICADORES_DE_PRODUCAO) {
      const { erros: lista } = validarFaixa(draft.indicadores[id]);
      if (lista.length > 0) {
        erros[id] = lista;
        temErro = true;
      }
    }
    return { erros, temErro };
  }, [draft.indicadores]);

  const podeSalvar = !reservaInvalida && !ordemInvalida && !validacaoIndicadores.temErro;

  const abrir = () => {
    setDraft(salvo);
    setDesde(estaSemana);
    setErrosIndicadores({});
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setDraft(salvo);
    setDesde(estaSemana);
    setErrosIndicadores({});
  };

  const salvar = () => {
    setErrosIndicadores(validacaoIndicadores.erros);
    if (!podeSalvar) return;

    let proximo = atualizarPreferencias(settings, {
      reservaForaSeriesSemanal: inteiroOuNull(draft.reserva),
      reservaProntos: inteiroOuNull(draft.prontos),
      antecedenciaPostagemDias: inteiroOuNull(draft.antecedencia),
      diasGravacao: [...draft.diasGravacao].sort((a, b) => a - b),
      limiteGravacoesDia: inteiroOuNull(draft.tetoGravacoesDia) || null,
    });

    if (faixaMudou) {
      const metaGravacao = inteiroOuNull(draft.gravacaoMeta);
      const gravacaoLigada = metaGravacao != null && metaGravacao > 0;
      proximo = agendarVigencia(proximo, desde, {
        limiteSemanal: inteiroOuNull(draft.limite),
        proporcaoFuncoes: diretrizNoDomingo(settings, desde, hoje).proporcaoFuncoes,
        minimoSemanal: inteiroOuNull(draft.minimo),
        maximoSemanal: inteiroOuNull(draft.maximo),
        gravacaoMinimoSemanal: gravacaoLigada ? inteiroOuNull(draft.gravacaoMinimo) : null,
        gravacaoMetaSemanal: gravacaoLigada ? metaGravacao : null,
        gravacaoMaximoSemanal: gravacaoLigada ? inteiroOuNull(draft.gravacaoMaximo) : null,
      }, hoje);
    }

    for (const { id } of INDICADORES_DE_PRODUCAO) {
      const { faixa } = validarFaixa(draft.indicadores[id]);
      const atual = settings.indicadoresProducao?.[id] ?? null;
      if (JSON.stringify(faixa) !== JSON.stringify(atual)) {
        proximo = atualizarIndicador(proximo, id, faixa);
      }
    }

    gravar(proximo);
    setAberto(false);
  };

  const roteirosRevisados = settings.indicadoresProducao?.roteirosRevisadosSemana ?? null;
  const videosPorDia = settings.indicadoresProducao?.videosPorDiaGravacao ?? null;

  const metaPostagensTexto = textoMinMax(preferencias.minimoSemanal, preferencias.maximoSemanal)
    ?? 'Sem mínimo ou máximo definidos';

  const metaGravacaoPartes = [
    preferencias.limiteGravacoesDia != null ? `Teto de ${preferencias.limiteGravacoesDia} por dia` : null,
    preferencias.antecedenciaPostagemDias != null
      ? (preferencias.antecedenciaPostagemDias === 1 ? '1 dia antes' : `${preferencias.antecedenciaPostagemDias} dias antes`)
      : null,
    preferencias.gravacaoMetaSemanal != null && preferencias.gravacaoMetaSemanal > 0
      ? `Meta ${preferencias.gravacaoMetaSemanal}/sem`
      : null,
  ].filter((parte): parte is string => parte != null);

  const resumoCriacao = !roteirosRevisados && !videosPorDia
    ? 'Roteiros revisados e vídeos por dia: não definidos'
    : [
        `Roteiros revisados: ${roteirosRevisados ? `${textoDaFaixa(roteirosRevisados)}/sem` : 'não definido'}`,
        `Vídeos por dia: ${videosPorDia ? `${textoDaFaixa(videosPorDia)}/dia` : 'não definido'}`,
      ].join(' · ');

  return (
    <div id={ANCORA_FAIXAS} className="scroll-mt-28">
      <Surface padding="lg" className="stack-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="itemTitle" as="h3">Ritmo e capacidade</Text>
          <AppButton variant="secondary" size="sm" onClick={abrir}>
            Editar
          </AppButton>
        </div>

        {/* 3 colunas de destaque */}
        <div className="grid grid-cols-1 gap-4 divide-y divide-[var(--border-subtle)] lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-y-0">
          <div className="stack-xs lg:pr-6">
            <Text variant="eyebrow" as="p" className="text-[var(--text-tertiary)]">
              Postagens por semana
            </Text>
            {preferencias.limiteSemanal != null ? (
              <div className="flex items-baseline gap-2">
                <Text variant="pageTitle" as="span" className="tabular-nums text-[var(--brand-accent-text)]">
                  {preferencias.limiteSemanal}
                </Text>
                <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">
                  por semana
                </Text>
              </div>
            ) : (
              <Text variant="sectionTitle" as="p" className="text-[var(--text-tertiary)]">
                Não definido
              </Text>
            )}
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              {metaPostagensTexto}
            </Text>
          </div>

          <div className="stack-xs pt-4 lg:px-6 lg:pt-0">
            <Text variant="eyebrow" as="p" className="text-[var(--text-tertiary)]">
              Espaços livres
            </Text>
            {preferencias.reservaForaSeriesSemanal != null ? (
              <div className="flex items-baseline gap-2">
                <Text variant="pageTitle" as="span" className="tabular-nums text-[var(--text-primary)]">
                  {preferencias.reservaForaSeriesSemanal}
                </Text>
                <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">
                  fora das séries / semana
                </Text>
              </div>
            ) : (
              <Text variant="sectionTitle" as="p" className="text-[var(--text-tertiary)]">
                Não definido
              </Text>
            )}
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Roteiros de reserva: {preferencias.reservaProntos != null ? `${preferencias.reservaProntos} roteiros` : 'não definido'}
            </Text>
          </div>

          <div className="stack-xs pt-4 lg:pl-6 lg:pt-0">
            <Text variant="eyebrow" as="p" className="text-[var(--text-tertiary)]">
              Gravação
            </Text>
            <Text
              variant="sectionTitle"
              as="p"
              className={preferencias.diasGravacao.length > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}
            >
              {resumoDias(preferencias.diasGravacao)}
            </Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              {metaGravacaoPartes.length > 0 ? metaGravacaoPartes.join(' · ') : 'Sem teto ou antecedência definidos'}
            </Text>
          </div>
        </div>

        {mudancasLimite.map(mudanca => (
          <div
            key={mudanca.vigenteDesde}
            className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2"
          >
            <Text variant="meta" as="p" className="min-w-[12rem] flex-1 text-[var(--text-primary)]">
              A partir de seg., {diaMes(mudanca.vigenteDesde)}: {mudanca.limite!.para == null ? 'sem limite de publicações' : `meta geral de ${mudanca.limite!.para} por semana`}.
            </Text>
            <AppButton
              variant="ghost"
              size="sm"
              leftIcon={<Undo2 className="h-4 w-4" />}
              onClick={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'limite', hoje))}
            >
              Desfazer
            </AppButton>
          </div>
        ))}

        {/* Faixa inferior compacta: Criação + Pausas */}
        <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-4 lg:grid-cols-2 lg:items-center">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <Text variant="bodyStrong" as="span">Criação</Text>
            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
              {resumoCriacao}
            </Text>
          </div>
          <PausasDoPeriodo armazenadas variante="faixa" escopos={['publicacao', 'gravacao', 'producao']} />
        </div>
      </Surface>

      <EditorialDrawer
        open={aberto}
        title="Editar ritmo e capacidade"
        subtitle="Ajuste metas de postagem, planejamento, gravação e ritmo de criação."
        escopoConta="Geral"
        secao="Planejamento"
        dirty={dirty}
        onClose={fechar}
        onSave={salvar}
        canSave={podeSalvar}
        saveDisabledReason={ordemInvalida ?? (reservaInvalida ? 'A reserva cabe dentro da meta semanal.' : validacaoIndicadores.temErro ? 'Confira os campos destacados em Criação.' : undefined)}
        saveLabel="Salvar ritmo"
      >
        <div className="stack-lg">
          {/* 1. Postagens */}
          <section className="stack-md">
            <div className="stack-xs">
              <Text variant="itemTitle" as="h3">Postagens</Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                A conta é por roteiro: um roteiro em três contas conta uma vez.
              </Text>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoStepper
                id="ritmo-limite-semanal"
                label="Meta de postagens"
                unidade="por semana"
                hint="Limita o plano semanal."
                value={draft.limite}
                onChange={limite => setDraft(atual => ({ ...atual, limite }))}
              />
              <CampoStepper
                id="ritmo-minimo-semanal"
                label="Mínimo"
                unidade="por semana"
                hint="Opcional. Abaixo disso, a semana pede mais esforço."
                value={draft.minimo}
                onChange={minimo => setDraft(atual => ({ ...atual, minimo }))}
              />
              <CampoStepper
                id="ritmo-maximo-semanal"
                label="Máximo"
                unidade="por semana"
                hint="Opcional. Vazio, avisa acima da meta. Não bloqueia."
                value={draft.maximo}
                onChange={maximo => setDraft(atual => ({ ...atual, maximo }))}
              />
            </div>
          </section>

          {/* 2. Planejamento */}
          <section className="stack-md border-t border-[var(--border-subtle)] pt-4">
            <Text variant="itemTitle" as="h3">Planejamento</Text>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoStepper
                id="ritmo-reserva-fora-series"
                label="Espaços fora das séries"
                unidade="por semana"
                hint="Para publicidades, ideias e oportunidades. Já entram no teto da semana."
                value={draft.reserva}
                onChange={reserva => setDraft(atual => ({ ...atual, reserva }))}
                erro={reservaInvalida ? 'A reserva cabe dentro da meta semanal.' : undefined}
              />
              <CampoStepper
                id="ritmo-reserva-prontos"
                label="Roteiros prontos de reserva"
                unidade="roteiros"
                hint="Finalizados e sem data de publicação."
                value={draft.prontos}
                onChange={prontos => setDraft(atual => ({ ...atual, prontos }))}
              />
              <CampoStepper
                id="ritmo-antecedencia"
                label="Dias de antecedência"
                unidade="dias"
                hint="Avisa se um vídeo já tem data para sair e ainda falta gravar. Vazio desliga."
                value={draft.antecedencia}
                onChange={antecedencia => setDraft(atual => ({ ...atual, antecedencia }))}
              />
            </div>
          </section>

          {/* 3. Gravação */}
          <section className="stack-md border-t border-[var(--border-subtle)] pt-4">
            <div className="stack-xs">
              <Text variant="itemTitle" as="h3">Gravação</Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Reels, Shorts, vídeo longo e vídeo do TikTok. Sem dia marcado, o lembrete do dia de gravar fica desligado.
              </Text>
            </div>
            <div className="stack-xs">
              <Text variant="bodyStrong" as="p">Dias de gravação</Text>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map(([dia, rotulo]) => {
                  const marcado = draft.diasGravacao.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => {
                        setDraft(atual => ({
                          ...atual,
                          diasGravacao: marcado
                            ? atual.diasGravacao.filter(item => item !== dia)
                            : [...atual.diasGravacao, dia].sort((a, b) => a - b),
                        }));
                      }}
                      className={cn(
                        'min-h-9 min-w-11 rounded-[var(--radius-input)] border px-3 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11',
                        marcado
                          ? 'border-[var(--text-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                          : 'border-[var(--border-input)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                      )}
                    >
                      <Text variant="button" as="span">{rotulo}</Text>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoStepper
                id="ritmo-teto-gravacoes-dia"
                label="Teto de gravações por dia"
                unidade="no máximo"
                hint="Mais do que isso, o dia não comporta. Vazio, não há aviso."
                value={draft.tetoGravacoesDia}
                onChange={tetoGravacoesDia => setDraft(atual => ({ ...atual, tetoGravacoesDia }))}
              />
              <CampoStepper
                id="ritmo-gravacao-meta"
                label="Meta de gravação"
                unidade="por semana"
                hint="Vazio, a faixa de gravação fica escondida."
                value={draft.gravacaoMeta}
                onChange={gravacaoMeta => setDraft(atual => ({ ...atual, gravacaoMeta }))}
              />
              {gravacaoVisivel ? (
                <>
                  <CampoStepper
                    id="ritmo-gravacao-minimo"
                    label="Mínimo de gravação"
                    unidade="por semana"
                    value={draft.gravacaoMinimo}
                    onChange={gravacaoMinimo => setDraft(atual => ({ ...atual, gravacaoMinimo }))}
                  />
                  <CampoStepper
                    id="ritmo-gravacao-maximo"
                    label="Máximo de gravação"
                    unidade="por semana"
                    hint="Opcional. Vazio, avisa acima da meta."
                    value={draft.gravacaoMaximo}
                    onChange={gravacaoMaximo => setDraft(atual => ({ ...atual, gravacaoMaximo }))}
                  />
                </>
              ) : null}
            </div>
          </section>

          {ordemInvalida ? (
            <Text variant="meta" as="p" className="text-[var(--accent-red)]">
              {ordemInvalida}
            </Text>
          ) : null}

          {faixaMudou ? (
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <ValeAPartirDe
                id="ritmo-desde"
                valor={desde}
                onChange={setDesde}
                hoje={hoje}
                aparencia="cartoes"
              />
            </div>
          ) : null}

          {/* 4. Criação */}
          <section className="stack-md border-t border-[var(--border-subtle)] pt-4">
            <div className="stack-xs">
              <Text variant="itemTitle" as="h3">Criação</Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Comece pela meta. Mínimo e máximo são opcionais. Vídeos por dia de gravação é independente do teto por dia.
              </Text>
            </div>
            <div className="stack-md">
              {INDICADORES_DE_PRODUCAO.map(item => {
                const rascunho = draft.indicadores[item.id];
                const errosItem = (errosIndicadores[item.id] ?? validacaoIndicadores.erros[item.id]) ?? [];
                const erroDe = (campo: keyof RascunhoDaFaixa) => errosItem.find(e => e.campo === campo)?.mensagem;
                const temPreenchido = Boolean(
                  rascunho.minimo.trim() || rascunho.meta.trim() || rascunho.maximo.trim(),
                );

                return (
                  <div key={item.id} className="stack-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center">
                        <Text variant="bodyStrong" as="h4">{item.titulo}</Text>
                        <Ajuda rotulo={`Sobre ${item.titulo}`} texto={item.ajuda} />
                      </span>
                      {temPreenchido ? (
                        <AppButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDraft(atual => ({
                              ...atual,
                              indicadores: {
                                ...atual.indicadores,
                                [item.id]: { minimo: '', meta: '', maximo: '' },
                              },
                            }));
                            setErrosIndicadores(atual => ({ ...atual, [item.id]: [] }));
                          }}
                        >
                          Limpar
                        </AppButton>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {CAMPOS_INDICADOR.map(campo => {
                        const campoId = `ritmo-indicador-${item.id}-${campo.id}`;
                        const erro = erroDe(campo.id);
                        return (
                          <label key={campo.id} htmlFor={campoId} className="flex flex-col gap-1">
                            <Text variant="meta" as="span">
                              {campo.rotulo}
                              {campo.id === 'meta' && temPreenchido
                                ? <span className="text-[var(--brand-accent-text)]"> *</span>
                                : null}
                            </Text>
                            <input
                              id={campoId}
                              type="text"
                              inputMode="numeric"
                              className={CAMPO}
                              value={rascunho[campo.id]}
                              aria-invalid={erro ? true : undefined}
                              aria-describedby={erro ? `${campoId}-erro` : undefined}
                              style={erro ? { borderColor: 'var(--danger)' } : undefined}
                              onChange={event => {
                                const valor = event.target.value.slice(0, 4);
                                setDraft(atual => ({
                                  ...atual,
                                  indicadores: {
                                    ...atual.indicadores,
                                    [item.id]: { ...atual.indicadores[item.id], [campo.id]: valor },
                                  },
                                }));
                                if (errosIndicadores[item.id]?.length) {
                                  setErrosIndicadores(atual => ({ ...atual, [item.id]: [] }));
                                }
                              }}
                            />
                            {erro ? (
                              <Text id={`${campoId}-erro`} variant="meta" as="span" className="text-[var(--accent-red)]">
                                {erro}
                              </Text>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </EditorialDrawer>
    </div>
  );
}
