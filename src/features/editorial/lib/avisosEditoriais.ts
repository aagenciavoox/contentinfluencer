import type { TipoAvisoOrientacao } from '../../planejamento/lib/orientacaoEditorial.ts';

/**
 * Avisos que a pessoa liga e desliga em Editorial › Avisos.
 * Todos começam ligados: sem nada gravado, o app avisa como antes.
 * `distancia` e `dias-seguidos` são as linhas da Continuidade na Saúde
 * ("N dias sem episódio" e "Episódios em dias seguidos").
 */
export type TipoAvisoConfiguravel = TipoAvisoOrientacao | 'distancia' | 'dias-seguidos';

/** Chave do limite da saturação de quadro, guardada no mesmo jsonb dos avisos (sem coluna nova). */
export const CHAVE_LIMITE_SATURACAO = 'saturacao-quadro-limite';

/** Quantas vezes o mesmo quadro pode aparecer na semana antes do aviso. */
export type LimiteSaturacaoQuadro = 1 | 2;

export const LIMITE_SATURACAO_PADRAO: LimiteSaturacaoQuadro = 2;

/** Só guarda o que foi mudado. Chave ausente é aviso ligado; sem limite gravado, vale o padrão (2). */
export type AvisosLigados = Partial<Record<TipoAvisoConfiguravel, boolean>> & {
  [CHAVE_LIMITE_SATURACAO]?: LimiteSaturacaoQuadro;
};

export type GrupoDeAvisos = {
  id: string;
  titulo: string;
  avisos: ReadonlyArray<{ tipo: TipoAvisoConfiguravel; titulo: string; descricao: string }>;
};

export const GRUPOS_DE_AVISOS: readonly GrupoDeAvisos[] = [
  {
    id: 'capacidade',
    titulo: 'Publicação e produção',
    avisos: [
      { tipo: 'vespera-sem-pronto', titulo: 'Vídeo por gravar', descricao: 'Me avise quando a data de publicar estiver chegando e ainda faltar gravar.' },
      { tipo: 'capacidade-semana', titulo: 'Capacidade da semana', descricao: 'Me avise quando a semana pedir mais roteiros do que cabem nos dias de gravação.' },
      { tipo: 'gravacoes-no-dia', titulo: 'Gravações demais no dia', descricao: 'Me avise quando um dia passar do teto de gravações.' },
      { tipo: 'videos-dia-abaixo', titulo: 'Poucos vídeos no dia', descricao: 'Me avise quando um dia de gravação ficar abaixo do mínimo. Sem mínimo, uso a meta.' },
      { tipo: 'videos-dia-acima', titulo: 'Vídeos demais no dia', descricao: 'Me avise quando um dia de gravação passar do máximo. Sem máximo, uso a meta.' },
    ],
  },
  {
    id: 'continuidade',
    titulo: 'Continuidade',
    avisos: [
      { tipo: 'serie-abaixo', titulo: 'Frequência abaixo da meta', descricao: 'Me avise quando os episódios estiverem saindo num ritmo menor do que planejei.' },
      { tipo: 'serie-acima', titulo: 'Frequência acima da meta', descricao: 'Me avise quando os episódios passarem do ritmo que planejei.' },
      { tipo: 'serie-reservada', titulo: 'Meta só com post-it', descricao: 'Me avise quando a meta só fechar com um post-it que ainda não virou roteiro.' },
      { tipo: 'ausencia-12-dias', titulo: 'Sem aparição em 12 dias', descricao: 'Me avise quando uma série acompanhada não aparecer nos próximos 12 dias.' },
      { tipo: 'ausencia-mes', titulo: 'Sem aparição no mês', descricao: 'Me avise quando, perto do fim do mês, uma série acompanhada ainda não tiver aparecido.' },
      { tipo: 'distancia', titulo: 'Intervalo sem episódio', descricao: 'Me avise quando passar do intervalo que escolhi entre episódios.' },
      { tipo: 'dias-seguidos', titulo: 'Episódios em dias seguidos', descricao: 'Me avise quando episódios do mesmo quadro ou série ficarem em dias seguidos.' },
    ],
  },
  {
    id: 'assuntos',
    titulo: 'Distribuição de conteúdo',
    avisos: [
      { tipo: 'obra-repetida', titulo: 'Obra repetida', descricao: 'Me avise quando a mesma obra aparecer várias vezes em poucos dias.' },
      { tipo: 'tema-concentrado', titulo: 'Assunto concentrado', descricao: 'Me avise quando um assunto ocupar grande parte do período.' },
      { tipo: 'saturacao-quadro', titulo: 'Mesmo quadro na semana', descricao: 'Me avise quando o mesmo quadro passar do limite na semana.' },
    ],
  },
];

export const TIPOS_AVISO_CONFIGURAVEIS: readonly TipoAvisoConfiguravel[] = GRUPOS_DE_AVISOS.flatMap(grupo => grupo.avisos.map(aviso => aviso.tipo));

const TIPOS = new Set<string>(TIPOS_AVISO_CONFIGURAVEIS);

export function avisoLigado(avisos: AvisosLigados | null | undefined, tipo: TipoAvisoConfiguravel): boolean {
  return avisos?.[tipo] !== false;
}

/** Lê o jsonb gravado. Valor desconhecido ou quebrado é ignorado (o aviso fica ligado). */
export function lerAvisosLigados(value: unknown): AvisosLigados {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const lidos: AvisosLigados = {};
  for (const [chave, ligado] of Object.entries(value as Record<string, unknown>)) {
    if (TIPOS.has(chave) && typeof ligado === 'boolean') lidos[chave as TipoAvisoConfiguravel] = ligado;
    if (chave === CHAVE_LIMITE_SATURACAO && (ligado === 1 || ligado === 2)) lidos[CHAVE_LIMITE_SATURACAO] = ligado;
  }
  return lidos;
}

/** Limite da saturação de quadro: 1 ou 2 por semana. Sem nada gravado, 2. */
export function limiteSaturacaoQuadro(avisos: AvisosLigados | null | undefined): LimiteSaturacaoQuadro {
  const valor = avisos?.[CHAVE_LIMITE_SATURACAO];
  return valor === 1 || valor === 2 ? valor : LIMITE_SATURACAO_PADRAO;
}

/** Tira da lista os avisos desligados. */
export function semAvisosDesligados<T extends { tipo: string }>(lista: readonly T[], avisos: AvisosLigados | null | undefined): T[] {
  if (!avisos) return [...lista];
  return lista.filter(aviso => !TIPOS.has(aviso.tipo) || avisoLigado(avisos, aviso.tipo as TipoAvisoConfiguravel));
}

type LinhaComRegras = {
  distancias?: readonly unknown[];
  diasSeguidos?: readonly unknown[];
  abaixo: readonly unknown[];
  reservadas: readonly unknown[];
  concentrada: boolean;
  precisaAtencao: boolean;
};

/** Linhas da Continuidade sem "dias sem episódio" e "dias seguidos" quando desligados. */
export function linhasSemRegrasDesligadas<L extends LinhaComRegras>(linhas: readonly L[], avisos: AvisosLigados | null | undefined): L[] {
  const semDistancia = !avisoLigado(avisos, 'distancia');
  const semSeguidos = !avisoLigado(avisos, 'dias-seguidos');
  if (!semDistancia && !semSeguidos) return [...linhas];
  return linhas.map(linha => {
    const distancias = semDistancia ? [] : linha.distancias ?? [];
    const diasSeguidos = semSeguidos ? [] : linha.diasSeguidos ?? [];
    return {
      ...linha,
      distancias,
      diasSeguidos,
      // Só desliga a atenção que vinha das regras desligadas; o resto da linha fica como estava.
      precisaAtencao: linha.precisaAtencao && (linha.abaixo.length > 0 || linha.concentrada || linha.reservadas.length > 0
        || distancias.length > 0 || diasSeguidos.length > 0),
    };
  });
}
