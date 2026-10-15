import { useNavigate } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { contarEstoque } from '../../lib/estoque';
import { getEditorialSettings } from '../../lib/editorialSettings';
import { FUNCAO_CURTA, FUNCOES } from '../../lib/funcoes';
import type { GradeCounts } from '../../lib/gradeCounts';
import { decisaoDoPeriodo } from '../../lib/periodoEditorial';
import { PeriodoEditorialControl, type PeriodoSelecionado } from './PeriodoEditorialControl';

function celula(valor: number | null): string {
  return valor == null ? '—' : String(valor);
}

function fraseProntos(estoque: number, reserva: number | null): string {
  if (reserva == null) {
    return estoque === 1 ? '1 conteúdo pronto' : `${estoque} conteúdos prontos`;
  }
  return `${estoque} de ${reserva} conteúdos prontos`;
}

export function VisaoGeralPanel({
  periodo,
  onPeriodoChange,
  contagem,
  onAbrirPlano,
}: {
  periodo: PeriodoSelecionado;
  onPeriodoChange: (periodo: PeriodoSelecionado) => void;
  contagem: GradeCounts;
  onAbrirPlano: () => void;
}) {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const settings = getEditorialSettings(state.preferences);
  const decisao = decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);
  const prioridade = decisao?.prioridade.trim() ?? '';
  const semLimite = settings.preferencias.limiteSemanal == null;
  const estoque = contarEstoque(state.contents, {
    redeReferenciaId: settings.preferencias.redeReferenciaId,
  });
  const reserva = settings.preferencias.reservaProntos;
  const objetivos = new Map(contagem.objetivos.map(objetivo => [objetivo.id, objetivo]));

  const avisos: Array<{ id: string; texto: string; acao?: { rotulo: string; onClick: () => void } }> = [];
  if (contagem.espacosLivres > 0) {
    const n = contagem.espacosLivres;
    avisos.push({
      id: 'sem-pauta',
      texto: n === 1 ? '1 espaço sem pauta.' : `${n} espaços sem pauta.`,
      acao: { rotulo: 'Abrir o planejamento', onClick: () => navigate('/planejamento') },
    });
  }
  if (contagem.semObjetivo > 0) {
    const n = contagem.semObjetivo;
    avisos.push({
      id: 'sem-objetivo',
      texto: n === 1 ? '1 conteúdo sem objetivo definido.' : `${n} conteúdos sem objetivo definido.`,
      acao: { rotulo: 'Ver conteúdos', onClick: () => navigate('/criacao?tab=roteiros') },
    });
  }
  if (!semLimite && contagem.excesso != null && contagem.excesso > 0) {
    avisos.push({
      id: 'excesso',
      texto: contagem.notaSoma ?? `O período tem ${contagem.previsto} e o limite é ${contagem.limite}.`,
      acao: { rotulo: 'Abrir o plano', onClick: onAbrirPlano },
    });
  }

  const numeros = [
    { id: 'limite', rotulo: 'Limite', valor: celula(contagem.limite) },
    { id: 'previstos', rotulo: 'Previstos', valor: String(contagem.previsto) },
    { id: 'com-pauta', rotulo: 'Com pauta', valor: String(contagem.comPauta) },
    { id: 'publicados', rotulo: 'Publicados', valor: String(contagem.publicado) },
  ];

  return (
    <div className="stack-lg">
      <PeriodoEditorialControl periodo={periodo} onChange={onPeriodoChange} />

      {prioridade ? (
        <Surface variant="info">
          <Text variant="label">Prioridade</Text>
          <Text variant="body" className="mt-1">{prioridade}</Text>
        </Surface>
      ) : null}

      {semLimite ? (
        <Surface className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="body">Defina seu limite semanal.</Text>
          <AppButton variant="secondary" size="sm" onClick={onAbrirPlano}>
            Definir limite
          </AppButton>
        </Surface>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {numeros.map(item => (
            <Surface key={item.id} variant="info">
              <Text variant="label">{item.rotulo}</Text>
              <Text variant="itemTitle" as="p" className="mt-1">{item.valor}</Text>
            </Surface>
          ))}
        </div>
      )}

      <Surface variant="info">
        <Text variant="bodyStrong">Por objetivo</Text>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th scope="col" className="py-2 pr-3">
                  <Text variant="label" as="span">Objetivo</Text>
                </th>
                {['Meta', 'Previsto', 'Com pauta', 'Publicado'].map(coluna => (
                  <th key={coluna} scope="col" className="px-3 py-2 text-right">
                    <Text variant="label" as="span">{coluna}</Text>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FUNCOES.map(funcao => {
                const linha = objetivos.get(funcao);
                return (
                  <tr key={funcao} className="border-b border-[var(--border-color)]">
                    <th scope="row" className="py-2 pr-3">
                      <Text variant="body" as="span">{FUNCAO_CURTA[funcao]}</Text>
                    </th>
                    <td className="px-3 py-2 text-right" title={linha?.meta == null ? 'Sem meta neste período' : undefined}>
                      <Text variant="body" as="span">{celula(linha?.meta ?? null)}</Text>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Text variant="body" as="span">{linha?.previsto ?? 0}</Text>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Text variant="body" as="span">{linha?.comPauta ?? 0}</Text>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Text variant="body" as="span">{linha?.publicado ?? 0}</Text>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b border-[var(--border-color)]">
                <th scope="row" className="py-2 pr-3">
                  <Text variant="body" as="span">Espaços livres</Text>
                </th>
                <td className="px-3 py-2 text-right">
                  <Text variant="body" as="span">—</Text>
                </td>
                <td className="px-3 py-2 text-right" title="Previstos ainda sem pauta">
                  <Text variant="body" as="span">{contagem.espacosLivres}</Text>
                </td>
                <td className="px-3 py-2 text-right">
                  <Text variant="body" as="span">—</Text>
                </td>
                <td className="px-3 py-2 text-right">
                  <Text variant="body" as="span">—</Text>
                </td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-3">
                  <Text variant="body" as="span">Conteúdos sem objetivo definido</Text>
                </th>
                <td className="px-3 py-2 text-right">
                  <Text variant="body" as="span">—</Text>
                </td>
                <td className="px-3 py-2 text-right">
                  <Text variant="body" as="span">—</Text>
                </td>
                <td className="px-3 py-2 text-right" title="Com pauta e sem objetivo">
                  <Text variant="body" as="span">{contagem.semObjetivo}</Text>
                </td>
                <td className="px-3 py-2 text-right">
                  <Text variant="body" as="span">—</Text>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>

      <Surface>
        {avisos.length > 0 ? <Text variant="bodyStrong">Avisos</Text> : null}
        <ul className={avisos.length > 0 ? 'mt-3 stack-sm' : 'stack-sm'}>
          {avisos.map(aviso => (
            <li key={aviso.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <Text variant="secondary" className="min-w-[12rem] flex-1">{aviso.texto}</Text>
              {aviso.acao ? (
                <AppButton variant="secondary" size="sm" onClick={aviso.acao.onClick}>
                  {aviso.acao.rotulo}
                </AppButton>
              ) : null}
            </li>
          ))}
          <li>
            <Text variant="secondary">{fraseProntos(estoque, reserva)}</Text>
          </li>
        </ul>
      </Surface>
    </div>
  );
}
