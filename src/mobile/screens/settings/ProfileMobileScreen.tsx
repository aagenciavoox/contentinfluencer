import { KeyRound, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';

interface ProfileMobileScreenProps {
  backendReady: boolean;
  accountEmail: string;
  fullName: string;
  pendingEmail: string;
  password: string;
  confirmPassword: string;
  profileLoading: boolean;
  emailLoading: boolean;
  passwordLoading: boolean;
  profileMessage: string | null;
  emailMessage: string | null;
  passwordMessage: string | null;
  profileError: string | null;
  emailError: string | null;
  passwordError: string | null;
  onFullNameChange: (value: string) => void;
  onPendingEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSaveProfile: () => void;
  onSaveEmail: () => void;
  onSavePassword: () => void;
}

function Feedback({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  const classes =
    tone === 'success'
      ? 'border-[var(--accent-green)]/20 bg-[var(--accent-green)]/8 text-[var(--accent-green)]'
      : 'border-[var(--accent-pink)]/20 bg-[var(--accent-pink)]/8 text-[var(--accent-pink)]';

  return <p className={`rounded-[1rem] border px-4 py-3 text-sm ${classes}`}>{message}</p>;
}

export function ProfileMobileScreen({
  backendReady,
  accountEmail,
  fullName,
  pendingEmail,
  password,
  confirmPassword,
  profileLoading,
  emailLoading,
  passwordLoading,
  profileMessage,
  emailMessage,
  passwordMessage,
  profileError,
  emailError,
  passwordError,
  onFullNameChange,
  onPendingEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSaveProfile,
  onSaveEmail,
  onSavePassword,
}: ProfileMobileScreenProps) {
  return (
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={UserCircle2}
          tone="blue"
          title="Perfil"
          description="Atualize nome, e-mail de acesso e senha sem sair do fluxo mobile."
        />

        {!backendReady ? (
          <Feedback
            message="Conecte o Supabase para habilitar alterações de conta."
            tone="error"
          />
        ) : (
          <div className="rounded-[var(--radius-md)] bg-[var(--bg-primary)] px-4 py-3">
            <p className="t-label text-[var(--text-tertiary)]">E-mail atual</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{accountEmail}</p>
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <UserCircle2 className="h-4 w-4" />
          <p className="t-label">Nome do perfil</p>
        </div>
        <input
          type="text"
          value={fullName}
          onChange={(event) => onFullNameChange(event.target.value)}
          placeholder="Como seu nome aparece no sistema"
          disabled={!backendReady || profileLoading}
          className="input"
        />
        <AppButton
          variant="primary"
          fullWidth
          onClick={onSaveProfile}
          disabled={!backendReady || profileLoading}
          className="mt-4"
        >
          {profileLoading ? 'Salvando...' : 'Salvar nome'}
        </AppButton>
        {profileMessage ? <div className="mt-3"><Feedback message={profileMessage} tone="success" /></div> : null}
        {profileError ? <div className="mt-3"><Feedback message={profileError} tone="error" /></div> : null}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <Mail className="h-4 w-4" />
          <p className="t-label">Trocar e-mail</p>
        </div>
        <input
          type="email"
          value={pendingEmail}
          onChange={(event) => onPendingEmailChange(event.target.value)}
          placeholder="novo-email@exemplo.com"
          disabled={!backendReady || emailLoading}
          className="input"
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          O Supabase pode pedir confirmação no endereço novo antes da troca ser concluída.
        </p>
        <AppButton
          variant="primary"
          fullWidth
          onClick={onSaveEmail}
          disabled={!backendReady || emailLoading}
          className="mt-4"
        >
          {emailLoading ? 'Atualizando...' : 'Atualizar e-mail'}
        </AppButton>
        {emailMessage ? <div className="mt-3"><Feedback message={emailMessage} tone="success" /></div> : null}
        {emailError ? <div className="mt-3"><Feedback message={emailError} tone="error" /></div> : null}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <KeyRound className="h-4 w-4" />
          <p className="t-label">Trocar senha</p>
        </div>
        <div className="stack-md">
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Nova senha"
            disabled={!backendReady || passwordLoading}
            className="input"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder="Confirmar nova senha"
            disabled={!backendReady || passwordLoading}
            className="input"
          />
        </div>
        <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--bg-primary)] px-4 py-3 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent-green)]" />
            <span>Use pelo menos 6 caracteres para manter o acesso seguro.</span>
          </div>
        </div>
        <AppButton
          variant="primary"
          fullWidth
          onClick={onSavePassword}
          disabled={!backendReady || passwordLoading}
          className="mt-4"
        >
          {passwordLoading ? 'Salvando...' : 'Atualizar senha'}
        </AppButton>
        {passwordMessage ? <div className="mt-3"><Feedback message={passwordMessage} tone="success" /></div> : null}
        {passwordError ? <div className="mt-3"><Feedback message={passwordError} tone="error" /></div> : null}
      </section>
    </div>
  );
}
