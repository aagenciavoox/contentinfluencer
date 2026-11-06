import {useEffect, useRef, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router-dom';
import {format} from 'date-fns';
import {gravarContextoPlanejamento, lerContextoPlanejamento} from '../lib/saudeActions';
import type {FiltroCalendario} from '../lib/filtroCalendario';
import type {VistaPlanejamento} from '../lib/periodoPlanejamento';

/** Mês, vista, filtro, intervalo, assunto, destaques e análise na query. */
export function useContextoPlanejamento() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const contextoInicial = useRef(lerContextoPlanejamento(searchParams)).current;
  const [month, setMonth] = useState(() => new Date(contextoInicial.data + 'T12:00:00'));
  const [vista, setVistaRaw] = useState<VistaPlanejamento>(contextoInicial.vista);
  const [intervaloEmFoco, setIntervaloEmFoco] = useState(contextoInicial.foco);
  const [origemSaude, setOrigemSaude] = useState(contextoInicial.origem);
  const setVista = (novaVista: VistaPlanejamento) => {
    setIntervaloEmFoco(null);
    setOrigemSaude(null);
    setVistaRaw(novaVista);
  };
  const navegarCalendario = (data: Date) => {
    setIntervaloEmFoco(null);
    setOrigemSaude(null);
    setMonth(data);
  };

  const [assuntoFiltroId, setAssuntoFiltroId] = useState<string | null>(contextoInicial.assuntoId);
  const [destaqueIds, setDestaqueIds] = useState<Set<string>>(() => new Set(contextoInicial.destaques));
  // 2D: filtros por conta e formato; trecho da Saúde (calendário ou intervalo); análise da Saúde.
  const [filtro, setFiltro] = useState<FiltroCalendario>(contextoInicial.filtro);
  const [trecho, setTrecho] = useState<'calendario' | 'intervalo'>(contextoInicial.trecho);
  const [intervalo, setIntervalo] = useState<{inicio: string; fim: string}>(contextoInicial.intervalo);
  const [analiseAberta, setAnaliseAberta] = useState(() => searchParams.get('saude') === '1');
  const [seriePlanejandoId, setSeriePlanejandoId] = useState<string | null>(contextoInicial.serieId);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const next = gravarContextoPlanejamento(params, {
      data: format(month, 'yyyy-MM-dd'), vista, trecho, intervalo,
      foco: intervaloEmFoco, serieId: seriePlanejandoId, destaques: [...destaqueIds],
      filtro, assuntoId: assuntoFiltroId, origem: origemSaude,
    }, analiseAberta);
    if (next.toString() !== params.toString()) setSearchParams(next, {replace: true});
  }, [month, vista, trecho, intervalo, intervaloEmFoco, seriePlanejandoId, destaqueIds, analiseAberta, filtro, assuntoFiltroId, origemSaude, location.search, setSearchParams]);

  return {
    searchParams,
    setSearchParams,
    contextoInicial,
    month,
    setMonth,
    vista,
    setVista,
    setVistaRaw,
    intervaloEmFoco,
    setIntervaloEmFoco,
    origemSaude,
    setOrigemSaude,
    navegarCalendario,
    assuntoFiltroId,
    setAssuntoFiltroId,
    destaqueIds,
    setDestaqueIds,
    filtro,
    setFiltro,
    trecho,
    setTrecho,
    intervalo,
    setIntervalo,
    analiseAberta,
    setAnaliseAberta,
    seriePlanejandoId,
    setSeriePlanejandoId,
  };
}
