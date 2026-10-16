import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Captions, Check, ChevronDown, Copy, Download, FileText } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { copyText, downloadText } from '../lib/downloadText';
import { buildPlainText, buildSrt, transcriptFileName, type Transcript } from '../lib/transcriptFormats';

function DownloadMenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
      onClick={onClick}
    >
      <span className="flex shrink-0 text-[var(--text-tertiary)]" aria-hidden>{icon}</span>
      {label}
    </button>
  );
}

/** "Baixar" com as duas saídas: o texto (.txt) e a legenda com tempos (.srt). */
function DownloadMenu({ onText, onSrt }: { onText: () => void; onSrt: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative">
      <AppButton
        ref={triggerRef}
        leftIcon={<Download className="h-4 w-4" />}
        rightIcon={<ChevronDown className="h-4 w-4" />}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(previous => !previous)}
      >
        Baixar
      </AppButton>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 min-w-[240px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-dropdown)]"
        >
          <DownloadMenuItem icon={<FileText className="h-4 w-4" />} label="Texto (.txt)" onClick={() => choose(onText)} />
          <DownloadMenuItem icon={<Captions className="h-4 w-4" />} label="Legenda com tempos (.srt)" onClick={() => choose(onSrt)} />
        </div>
      ) : null}
    </div>
  );
}

/** Copiar e baixar o texto de um vídeo. No desktop fica no cabeçalho; no celular, acima do texto. */
export function TranscriptActions({ fileName, transcript }: { fileName: string; transcript: Transcript }) {
  const [copied, setCopied] = useState(false);
  const plainText = buildPlainText(transcript);
  const hasSegments = transcript.segments.length > 0;

  const copy = async () => {
    const ok = await copyText(plainText);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1500);
  };

  const downloadTxt = () => downloadText(plainText, transcriptFileName(fileName, 'txt'));
  const downloadSrt = () =>
    downloadText(buildSrt(transcript.segments), transcriptFileName(fileName, 'srt'), 'application/x-subrip;charset=utf-8');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AppButton
        variant="primary"
        leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        onClick={() => void copy()}
        disabled={!plainText}
      >
        {copied ? 'Copiado' : 'Copiar texto'}
      </AppButton>
      {/* Sem tempos não há .srt: o menu teria uma opção só, então vira o botão direto. */}
      {hasSegments && plainText ? (
        <DownloadMenu onText={downloadTxt} onSrt={downloadSrt} />
      ) : (
        <AppButton leftIcon={<Download className="h-4 w-4" />} onClick={downloadTxt} disabled={!plainText}>
          Baixar .txt
        </AppButton>
      )}
    </div>
  );
}
