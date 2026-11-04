import { useAppContext } from '../../../../context/AppContext';
import {
  atualizarPreferencias,
  atualizarProporcao,
  upsertDecisaoPeriodo,
  type DecisaoPeriodo,
  type EditorialSettings,
  type PreferenciasGerais,
} from '../../lib/editorialSettings';
import { decisaoDoPeriodo } from '../../lib/periodoEditorial';
import type { ProporcaoFuncoes } from '../../lib/proporcaoObjetivos';

type PatchDecisao = Partial<Omit<DecisaoPeriodo, 'inicio' | 'fim'>>;

/**
 * Lê e grava as configurações do Editorial. O que vale sempre fica em `preferencias`
 * e na proporção por objetivo (aba Ajustes); o que vale para um intervalo fica numa
 * decisão de período (aba Período).
 */
function comDiasDeGravacao(settings: EditorialSettings): EditorialSettings {
  const preferencias = settings.preferencias;
  if (Array.isArray(preferencias?.diasGravacao) && 'antecedenciaPostagemDias' in (preferencias ?? {})) {
    return settings;
  }
  return {
    ...settings,
    preferencias: {
      ...preferencias,
      diasGravacao: Array.isArray(preferencias?.diasGravacao) ? preferencias.diasGravacao : [],
      antecedenciaPostagemDias: preferencias?.antecedenciaPostagemDias ?? null,
    },
  };
}

export function useEditorialPlano() {
  const { state, dispatch } = useAppContext();
  const settings = comDiasDeGravacao(state.editorial);

  const gravar = (value: EditorialSettings) => {
    dispatch({ type: 'SET_EDITORIAL', payload: value });
  };

  const salvarPreferencias = (patch: Partial<PreferenciasGerais>) => {
    gravar(atualizarPreferencias(settings, patch));
  };

  const salvarProporcao = (proporcao: ProporcaoFuncoes | null) => {
    gravar(atualizarProporcao(settings, proporcao));
  };

  const salvarDecisao = (periodo: { inicio: string; fim: string }, patch: PatchDecisao) => {
    if (periodo.inicio > periodo.fim) return;
    const atual: DecisaoPeriodo = decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim) ?? {
      inicio: periodo.inicio,
      fim: periodo.fim,
      prioridade: '',
      metas: {},
      ajustesSemana: [],
    };
    gravar(upsertDecisaoPeriodo(settings, {
      ...atual,
      ...patch,
      inicio: periodo.inicio,
      fim: periodo.fim,
    }));
  };

  return { state, settings, gravar, salvarPreferencias, salvarProporcao, salvarDecisao };
}
