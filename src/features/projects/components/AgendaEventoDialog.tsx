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
  encontrarLivroNaBiblioteca,
  isPeriodoLeitura,
  novoLivroDaBiblioteca,
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
  onSave: (item: AgendaItem, livroNovo?: ProjetoLivro, livroBibliotecaNovo?: BibliotecaItem) => void;
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
  const [livroEscolha, setLivroEscolha] = useState(() => {
    if (item?.projetoLivroId) return `pl:${item.projetoLivroId}`;
    if (item?.bibliotecaItemId) return `bib:${item.bibliotecaItemId}`;
    return '';
  });
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
    {value: 'manual', label: 'Livro novo (digitar o nome)'},
  ];

  // Livro da Biblioteca que já está no projeto aparece como o livro do projeto.
  const livroEscolhaExibida = (() => {
    if (!livroEscolha.startsWith('bib:')) return livroEscolha;
    const doProjeto = livros.find(livro => livro.bibliotecaItemId === livroEscolha.slice(4));
    return doProjeto ? `pl:${doProjeto.id}` : livroEscolha;
  })();

  const nomeResolvido = (() => {
    if (livroEscolha.startsWith('pl:')) {
      return livros.find(livro => livro.id === livroEscolha.slice(3))?.nome || '';
    }
    if (livroEscolha.startsWith('bib:')) {
      return livrosBiblioteca.find(livro => livro.id === livroEscolha.slice(4))?.titulo || '';
    }
    return nomeManual.trim();
  })();

  // Livro digitado que já existe na Biblioteca: usa o existente em vez de criar outro.
  const livroBibliotecaDoNome = livroEscolha === 'manual'
    ? encontrarLivroNaBiblioteca(livrosBiblioteca, nomeManual)
    : null;

  // Projeto é opcional: o período de leitura pode ficar fora de projeto.
  const intervaloInvalido = periodo && Boolean(data) && Boolean(dataFim) && dataFim < data;
  const livroFaltando = periodo && !nomeResolvido;
  const tituloFaltando = !periodo && !titulo.trim();
  const faltando = [
    !data ? (periodo ? 'a data inicial' : 'a data') : null,
    periodo && !dataFim ? 'a data final' : null,
    intervaloInvalido ? 'uma data final no dia inicial ou depois' : null,
    livroFaltando
      ? (livroEscolha === 'manual' ? 'o nome do livro' : 'escolher um livro ou cadastrar um livro novo')
      : null,
    tituloFaltando ? 'o título' : null,
  ].filter((motivo): motivo is string => Boolean(motivo));
  const podeSalvar = faltando.length === 0;

  const mudarDataInicial = (valor: string) => {
    setData(valor);
    // Data inicial depois da final empurra a final junto.
    if (valor && (!dataFim || dataFim < valor)) setDataFim(valor);
  };

  const mudarDataFinal = (valor: string) => {
    setDataFim(valor && data && valor < data ? data : valor);
  };

  const trocarProjeto = (proximoId: string) => {
    setProjetoId(proximoId);
    if (!livroEscolha.startsWith('pl:')) return;
    // Livro do projeto anterior: se ele aponta para a Biblioteca, mantém o livro; senão limpa.
    const anterior = livros.find(livro => livro.id === livroEscolha.slice(3));
    setLivroEscolha(anterior?.bibliotecaItemId ? `bib:${anterior.bibliotecaItemId}` : '');
  };

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
    if (!podeSalvar) return;
    let projetoLivroId: string | null = null;
    let bibliotecaItemId: string | null = null;
    let livroNovo: ProjetoLivro | undefined;
    let livroBibliotecaNovo: BibliotecaItem | undefined;
    let nomeLivro = nomeResolvido;
    const agora = new Date().toISOString();

    if (periodo) {
      if (livroEscolha.startsWith('pl:')) {
        const doProjeto = livros.find(livro => livro.id === livroEscolha.slice(3));
        projetoLivroId = doProjeto?.id ?? null;
        bibliotecaItemId = doProjeto?.bibliotecaItemId ?? null;
        nomeLivro = doProjeto?.nome || nomeLivro;
      } else if (livroEscolha.startsWith('bib:')) {
        bibliotecaItemId = livroEscolha.slice(4);
      } else {
        // Livro digitado vira item da Biblioteca só com o nome; capa e o resto vêm depois.
        const nome = nomeManual.trim();
        const existenteNoProjeto = projeto ? encontrarLivroDoProjeto(livros, {nome}) : null;
        if (livroBibliotecaDoNome) {
          bibliotecaItemId = livroBibliotecaDoNome.id;
          nomeLivro = livroBibliotecaDoNome.titulo;
        } else if (existenteNoProjeto?.bibliotecaItemId) {
          bibliotecaItemId = existenteNoProjeto.bibliotecaItemId;
          nomeLivro = existenteNoProjeto.nome;
        } else {
          livroBibliotecaNovo = novoLivroDaBiblioteca(nome, item?.userId || '', agora, generateUUID());
          bibliotecaItemId = livroBibliotecaNovo.id;
          nomeLivro = nome;
        }
      }

      if (projeto && !projetoLivroId) {
        const existente = encontrarLivroDoProjeto(livros, {bibliotecaItemId, nome: nomeLivro});
        if (existente) {
          projetoLivroId = existente.id;
          nomeLivro = existente.nome;
          if (!existente.bibliotecaItemId && bibliotecaItemId) {
            // Livro do projeto que só tinha nome passa a apontar para a Biblioteca.
            livroNovo = {...existente, bibliotecaItemId};
          }
        } else {
          livroNovo = {
            id: generateUUID(),
            projetoId: projeto.id,
            userId: item?.userId || '',
            nome: nomeLivro,
            bibliotecaItemId,
            createdAt: agora,
          };
          projetoLivroId = livroNovo.id;
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
      dateEnd: periodo ? (dataFim || data) : null,
      projetoLivroId: periodo ? projetoLivroId : null,
      bibliotecaItemId: periodo ? bibliotecaItemId : null,
      createdAt: item?.createdAt || agora,
    }, livroNovo, livroBibliotecaNovo);
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
              <input type="date" value={data} onChange={event => mudarDataInicial(event.target.value)} className="w-full" />
            </label>
            <label className="block stack-sm">
              <Text variant="label">Data final</Text>
              <input type="date" value={dataFim} min={data || undefined} onChange={event => mudarDataFinal(event.target.value)} className="w-full" />
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

        {projetoIdFixo ? null : (
          <TagSelect
            label="Projeto"
            values={projetoId ? [projetoId] : []}
            onChange={values => trocarProjeto(values[0] ?? '')}
            options={projetos.filter(atual => !atual.deletedAt).map(atual => ({value: atual.id, label: atual.nome}))}
            maxSelections={1}
            searchable
            placeholder="Sem projeto (opcional)"
          />
        )}

        {periodo ? (
          <div className="stack-sm">
            <TagSelect
              label="Livro"
              values={livroEscolhaExibida ? [livroEscolhaExibida] : []}
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
            {livroFaltando && livroEscolha !== 'manual' ? (
              <Text variant="meta">Escolha um livro da lista ou cadastre um livro novo só com o nome.</Text>
            ) : null}
            {livroEscolha === 'manual' && nomeManual.trim() ? (
              <Text variant="meta">
                {livroBibliotecaDoNome
                  ? `Vai usar "${livroBibliotecaDoNome.titulo}", que já está na Biblioteca.`
                  : 'O livro entra na Biblioteca só com o nome. Capa, autor e o resto você completa depois.'}
              </Text>
            ) : null}
            {intervaloInvalido ? (
              <Text variant="meta">A data final precisa ser no dia inicial ou depois.</Text>
            ) : null}
          </div>
        ) : null}

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

        {!podeSalvar ? (
          <div role="status" aria-live="polite">
            <Text variant="meta">Para salvar, falta {faltando.join(', ')}.</Text>
          </div>
        ) : null}
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
