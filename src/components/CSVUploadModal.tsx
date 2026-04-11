import { useState, useRef } from 'react';
import { X, Upload, FileText, Check, AlertCircle, Info } from 'lucide-react';
import { FixedPanelModal } from './FixedPanelModal';
import { Content } from '../types';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CSVUploadModalProps {
  onClose: () => void;
}

export function CSVUploadModal({ onClose }: CSVUploadModalProps) {
  const { state, dispatch } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<Content>[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo CSV válido.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          setError('O arquivo CSV está vazio ou não possui cabeçalhos.');
          return;
        }

        // Simples parser de CSV (considerando vírgula ou ponto e vírgula)
        const headerLine = lines[0];
        const separator = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        
        const titleIdx = headers.findIndex(h => h === 'titulo' || h === 'nome');
        const scriptIdx = headers.findIndex(h => h === 'roteiro' || h === 'texto' || h === 'script');

        if (titleIdx === -1 || scriptIdx === -1) {
          setError('Não encontramos as colunas obrigatórias: "titulo" e "roteiro". Verifique o modelo abaixo.');
          return;
        }

        const data: Partial<Content>[] = [];
        for (let i = 1; i < lines.length; i++) {
          // Lida com aspas no CSV para suportar quebras de linha básicas ou vírgulas no roteiro
          // Regex para CSV com suporte a aspas
          const row = lines[i].match(/(".*?"|[^";,]+)(?=\s*[;,]|\s*$)/g) || [];
          const cleanRow = row.map(val => val.trim().replace(/^"|"$/g, ''));

          if (cleanRow[titleIdx] && cleanRow[scriptIdx]) {
            data.push({
              id: Math.random().toString(36).substr(2, 9),
              title: cleanRow[titleIdx],
              script: cleanRow[scriptIdx],
              status: 'Ideia',
              pillar: state.pilares[0]?.nome || 'Sem Pilar',
              createdAt: new Date().toISOString()
            });
          }
        }

        if (data.length === 0) {
          setError('Nenhum dado válido encontrado nas linhas. Certifique-se de preencher título e roteiro.');
        } else {
          setPreview(data);
        }
      } catch (err) {
        setError('Erro ao ler o arquivo. Certifique-se de que a formatação está correta.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    
    preview.forEach(content => {
      dispatch({ type: 'ADD_CONTENT', payload: content as Content });
    });
    
    setIsSuccess(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <FixedPanelModal open={true} onClose={onClose} desktopMaxW="md:max-w-[700px]">
      <div className="flex flex-col h-full bg-[var(--bg-primary)]">
        {/* Cabeçalho */}
        <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)] shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Upload className="w-5 h-5 text-[var(--accent-blue)]" />
              <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase">Importar Roteiros</h2>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Adicione múltiplos conteúdos de uma vez</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {isSuccess ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 border-4 border-green-500/20">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase mb-2">Importação Concluída!</h3>
              <p className="text-sm text-[var(--text-tertiary)] opacity-70">{preview.length} roteiros foram adicionados ao seu inventário.</p>
            </motion.div>
          ) : (
            <div className="space-y-12">
              {/* Explicação do Formato */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-4 h-4 text-[var(--accent-blue)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Instruções do Arquivo</span>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
                  <p className="text-sm text-[var(--text-tertiary)] mb-6 leading-relaxed">
                    Seu arquivo deve ser um **CSV** (Comma Separated Values). A primeira linha deve conter os nomes das colunas.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[11px] font-bold py-2 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-primary)]">titulo</span>
                      <span className="text-[var(--accent-pink)]">Obrigatório</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold py-2 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-primary)]">roteiro</span>
                      <span className="text-[var(--accent-pink)]">Obrigatório</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Exemplo de Conteúdo</p>
                    <pre className="bg-black/5 dark:bg-white/5 p-4 rounded-xl text-[10px] font-mono opacity-60 overflow-x-auto whitespace-pre">
                      titulo,roteiro{'\n'}
                      Como ler mais rápido,"Dica 1: Pare de subvocalizar..."{'\n'}
                      Minha estante secreta,"Neste vídeo mostro os livros que..."
                    </pre>
                  </div>
                </div>
              </section>

              {/* Área de Seleção */}
              <section>
                {!file ? (
                  <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[var(--border-color)] rounded-[2.5rem] bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-hover)] transition-all cursor-pointer group">
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                    <div className="w-16 h-16 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                      <FileText className="w-8 h-8 text-[var(--text-tertiary)]" />
                    </div>
                    <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-2">Clique para selecionar</span>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] opacity-50 tracking-widest">Apenas arquivos .csv são suportados</span>
                  </label>
                ) : (
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-[var(--bg-hover)] flex items-center justify-between border-b border-[var(--border-color)]">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[var(--accent-blue)]" />
                        <span className="text-xs font-black text-[var(--text-primary)] truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button onClick={() => { setFile(null); setPreview([]); setError(null); }} className="text-[10px] font-bold text-[var(--accent-pink)] hover:underline uppercase tracking-widest">Remover</button>
                    </div>
                    
                    {error && (
                      <div className="p-4 flex items-center gap-3 text-red-500 bg-red-50/50 dark:bg-red-500/5 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </div>
                    )}

                    {preview.length > 0 && (
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-[var(--border-color)]">
                        {preview.slice(0, 10).map((row, i) => (
                          <div key={i} className="p-4 flex flex-col gap-1">
                            <span className="text-xs font-black text-[var(--text-primary)] line-clamp-1">{row.title}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)] line-clamp-1 opacity-60 italic">{row.script?.substring(0, 100)}...</span>
                          </div>
                        ))}
                        {preview.length > 10 && (
                          <div className="p-3 text-center bg-[var(--background-secondary)] text-[10px] font-bold opacity-30 uppercase tracking-widest">
                            + {preview.length - 10} outros roteiros
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Rodapé */}
        {!isSuccess && (
          <div className="p-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-end shrink-0">
            <button
              onClick={handleImport}
              disabled={preview.length === 0 || !!error}
              className="flex items-center justify-center gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-30 disabled:scale-100"
            >
              <Check className="w-4 h-4" /> Importar {preview.length} Roteiros
            </button>
          </div>
        )}
      </div>
    </FixedPanelModal>
  );
}
