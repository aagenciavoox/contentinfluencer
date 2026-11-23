import {useEffect, useRef, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router-dom';
import {format} from 'date-fns';
import {gravarContextoPlanejamento, lerContextoPlanejamento, type ContextoPlanejamento} from '../lib/saudeActions';
import type {FiltroCalendario} from '../lib/filtroCalendario';
import type {VistaPlanejamento} from '../lib/periodoPlanejamento';

function assinaturaDoContexto(contexto: ContextoPlanejamento, saude: boolean): string {
  return gravarContextoPlanejamento(new URLSearchParams(), contexto, saude).toString();
}

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
  // Assinatura da consulta que este hook acabou de gravar. Outra consulta
  // (voltar, link com ?saude=1) entra no estado. Sem isso o efeito regrava
  // o estado antigo e a tela não acompanha a URL.
  const consultaEscrita = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vindo = lerContextoPlanejamento(params);
    const saudeVinda = params.get('saude') === '1';
    const assinaturaUrl = assinaturaDoContexto(vindo, saudeVinda);
    if (consultaEscrita.current !== null && assinaturaUrl !== consultaEscrita.current) {
      consultaEscrita.current = assinaturaUrl;
      setMonth(new Date(`${vindo.data}T12:00:00`));
      setVistaRaw(vindo.vista);
      setTrecho(vindo.trecho);
      setIntervalo(vindo.intervalo);
      setIntervaloEmFoco(vindo.foco);
      setOrigemSaude(vindo.origem);
      setAssuntoFiltroId(vindo.assuntoId);
      setDestaqueIds(new Set(vindo.destaques));
      setFiltro(vindo.filtro);
      setAnaliseAberta(saudeVinda);
      setSeriePlanejandoId(vindo.serieId);
      return;
    }
    const estado: ContextoPlanejamento = {
      data: format(month, 'yyyy-MM-dd'), vista, trecho, intervalo,
      foco: intervaloEmFoco, serieId: seriePlanejandoId, destaques: [...destaqueIds],
      filtro, assuntoId: assuntoFiltroId, origem: origemSaude,
    };
    const assinaturaEstado = assinaturaDoContexto(estado, analiseAberta);
    consultaEscrita.current = assinaturaEstado;
    if (assinaturaEstado === assinaturaUrl) return;
    setSearchParams(gravarContextoPlanejamento(params, estado, analiseAberta), {replace: true});
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
