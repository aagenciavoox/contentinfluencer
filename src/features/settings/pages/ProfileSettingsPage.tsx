import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { ProfileMobileScreen } from '../../../mobile/screens/settings/ProfileMobileScreen';
import { normalizeProfileAuthError } from '../lib/profileAuth';

function Feedback({
  message,
  tone,
}: {
  message: string;
  tone: 'success' | 'error';
}) {
  const classes =
    tone === 'success'
      ? 'border-[var(--accent-green)]/20 bg-[var(--accent-green)]/8 text-[var(--accent-green)]'
      : 'border-[var(--accent-pink)]/20 bg-[var(--accent-pink)]/8 text-[var(--accent-pink)]';

  return <p className={`rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border px-4 py-3 text-sm ${classes}`}>{message}</p>;
}

function SectionCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: typeof UserCircle2;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-hover)] p-3 text-[var(--text-primary)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { backendReady, user, updateEmail, updatePassword, updateProfile } = useAuth();

  const initialFullName = useMemo(
    () => String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''),
    [user]
  );
  const initialEmail = user?.email ?? '';

  const [fullName, setFullName] = useState(initialFullName);
  const [pendingEmail, setPendingEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(initialFullName);
  }, [initialFullName]);

  useEffect(() => {
    setPendingEmail(initialEmail);
  }, [initialEmail]);

  const clearProfileFeedback = () => {
    setProfileMessage(null);
    setProfileError(null);
  };

  const clearEmailFeedback = () => {
    setEmailMessage(null);
    setEmailError(null);
  };

  const clearPasswordFeedback = () => {
    setPasswordMessage(null);
    setPasswordError(null);
  };

  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    clearProfileFeedback();

    if (!trimmedName) {
      setProfileError('Informe o nome que deve aparecer no perfil.');
      return;
    }

    if (trimmedName === initialFullName.trim()) {
      setProfileMessage('Seu nome já está atualizado.');
      return;
    }

    setProfileLoading(true);

    try {
      await updateProfile({ fullName: trimmedName });
      setProfileMessage('Nome do perfil atualizado.');
    } catch (error) {
      setProfileError(normalizeProfileAuthError(error instanceof Error ? error.message : ''));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    const trimmedEmail = pendingEmail.trim();
    clearEmailFeedback();

    if (!trimmedEmail) {
      setEmailError('Informe o novo e-mail.');
      return;
    }

    if (trimmedEmail === initialEmail.trim()) {
      setEmailMessage('Esse já é o e-mail atual da conta.');
      return;
    }

    setEmailLoading(true);

    try {
      await updateEmail(trimmedEmail);
      setEmailMessage('Pedido de troca de e-mail enviado. Verifique sua caixa de entrada.');
    } catch (error) {
      setEmailError(normalizeProfileAuthError(error instanceof Error ? error.message : ''));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSavePassword = async () => {
    clearPasswordFeedback();

    if (!password || !confirmPassword) {
      setPasswordError('Preencha e confirme a nova senha.');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Use uma nova senha com pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('A confirmação da senha não confere.');
      return;
    }

    setPasswordLoading(true);

    try {
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setPasswordMessage('Senha atualizada com sucesso.');
    } catch (error) {
      setPasswordError(normalizeProfileAuthError(error instanceof Error ? error.message : ''));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <ProfileMobileScreen
          backendReady={backendReady}
          accountEmail={initialEmail}
          fullName={fullName}
          pendingEmail={pendingEmail}
          password={password}
          confirmPassword={confirmPassword}
          profileLoading={profileLoading}
          emailLoading={emailLoading}
          passwordLoading={passwordLoading}
          profileMessage={profileMessage}
          emailMessage={emailMessage}
          passwordMessage={passwordMessage}
          profileError={profileError}
          emailError={emailError}
          passwordError={passwordError}
          onFullNameChange={(value) => {
            clearProfileFeedback();
            setFullName(value);
          }}
          onPendingEmailChange={(value) => {
            clearEmailFeedback();
            setPendingEmail(value);
          }}
          onPasswordChange={(value) => {
            clearPasswordFeedback();
            setPassword(value);
          }}
          onConfirmPasswordChange={(value) => {
            clearPasswordFeedback();
            setConfirmPassword(value);
          }}
          onSaveProfile={handleSaveProfile}
          onSaveEmail={handleSaveEmail}
          onSavePassword={handleSavePassword}
        />
      </div>
    );
  }

  return (
    <PageLayout
      variant="settings"
      contentClassName="space-y-6"
      header={
        <DesktopPageHeader
          section="Configurações"
          title="Perfil"
          icon={UserCircle2}
          backLabel="Configurações"
          backTo="/configuracoes"
        />
      }
    >
        {!backendReady ? (
          <Feedback
            message="Conecte o Supabase para habilitar alterações de perfil, e-mail e senha."
            tone="error"
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard
            icon={UserCircle2}
            eyebrow="Perfil"
            title="Nome público"
            description="Ajuste o nome usado no cadastro e em experiências futuras do sistema."
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="profile-full-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Nome
                </label>
                <input
                  id="profile-full-name"
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    clearProfileFeedback();
                    setFullName(event.target.value);
                  }}
                  placeholder="Seu nome"
                  disabled={!backendReady || profileLoading}
                  className="input"
                />
              </div>
              <AppButton
                onClick={handleSaveProfile}
                variant="primary"
                disabled={!backendReady || profileLoading}
              >
                {profileLoading ? 'Salvando' : 'Salvar nome'}
              </AppButton>
              {profileMessage ? <Feedback message={profileMessage} tone="success" /> : null}
              {profileError ? <Feedback message={profileError} tone="error" /> : null}
            </div>
          </SectionCard>

          <SectionCard
            icon={Mail}
            eyebrow="Acesso"
            title="E-mail da conta"
            description="Troque o endereço principal usado no login."
          >
            <div className="space-y-4">
              <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-hover)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  E-mail atual
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{initialEmail || 'Sem e-mail identificado'}</p>
              </div>
              <div>
                <label htmlFor="profile-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Novo e-mail
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={pendingEmail}
                  onChange={(event) => {
                    clearEmailFeedback();
                    setPendingEmail(event.target.value);
                  }}
                  placeholder="novo-email@exemplo.com"
                  disabled={!backendReady || emailLoading}
                  className="input"
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Em ambientes com confirmação ativa, a mudança só termina após validar o novo endereço.
              </p>
              <AppButton
                onClick={handleSaveEmail}
                variant="primary"
                disabled={!backendReady || emailLoading}
              >
                {emailLoading ? 'Atualizando' : 'Atualizar e-mail'}
              </AppButton>
              {emailMessage ? <Feedback message={emailMessage} tone="success" /> : null}
              {emailError ? <Feedback message={emailError} tone="error" /> : null}
            </div>
          </SectionCard>

          <SectionCard
            icon={KeyRound}
            eyebrow="Segurança"
            title="Senha"
            description="Defina uma nova senha para manter o acesso seguro no desktop e no mobile."
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="profile-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Nova senha
                </label>
                <input
                  id="profile-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    clearPasswordFeedback();
                    setPassword(event.target.value);
                  }}
                  placeholder="Digite a nova senha"
                  disabled={!backendReady || passwordLoading}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="profile-password-confirm" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Confirmar senha
                </label>
                <input
                  id="profile-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    clearPasswordFeedback();
                    setConfirmPassword(event.target.value);
                  }}
                  placeholder="Repita a nova senha"
                  disabled={!backendReady || passwordLoading}
                  className="input"
                />
              </div>
              <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-hover)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--accent-green)]" />
                  <span>Use pelo menos 6 caracteres e prefira uma combinação exclusiva.</span>
                </div>
              </div>
              <AppButton
                onClick={handleSavePassword}
                variant="primary"
                disabled={!backendReady || passwordLoading}
              >
                {passwordLoading ? 'Salvando' : 'Atualizar senha'}
              </AppButton>
              {passwordMessage ? <Feedback message={passwordMessage} tone="success" /> : null}
              {passwordError ? <Feedback message={passwordError} tone="error" /> : null}
            </div>
          </SectionCard>
        </div>
    </PageLayout>
  );
}
