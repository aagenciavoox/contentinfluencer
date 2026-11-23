import type { Content, Platform } from '../../../lib/database.ts';
import { redeDaConta } from '../../contas/lib/contas.ts';
import type { AvisoCiente, PreferenciasGerais, TipoDeAvisoCiente, VigenciaEditorial } from './editorialSettings.ts';
import { avaliarFaixa, type FaixaDoIndicador, type LeituraDaFaixa } from './indicadoresProducao.ts';
import { metaDoPeriodo } from './metaDoPeriodo.ts';
import { avisoDaSomaDeFormatos, limiteEfetivoDaConta, linhaDaContaEm, metaDaContaHoje, type MetaDaContaVigencia } from './metasPorConta.ts';
import { diasDePausa, type PausaEditorial } from './pausas.ts';
import { semanaDe } from './periodoEditorial.ts';
import { formatoDaPublicacao, grupoDoFormato, rotuloDoFormato } from './publicacoes.ts';
import { periodoVigente, vigenciaNaSemana } from './vigencias.ts';

/**
 * Faixas de postagem e de gravação.
 * Geral: esforço por roteiro (um roteiro em três contas conta uma vez).
 * Conta e formato: por publicação.
 * Stories não entram. Meta de gravação vazia esconde a faixa.
 * Máximo vazio avisa acima da meta. Nada bloqueia.
 */

type Intervalo = { inicio: string; fim: string };

export type LadoDaFaixa = {
  minimo: number | null;
  meta: number | null;
  maximo: number | null;
};

export function faixaVisivel(lado: LadoDaFaixa | null | undefined): FaixaDoIndicador | null {
  const meta = lado?.meta;
  if (meta == null || meta <= 0) return null;
  const minimo = lado?.minimo ?? null;
  const maximo = lado?.maximo ?? null;
  return {
    meta,
    minimo: minimo != null && minimo <= meta ? minimo : null,
    maximo: maximo != null && maximo >= meta ? maximo : null,
  };
}

/** Meta de gravação vazia esconde a faixa, mesmo com mínimo ou máximo preenchidos. */
export function faixaDeGravacao(fonte: {
  gravacaoMinimoSemanal?: number | null;
  gravacaoMetaSemanal?: number | null;
  gravacaoMaximoSemanal?: number | null;
} | null | undefined): FaixaDoIndicador | null {
  return faixaVisivel({
    minimo: fonte?.gravacaoMinimoSemanal ?? null,
    meta: fonte?.gravacaoMetaSemanal ?? null,
    maximo: fonte?.gravacaoMaximoSemanal ?? null,
  });
}

export function faixaDePostagem(fonte: {
  minimoSemanal?: number | null;
  limiteSemanal?: number | null;
  maximoSemanal?: number | null;
} | null | undefined): FaixaDoIndicador | null {
  if (fonte?.limiteSemanal == null) return null;
  return faixaVisivel({
    minimo: fonte.minimoSemanal ?? null,
    meta: fonte.limiteSemanal,
    maximo: fonte.maximoSemanal ?? null,
  });
}

function fonteDaSemana(
  preferencias: PreferenciasGerais,
  vigencias: readonly VigenciaEditorial[] | null | undefined,
  inicioSemana: string,
  vigente: boolean,
  hoje: string,
): VigenciaEditorial | PreferenciasGerais {
  if (!vigente) {
    return vigenciaNaSemana(vigencias, inicioSemana) ?? preferencias;
  }
  const estaSemana = semanaDe(hoje).inicio;
  if (inicioSemana > estaSemana) {
    const vale = vigenciaNaSemana(vigencias, inicioSemana);
    if (vale && vale.vigenteDesde > estaSemana) return vale;
  }
  return preferencias;
}

function numeroDaFonte(
  fonte: VigenciaEditorial | PreferenciasGerais,
  chave: 'minimoSemanal' | 'limiteSemanal' | 'maximoSemanal' | 'gravacaoMinimoSemanal' | 'gravacaoMetaSemanal' | 'gravacaoMaximoSemanal',
): number | null {
  const valor = fonte[chave];
  return typeof valor === 'number' ? valor : null;
}

function escalar(
  periodo: Intervalo,
  hoje: string,
  diasPausados: readonly string[],
  valorDaSemana: (inicioSemana: string) => number | null,
): number | null {
  return metaDoPeriodo({
    periodo,
    limiteSemanal: null,
    hoje,
    diasPausados,
    limiteDaSemana: valorDaSemana,
  }).calculada;
}

function ladoEscalado(
  periodo: Intervalo,
  hoje: string,
  diasPausados: readonly string[],
  valorDaSemana: (inicioSemana: string, chave: 'minimoSemanal' | 'limiteSemanal' | 'maximoSemanal' | 'gravacaoMinimoSemanal' | 'gravacaoMetaSemanal' | 'gravacaoMaximoSemanal') => number | null,
  chaves: {
    minimo: 'minimoSemanal' | 'gravacaoMinimoSemanal';
    meta: 'limiteSemanal' | 'gravacaoMetaSemanal';
    maximo: 'maximoSemanal' | 'gravacaoMaximoSemanal';
  },
): LadoDaFaixa {
  return {
    minimo: escalar(periodo, hoje, diasPausados, inicio => valorDaSemana(inicio, chaves.minimo)),
    meta: escalar(periodo, hoje, diasPausados, inicio => valorDaSemana(inicio, chaves.meta)),
    maximo: escalar(periodo, hoje, diasPausados, inicio => valorDaSemana(inicio, chaves.maximo)),
  };
}

type Ocorrencia = { contentId: string; data: string; formato: string; platformId: string | null };

function ocorrencias(contents: readonly Content[], platforms: readonly Platform[]): Ocorrencia[] {
  const contas = new Map(platforms.map(conta => [conta.id, conta]));
  const lista: Ocorrencia[] = [];
  for (const content of contents) {
    if (content.deletedAt || content.archivedAt) continue;
    const pubs = content.plataformas ?? [];
    if (pubs.length === 0) {
      const data = content.publishDate?.slice(0, 10);
      if (!data) continue;
      lista.push({ contentId: content.id, data, formato: formatoDaPublicacao(content, null), platformId: null });
      continue;
    }
    for (const pub of pubs) {
      const data = (pub.publishDate ?? content.publishDate)?.slice(0, 10);
      if (!data) continue;
      const rede = redeDaConta(contas.get(pub.platformId) ?? null);
      lista.push({
        contentId: content.id,
        data,
        formato: formatoDaPublicacao(content, rede, pub),
        platformId: pub.platformId,
      });
    }
  }
  return lista;
}

function noTrecho(data: string, intervalo: Intervalo): boolean {
  return data >= intervalo.inicio && data <= intervalo.fim;
}

function roteirosNoTrecho(lista: readonly Ocorrencia[], intervalo: Intervalo, grupo: 'gravacao' | 'producao' | 'qualquer'): number {
  const ids = new Set<string>();
  for (const item of lista) {
    if (!noTrecho(item.data, intervalo)) continue;
    const grupoItem = grupoDoFormato(item.formato);
    if (!grupoItem) continue;
    if (grupo !== 'qualquer' && grupoItem !== grupo) continue;
    ids.add(item.contentId);
  }
  return ids.size;
}

function publicacoesNoTrecho(
  lista: readonly Ocorrencia[],
  intervalo: Intervalo,
  platformId: string,
  formato?: string,
): number {
  return lista.filter(item => (
    item.platformId === platformId
    && noTrecho(item.data, intervalo)
    && grupoDoFormato(item.formato) != null
    && (formato == null || item.formato === formato)
  )).length;
}

export type LinhaDeFaixa = {
  id: string;
  rotulo: string;
  valor: number;
  faixa: FaixaDoIndicador | null;
  leitura: LeituraDaFaixa | null;
  secao: 'producao' | 'contas';
};

export type ContaNasFaixas = {
  id: string;
  nome: string;
  total: LinhaDeFaixa | null;
  gravacao: LinhaDeFaixa[];
  producao: LinhaDeFaixa[];
};

export type FaixasNoPeriodo = {
  gerais: LinhaDeFaixa[];
  contas: ContaNasFaixas[];
};

function leituraDe(valor: number, faixa: FaixaDoIndicador | null): LeituraDaFaixa | null {
  return faixa ? avaliarFaixa(valor, faixa) : null;
}

function faixaDoLado(lado: LadoDaFaixa): FaixaDoIndicador | null {
  if (lado.meta == null) return null;
  if (lado.meta <= 0) {
    return { meta: lado.meta, minimo: lado.minimo != null && lado.minimo <= lado.meta ? lado.minimo : null, maximo: lado.maximo != null && lado.maximo >= lado.meta ? lado.maximo : null };
  }
  return faixaVisivel(lado);
}

function linha(id: string, rotulo: string, valor: number, lado: LadoDaFaixa, secao: LinhaDeFaixa['secao']): LinhaDeFaixa | null {
  const faixa = faixaDoLado(lado);
  if (!faixa && valor === 0) return null;
  return { id, rotulo, valor, faixa, leitura: leituraDe(valor, faixa), secao };
}

/**
 * Faixas do trecho da Saúde. A semana vira dias do período, menos as pausas, com a vigência de cada semana.
 */
export function faixasNoPeriodo(input: {
  contents: readonly Content[];
  platforms: readonly Platform[];
  preferencias: PreferenciasGerais;
  vigencias?: readonly VigenciaEditorial[] | null;
  metasDasContas?: readonly MetaDaContaVigencia[];
  pausas?: readonly PausaEditorial[];
  periodo: Intervalo;
  hoje: string;
  nomes?: ReadonlyMap<string, string>;
}): FaixasNoPeriodo {
  const pausas = input.pausas ?? [];
  const vigente = periodoVigente(input.periodo, input.hoje);
  const lista = ocorrencias(input.contents, input.platforms);
  const valor = (
    inicio: string,
    chave: 'minimoSemanal' | 'limiteSemanal' | 'maximoSemanal' | 'gravacaoMinimoSemanal' | 'gravacaoMetaSemanal' | 'gravacaoMaximoSemanal',
  ) => numeroDaFonte(fonteDaSemana(input.preferencias, input.vigencias, inicio, vigente, input.hoje), chave);

  const postagem = ladoEscalado(input.periodo, input.hoje, diasDePausa(pausas, { tipo: 'publicacao' }, input.periodo), valor, {
    minimo: 'minimoSemanal',
    meta: 'limiteSemanal',
    maximo: 'maximoSemanal',
  });
  const gravacao = ladoEscalado(input.periodo, input.hoje, diasDePausa(pausas, { tipo: 'gravacao' }, input.periodo), valor, {
    minimo: 'gravacaoMinimoSemanal',
    meta: 'gravacaoMetaSemanal',
    maximo: 'gravacaoMaximoSemanal',
  });
  const gerais: LinhaDeFaixa[] = [];
  const postagemLinha = postagem.meta == null ? null : linha('geral-postagem', 'Postagem', roteirosNoTrecho(lista, input.periodo, 'qualquer'), postagem, 'producao');
  if (postagemLinha) gerais.push(postagemLinha);
  const gravacaoLinha = faixaVisivel(gravacao)
    ? linha('geral-gravacao', 'Gravação', roteirosNoTrecho(lista, input.periodo, 'gravacao'), gravacao, 'producao')
    : null;
  if (gravacaoLinha) gerais.push(gravacaoLinha);

  const contas: ContaNasFaixas[] = [];
  for (const conta of input.platforms.filter(item => item.ativo)) {
    const linhasDaConta = (input.metasDasContas ?? []).filter(item => item.platformId === conta.id);
    const linhaNaSemana = (inicio: string) => {
      if (!vigente) return linhaDaContaEm(linhasDaConta, inicio);
      const estaSemana = semanaDe(input.hoje).inicio;
      if (inicio > estaSemana) {
        const agendada = linhaDaContaEm(linhasDaConta, inicio);
        if (agendada && agendada.vigenteDesde > estaSemana) return agendada;
      }
      return linhaDaContaEm(linhasDaConta, estaSemana);
    };
    const meta = metaDaContaHoje(input.metasDasContas ?? [], conta.id, input.hoje);
    const pausaConta = diasDePausa(pausas, { tipo: 'conta', platformId: conta.id }, input.periodo);
    const totalLado: LadoDaFaixa = {
      minimo: escalar(input.periodo, input.hoje, pausaConta, inicio => linhaNaSemana(inicio)?.minimoSemanal ?? null),
      meta: escalar(input.periodo, input.hoje, pausaConta, inicio => limiteEfetivoDaConta(linhaNaSemana(inicio))),
      maximo: escalar(input.periodo, input.hoje, pausaConta, inicio => linhaNaSemana(inicio)?.maximoSemanal ?? null),
    };
    const formatos = new Set<string>([
      ...Object.keys(meta?.parcelasFormato ?? {}),
      ...Object.keys(meta?.faixasFormato ?? {}),
      ...lista.filter(item => item.platformId === conta.id && grupoDoFormato(item.formato)).map(item => item.formato),
    ]);
    const montarGrupo = (grupo: 'gravacao' | 'producao') => {
      const pausa = [...new Set([
        ...pausaConta,
        ...diasDePausa(pausas, { tipo: grupo }, input.periodo),
      ])];
      return [...formatos]
        .filter(formato => grupoDoFormato(formato) === grupo)
        .flatMap(formato => {
          const lado: LadoDaFaixa = {
            minimo: escalar(input.periodo, input.hoje, pausa, inicio => linhaNaSemana(inicio)?.faixasFormato?.[formato]?.minimo ?? null),
            meta: escalar(input.periodo, input.hoje, pausa, inicio => linhaNaSemana(inicio)?.parcelasFormato?.[formato] ?? null),
            maximo: escalar(input.periodo, input.hoje, pausa, inicio => linhaNaSemana(inicio)?.faixasFormato?.[formato]?.maximo ?? null),
          };
          const valorContado = publicacoesNoTrecho(lista, input.periodo, conta.id, formato);
          const pronta = linha(`${conta.id}:${formato}`, rotuloDoFormato(formato, redeDaConta(conta)), valorContado, lado, 'contas');
          return pronta ? [pronta] : [];
        });
    };
    const gravacaoConta = montarGrupo('gravacao');
    const producaoConta = montarGrupo('producao');
    const total = totalLado.meta == null ? null : linha(`${conta.id}:total`, 'Total', publicacoesNoTrecho(lista, input.periodo, conta.id), totalLado, 'contas');
    if (!total && gravacaoConta.length === 0 && producaoConta.length === 0) continue;
    contas.push({
      id: conta.id,
      nome: input.nomes?.get(conta.id) ?? conta.nome,
      total,
      gravacao: gravacaoConta,
      producao: producaoConta,
    });
  }
  return { gerais, contas };
}

export type AvisoDeFaixa = {
  id: string;
  lado: 'abaixo' | 'acima' | 'config';
  texto: string;
  contentIds: string[];
  intervalo: Intervalo;
  ciente?: { tipo: TipoDeAvisoCiente; platformId: string | null; formato: string | null };
};

function textoDoLado(nome: string, valor: number, leitura: LeituraDaFaixa, faixa: FaixaDoIndicador): string {
  if (leitura.aviso === 'abaixo') {
    const ref = leitura.referencia === 'minimo' ? `o mínimo é ${faixa.minimo}` : `a meta é ${faixa.meta}`;
    return `${nome}: ${valor} nesta semana, abaixo do esforço. ${ref}.`;
  }
  const ref = leitura.referencia === 'maximo' ? `o máximo é ${faixa.maximo}` : `a meta é ${faixa.meta}`;
  return `${nome}: ${valor} nesta semana, acima do que cabe. ${ref}.`;
}

function avisoDoLado(
  id: string,
  nome: string,
  valor: number,
  lado: LadoDaFaixa,
  intervalo: Intervalo,
  ciente: AvisoDeFaixa['ciente'],
  exigirMetaPositiva = false,
): AvisoDeFaixa | null {
  const faixa = exigirMetaPositiva ? faixaVisivel(lado) : faixaDePostagem({ limiteSemanal: lado.meta, minimoSemanal: lado.minimo, maximoSemanal: lado.maximo });
  if (!faixa) return null;
  const leitura = avaliarFaixa(valor, faixa);
  if (!leitura.aviso) return null;
  return {
    id,
    lado: leitura.aviso,
    texto: textoDoLado(nome, valor, leitura, faixa),
    contentIds: [],
    intervalo,
    ciente: ciente ? { ...ciente, tipo: leitura.aviso === 'abaixo' ? cienteAbaixo(ciente.tipo) : ciente.tipo } : undefined,
  };
}

function cienteAbaixo(tipo: TipoDeAvisoCiente): TipoDeAvisoCiente {
  if (tipo.endsWith('-acima')) return tipo.replace(/-acima$/, '-abaixo') as TipoDeAvisoCiente;
  return tipo;
}

/** Avisos da semana corrente: faixa geral, de cada conta e de cada formato. Mais os de configuração, que não bloqueiam. */
export function avisosDasFaixas(input: {
  contents: readonly Content[];
  platforms: readonly Platform[];
  preferencias: PreferenciasGerais;
  vigencias?: readonly VigenciaEditorial[] | null;
  metasDasContas?: readonly MetaDaContaVigencia[];
  hoje: string;
}): AvisoDeFaixa[] {
  const semana = semanaDe(input.hoje);
  const fonte = fonteDaSemana(input.preferencias, input.vigencias, semana.inicio, true, input.hoje);
  const lista = ocorrencias(input.contents, input.platforms);
  const avisos: AvisoDeFaixa[] = [];
  const postagem = avisoDoLado(
    'faixa:postagem',
    'Postagem',
    roteirosNoTrecho(lista, semana, 'qualquer'),
    { minimo: numeroDaFonte(fonte, 'minimoSemanal'), meta: numeroDaFonte(fonte, 'limiteSemanal'), maximo: numeroDaFonte(fonte, 'maximoSemanal') },
    semana,
    { tipo: 'postagem-acima', platformId: null, formato: null },
  );
  if (postagem) avisos.push(postagem);
  const gravacaoLado = {
    minimo: numeroDaFonte(fonte, 'gravacaoMinimoSemanal'),
    meta: numeroDaFonte(fonte, 'gravacaoMetaSemanal'),
    maximo: numeroDaFonte(fonte, 'gravacaoMaximoSemanal'),
  };
  if (faixaVisivel(gravacaoLado)) {
    const gravacao = avisoDoLado(
      'faixa:gravacao',
      'Gravação',
      roteirosNoTrecho(lista, semana, 'gravacao'),
      gravacaoLado,
      semana,
      { tipo: 'gravacao-acima', platformId: null, formato: null },
      true,
    );
    if (gravacao) avisos.push(gravacao);
  }

  const tetoGravacao = faixaDeGravacao(fonte);
  const tetoCamera = tetoGravacao ? (tetoGravacao.maximo ?? tetoGravacao.meta) : null;
  for (const conta of input.platforms) {
    const meta = metaDaContaHoje(input.metasDasContas ?? [], conta.id, input.hoje);
    if (!meta) continue;
    const nome = conta.nome;
    const soma = avisoDaSomaDeFormatos(meta);
    if (soma) {
      avisos.push({
        id: `faixa:config:${conta.id}`,
        lado: 'config',
        texto: `${nome}: ${soma} Dá para salvar assim.`,
        contentIds: [],
        intervalo: semana,
      });
    }
    const total = limiteEfetivoDaConta(meta);
    const daConta = avisoDoLado(
      `faixa:conta:${conta.id}`,
      nome,
      publicacoesNoTrecho(lista, semana, conta.id),
      { minimo: meta.minimoSemanal ?? null, meta: total, maximo: meta.maximoSemanal ?? null },
      semana,
      { tipo: 'conta-acima', platformId: conta.id, formato: null },
    );
    if (daConta) avisos.push(daConta);
    const formatos = new Set([...Object.keys(meta.parcelasFormato ?? {}), ...Object.keys(meta.faixasFormato ?? {})]);
    for (const formato of formatos) {
      if (!grupoDoFormato(formato)) continue;
      const pedido = meta.parcelasFormato?.[formato] ?? null;
      const extremos = meta.faixasFormato?.[formato];
      const rotulo = `${nome} · ${rotuloDoFormato(formato, redeDaConta(conta))}`;
      const doFormato = avisoDoLado(
        `faixa:formato:${conta.id}:${formato}`,
        rotulo,
        publicacoesNoTrecho(lista, semana, conta.id, formato),
        { minimo: extremos?.minimo ?? null, meta: pedido, maximo: extremos?.maximo ?? null },
        semana,
        { tipo: grupoDoFormato(formato) === 'producao' ? 'producao-acima' : 'formato-acima', platformId: conta.id, formato },
      );
      if (doFormato) avisos.push(doFormato);
      if (tetoCamera != null && grupoDoFormato(formato) === 'gravacao' && pedido != null && pedido > tetoCamera) {
        avisos.push({
          id: `faixa:config-camera:${conta.id}:${formato}`,
          lado: 'config',
          texto: `${rotulo} pede ${pedido} por semana e a gravação geral cabe em ${tetoCamera}.`,
          contentIds: [],
          intervalo: semana,
        });
      }
    }
  }
  return avisos;
}

export function cienteDaSemana(
  hoje: string,
  tipo: TipoDeAvisoCiente,
  platformId: string | null = null,
  formato: string | null = null,
  nota = '',
): AvisoCiente {
  return { semanaInicio: semanaDe(hoje).inicio, tipo, platformId, formato, nota };
}

export function mesmoCiente(a: Pick<AvisoCiente, 'semanaInicio' | 'tipo' | 'platformId' | 'formato'>, b: Pick<AvisoCiente, 'semanaInicio' | 'tipo' | 'platformId' | 'formato'>): boolean {
  return a.semanaInicio === b.semanaInicio
    && a.tipo === b.tipo
    && (a.platformId ?? '') === (b.platformId ?? '')
    && (a.formato ?? '') === (b.formato ?? '');
}

export function cienteReconhecido(
  cientes: readonly AvisoCiente[] | null | undefined,
  pedido: { tipo: TipoDeAvisoCiente; platformId: string | null; formato: string | null },
  hoje: string,
): boolean {
  const segunda = semanaDe(hoje).inicio;
  return (cientes ?? []).some(item => mesmoCiente(item, { semanaInicio: segunda, ...pedido }));
}
