export function normalizeProfileAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('same')) {
    return 'Use um valor diferente do atual para salvar a alteração.';
  }

  if (normalizedMessage.includes('password')) {
    return 'A nova senha deve ter pelo menos 6 caracteres.';
  }

  if (normalizedMessage.includes('email')) {
    return 'Revise o e-mail informado e tente novamente.';
  }

  if (normalizedMessage.includes('auth') || normalizedMessage.includes('session')) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }

  return 'Não foi possível salvar a alteração agora.';
}
