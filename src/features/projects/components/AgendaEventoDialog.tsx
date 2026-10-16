import {useMemo, useState} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {AppButton} from '../../../components/ui/AppButton';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Text} from '../../../components/ui/Text';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import type {AgendaItem, BibliotecaItem, Projeto, ProjetoLivro} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {PostingTimeSuggestions} from '../../settings/components/PostingTimeSuggestions';
import {getPostingTimesForPlatform} from '../../settings/lib/postingTimes';
import {generateUUID} from '../../../utils/uuid';
import {
  encontrarLivroDoProjeto,
  isPeriodoLeitura,
  opcoesTipoEvento,
  rotuloPeriodoLeitura,
  tituloLeitura,
  type AgendaTipo,
} from '../lib/agendaEventos';
import {AgendaTipoIcon} from './AgendaTipoIcon';

export function AgendaEventoDialog({
  item,
  projetos,
  bibliotecaItems,
  projetoIdFixo = null,
  dataInicial,
  horaInicial,
  tituloInicial,
  onClose,
  onSave,
  onDelete,
  onOpenProjeto,
}: {
  item: AgendaItem | null;
  projetos: Projeto[];
  bibliotecaItems: BibliotecaItem[];
  projetoIdFixo?: string | null;
  dataInicial?: string;
  horaInicial?: string | null;
  tituloInicial?: string;
  onClose: () => void;
  onSave: (item: AgendaItem, livroNovo?: ProjetoLivro) => void;
  onDelete?: (item: AgendaItem) => void;
  onOpenProjeto?: (projetoId: string) => void;
}) {
  const {state} = useAppContext();
  const postingTimes = getPostingTimesForPlatform(state.postingTimeEntries, null);
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const [titulo, setTitulo] = useState(item?.title || tituloInicial || '');
  const [tipo, setTipo] = useState<AgendaTipo>((item?.tipo as AgendaTipo) || 'Reunião');
  const [data, setData] = useState(item?.date?.slice(0, 10) || dataInicial || hoje);
  const [dataFim, setDataFim] = useState(item?.dateEnd?.slice(0, 10) || item?.date?.slice(0, 10) || dataInicial || hoje);
  const [hora, setHora] = useState(item?.time || horaInicial || '');
  const [notas, setNotas] = useState(item?.notes || '');
  const [projetoId, setProjetoId] = useState(projetoIdFixo || item?.projetoId || '');
  const [livroEscolha, setLivroEscolha] = useState(() => item?.projetoLivroId ? `pl:${item.projetoLivroId}` : '');
  const [nomeManual, setNomeManual] = useState('');

  const projeto = projetos.find(atual => atual.id === (projetoIdFixo || projetoId)) ?? null;
  const livros = projeto?.livros ?? [];
  const periodo = isPeriodoLeitura(tipo);
  const livrosBiblioteca = useMemo(
    () => bibliotecaItems.filter(livro => livro.tipo === 'livro' && !livro.deletedAt),
    [bibliotecaItems],
  );

  const opcoesLivro = [
    ...livros.map(livro => ({value: `pl:${livro.id}`, label: livro.nome})),
    ...livrosBiblioteca
      .filter(livro => !livros.some(atual => atual.bibliotecaItemId === livro.id))
      .map(livro => ({value: `bib:${livro.id}`, label: `Biblioteca · ${livro.titulo}`})),
    {value: 'manual', label: 'Informar o nome'},
  ];

  const nomeResolvido = (() => {
    if (livroEscolha.startsWith('pl:')) {
      return livros.find(livro => livro.id === livroEscolha.slice(3))?.nome || '';
    }
    if (livroEscolha.startsWith('bib:')) {
      return livrosBiblioteca.find(livro => livro.id === livroEscolha.slice(4))?.titulo || '';
    }
    return nomeManual.trim();
  })();

  const intervaloInvalido = periodo && Boolean(data) && Boolean(dataFim) && dataFim < data;
  const livroFaltando = periodo && !nomeResolvido;
  const projetoFaltando = periodo && !projeto;
  const tituloFaltando = !periodo && !titulo.trim();
  const podeSalvar = Boolean(data) && !intervaloInvalido && !livroFaltando && !projetoFaltando && !tituloFaltando;

  const escolherTipo = (proximo: AgendaTipo) => {
    setTipo(proximo);
    if (isPeriodoLeitura(proximo) && !titulo.trim() && nomeResolvido) {
      setTitulo(tituloLeitura(nomeResolvido));
    }
  };

  const escolherLivro = (valor: string) => {
    setLivroEscolha(valor);
    const nome = valor.startsWith('pl:')
      ? livros.find(livro => livro.id === valor.slice(3))?.nome
      : valor.startsWith('bib:')
        ? livrosBiblioteca.find(livro => livro.id === valor.slice(4))?.titulo
        : '';
    if (nome && (!titulo.trim() || titulo.startsWith('Leitura de '))) {
      setTitulo(tituloLeitura(nome));
    }
  };

  const salvar = () => {
    if (!podeSalvar || !projeto && periodo) return;
    let projetoLivroId: string | null = null;
    let livroNovo: ProjetoLivro | undefined;
    let nomeLivro = nomeResolvido;

    if (periodo && projeto) {
      if (livroEscolha.startsWith('pl:')) {
        projetoLivroId = livroEscolha.slice(3);
        nomeLivro = livros.find(livro => livro.id === projetoLivroId)?.nome || nomeLivro;
      } else if (livroEscolha.startsWith('bib:')) {
        const bibliotecaItemId = livroEscolha.slice(4);
        const existente = encontrarLivroDoProjeto(livros, {bibliotecaItemId, nome: nomeLivro});
        if (existente) {
          projetoLivroId = existente.id;
          nomeLivro = existente.nome;
        } else {
          livroNovo = {
            id: generateUUID(),
            projetoId: projeto.id,
            userId: item?.userId || '',
            nome: nomeLivro,
            bibliotecaItemId,
            createdAt: new Date().toISOString(),
          };
          projetoLivroId = livroNovo.id;
        }
      } else {
        const existente = encontrarLivroDoProjeto(livros, {nome: nomeManual});
        if (existente) {
          projetoLivroId = existente.id;
          nomeLivro = existente.nome;
        } else {
          livroNovo = {
            id: generateUUID(),
            projetoId: projeto.id,
            userId: item?.userId || '',
            nome: nomeManual.trim(),
            bibliotecaItemId: null,
            createdAt: new Date().toISOString(),
          };
          projetoLivroId = livroNovo.id;
          nomeLivro = livroNovo.nome;
        }
      }
    }

    const title = titulo.trim() || tituloLeitura(nomeLivro);
    onSave({
      id: item?.id || generateUUID(),
      userId: item?.userId || '',
      title,
      date: data,
      time: periodo ? null : (hora || null),
      tipo,
      projetoId: projetoIdFixo || projetoId || null,
      notes: notas.trim() || null,
      dateEnd: periodo ? dataFim : null,
      projetoLivroId: periodo ? projetoLivroId : null,
      createdAt: item?.createdAt || new Date().toISOString(),
    }, livroNovo);
  };

  return (
    <>
      <OverlayHeader
        title={item ? 'Editar evento' : 'Novo evento'}
        subtitle={projeto ? projeto.nome : 'Agenda'}
        onClose={onClose}
      />
      <OverlayBody className="stack-lg py-6">
        <div className="stack-sm">
          <Text variant="label">Tipo de evento</Text>
          <div role="radiogroup" aria-label="Tipo de evento" className="grid grid-cols-2 gap-2">
            {opcoesTipoEvento(item?.tipo).map(opcao => (
              <button
                key={opcao}
                type="button"
                role="radio"
                aria-checked={tipo === opcao}
                onClick={() => escolherTipo(opcao)}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-[var(--radius-input)] border px-3 py-2 text-left text-sm font-semibold',
                  tipo === opcao
                    ? 'border-[var(--text-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)]',
                )}
              >
                <AgendaTipoIcon tipo={opcao} className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{opcao}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block stack-sm">
          <Text variant="label">Título</Text>
          <input
            value={titulo}
            onChange={event => setTitulo(event.target.value)}
            placeholder={periodo ? 'Leitura de…' : 'Título do evento'}
            className="w-full"
          />
        </label>

        {periodo ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block stack-sm">
              <Text variant="label">Data inicial</Text>
              <input type="date" value={data} onChange={event => setData(event.target.value)} className="w-full" />
            </label>
            <label className="block stack-sm">
              <Text variant="label">Data final</Text>
              <input type="date" value={dataFim} onChange={event => setDataFim(event.target.value)} className="w-full" />
            </label>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block stack-sm">
              <Text variant="label">Data</Text>
              <input type="date" value={data} onChange={event => setData(event.target.value)} className="w-full" />
            </label>
            <div className="stack-sm">
              <Text variant="label">Horário</Text>
              <input type="time" value={hora} onChange={event => setHora(event.target.value)} className="w-full" />
              <PostingTimeSuggestions date={data} selectedTime={hora} postingTimes={postingTimes} onSelect={setHora} />
            </div>
          </div>
        )}

        {periodo ? (
          <div className="stack-sm">
            <TagSelect
              label="Livro"
              values={livroEscolha ? [livroEscolha] : []}
              onChange={values => escolherLivro(values[0] ?? '')}
              options={opcoesLivro}
              maxSelections={1}
              searchable
              placeholder="Escolha um livro ou informe o nome"
            />
            {livroEscolha === 'manual' ? (
              <input
                value={nomeManual}
                onChange={event => {
                  setNomeManual(event.target.value);
                  if (!titulo.trim() || titulo.startsWith('Leitura de ')) {
                    setTitulo(event.target.value.trim() ? tituloLeitura(event.target.value) : '');
                  }
                }}
                placeholder="Nome do livro"
                className="w-full"
              />
            ) : null}
            {nomeResolvido && data && dataFim && !intervaloInvalido ? (
              <Text variant="secondary">{rotuloPeriodoLeitura(nomeResolvido, data, dataFim)}</Text>
            ) : null}
            {projetoFaltando ? (
              <Text variant="meta">O período de leitura precisa estar num projeto.</Text>
            ) : null}
            {intervaloInvalido ? (
              <Text variant="meta">A data final precisa ser no dia inicial ou depois.</Text>
            ) : null}
          </div>
        ) : null}

        {projetoIdFixo ? null : (
          <TagSelect
            label="Projeto"
            values={projetoId ? [projetoId] : []}
            onChange={values => {
              setProjetoId(values[0] ?? '');
              setLivroEscolha('');
            }}
            options={projetos.filter(atual => !atual.deletedAt).map(atual => ({value: atual.id, label: atual.nome}))}
            maxSelections={1}
            searchable
            placeholder="Sem projeto"
          />
        )}

        <label className="block stack-sm">
          <Text variant="label">Observações</Text>
          <textarea
            value={notas}
            onChange={event => setNotas(event.target.value)}
            rows={3}
            placeholder="Detalhes deste evento"
            className="w-full resize-none"
          />
        </label>
      </OverlayBody>
      <OverlayFooter className="flex-wrap">
        {projeto && onOpenProjeto ? (
          <AppButton variant="ghost" onClick={() => onOpenProjeto(projeto.id)}>
            Abrir projeto
          </AppButton>
        ) : null}
        {item && onDelete ? (
          <AppButton variant="ghost" onClick={() => onDelete(item)}>
            Excluir
          </AppButton>
        ) : null}
        <AppButton variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </AppButton>
        <AppButton variant="primary" onClick={salvar} disabled={!podeSalvar} className="flex-1">
          Salvar
        </AppButton>
      </OverlayFooter>
    </>
  );
}
