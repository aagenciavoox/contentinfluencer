import { Ajuda } from '../../../components/ui/Ajuda';
import { ROTA_DA_REGRA_DE_OURO } from '../lib/abasEditorial';
import { explicacaoDoLimiteDaRegraDeOuro, limiteDaRegraDeOuro } from '../lib/regraDeOuro';

/**
 * “?” ao lado do erro da Regra de Ouro: de onde vem o limite (Geral › Regra de Ouro),
 * o valor atual e as janelas maiores. O limite é o que o AppContext sincroniza a cada render.
 * `comLink` só onde sair da tela não perde nada além do rascunho que a regra já barrou.
 */
export function AjudaDaRegraDeOuro({ comLink = false, alinhar = 'inicio' }: { comLink?: boolean; alinhar?: 'inicio' | 'fim' }) {
  return (
    <Ajuda
      rotulo="De onde vem o limite da Regra de Ouro"
      texto={explicacaoDoLimiteDaRegraDeOuro(limiteDaRegraDeOuro())}
      alinhar={alinhar}
      abrirAoPassar
      acao={comLink ? { rotulo: 'Abrir Regra de Ouro', para: ROTA_DA_REGRA_DE_OURO } : undefined}
    />
  );
}
