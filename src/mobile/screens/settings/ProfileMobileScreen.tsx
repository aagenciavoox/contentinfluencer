import { KeyRound, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { ERRORS } from '../../../lib/uiCopy';

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
  emailSubmitDisabled?: boolean;
  primaryCard?: 'profile' | 'email' | 'password' | null;
}

// A cor só tinge fundo e borda; o texto fica em --text-primary para manter o contraste (DESIGN.md).
function Feedback({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  const classes =
    tone === 'success'
      ? 'border-[color-mix(in_srgb,var(--success)_35%,var(--border-color))] bg-[color-mix(in_srgb,var(--success)_10%,var(--bg-elevated))]'
      : 'border-[color-mix(in_srgb,var(--danger)_35%,var(--border-color))] bg-[color-mix(in_srgb,var(--danger)_10%,var(--bg-elevated))]';

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[var(--radius-input)] border px-4 py-3 t-body text-[var(--text-primary)] ${classes}`}
    >
      {message}
    </p>
  );
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
  emailSubmitDisabled = false,
  primaryCard = null,
}: ProfileMobileScreenProps) {
  return (
    <div className="stack-lg">
      {/* "Perfil" já é o título do cabeçalho; o primeiro card mostra só o e-mail atual. */}
      <section className="stack-md">
        <Text variant="secondary" className="px-1">Nome, e-mail de acesso e senha.</Text>
        {!backendReady ? (
          <Feedback
            message={ERRORS.supabaseDesconectado}
            tone="error"
          />
        ) : (
          <div className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
            <Text variant="label" as="p" className="text-[var(--text-tertiary)]">E-mail atual</Text>
            <Text variant="itemTitle" as="p" className="mt-1 text-[var(--text-primary)]">{accountEmail}</Text>
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <UserCircle2 className="h-4 w-4" aria-hidden />
          <label htmlFor="mobile-profile-name" className="t-label">Nome do perfil</label>
        </div>
        <input
          id="mobile-profile-name"
          type="text"
          value={fullName}
          onChange={(event) => onFullNameChange(event.target.value)}
          placeholder="Como seu nome aparece no sistema"
          disabled={!backendReady || profileLoading}
          className="input"
        />
        <AppButton
          variant={primaryCard === 'profile' ? 'primary' : 'secondary'}
          fullWidth
          onClick={onSaveProfile}
          disabled={!backendReady || profileLoading}
          className="mt-4"
        >
          {profileLoading ? 'Salvando…' : 'Salvar nome'}
        </AppButton>
        {profileMessage ? <div className="mt-3"><Feedback message={profileMessage} tone="success" /></div> : null}
        {profileError ? <div className="mt-3"><Feedback message={profileError} tone="error" /></div> : null}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <Mail className="h-4 w-4" />
          <Text variant="label" as="p" className="text-inherit">Trocar e-mail</Text>
        </div>
        <label htmlFor="mobile-profile-email" className="mb-2 block t-label text-[var(--text-tertiary)]">
          Novo e-mail
        </label>
        <input
          id="mobile-profile-email"
          type="email"
          value={pendingEmail}
          onChange={(event) => onPendingEmailChange(event.target.value)}
          placeholder="novo-email@exemplo.com"
          disabled={!backendReady || emailLoading}
          className="input"
        />
        <Text variant="meta" as="p" className="mt-3 text-[var(--text-secondary)]">
          Enviaremos um link de confirmação para o novo endereço. A troca só termina depois que você
          validar esse e-mail.
        </Text>
        <AppButton
          variant={primaryCard === 'email' ? 'primary' : 'secondary'}
          fullWidth
          onClick={onSaveEmail}
          disabled={emailSubmitDisabled}
          className="mt-4"
        >
          {emailLoading ? 'Atualizando…' : 'Atualizar e-mail'}
        </AppButton>
        {/* O botão fica apagado até haver um e-mail novo; a frase explica, para não parecer quebrado. */}
        {backendReady && emailSubmitDisabled && !emailLoading ? (
          <Text variant="meta" className="mt-2">Digite um e-mail diferente do atual para atualizar.</Text>
        ) : null}
        {emailMessage ? <div className="mt-3"><Feedback message={emailMessage} tone="success" /></div> : null}
        {emailError ? <div className="mt-3"><Feedback message={emailError} tone="error" /></div> : null}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <KeyRound className="h-4 w-4" />
          <Text variant="label" as="p" className="text-inherit">Trocar senha</Text>
        </div>
        <div className="stack-md">
          <div className="stack-sm">
            <label htmlFor="mobile-profile-password" className="t-label text-[var(--text-tertiary)]">Nova senha</label>
            <input
              id="mobile-profile-password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Mínimo de 6 caracteres"
              disabled={!backendReady || passwordLoading}
              className="input"
              autoComplete="new-password"
            />
          </div>
          <div className="stack-sm">
            <label htmlFor="mobile-profile-password-confirm" className="t-label text-[var(--text-tertiary)]">Confirmar nova senha</label>
            <input
              id="mobile-profile-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder="Repita a nova senha"
              disabled={!backendReady || passwordLoading}
              className="input"
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="mt-3 rounded-[var(--radius-input)] bg-[var(--bg-primary)] px-4 py-3 t-meta text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
            <span>Use pelo menos 6 caracteres para manter o acesso seguro.</span>
          </div>
        </div>
        <AppButton
          variant={primaryCard === 'password' ? 'primary' : 'secondary'}
          fullWidth
          onClick={onSavePassword}
          disabled={!backendReady || passwordLoading}
          className="mt-4"
        >
          {passwordLoading ? 'Salvando…' : 'Atualizar senha'}
        </AppButton>
        {passwordMessage ? <div className="mt-3"><Feedback message={passwordMessage} tone="success" /></div> : null}
        {passwordError ? <div className="mt-3"><Feedback message={passwordError} tone="error" /></div> : null}
      </section>
    </div>
  );
}
