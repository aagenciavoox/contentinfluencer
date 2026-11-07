/**
 * Inteiro zero ou maior. Vazio não é número. "1.5", "-1" e texto também não:
 * o ponto não vira outro dígito e o sinal não passa.
 */
export function inteiroNaoNegativo(texto: string): number | null {
  const limpo = texto.trim();
  if (!/^\d+$/.test(limpo)) return null;
  const valor = Number(limpo);
  return Number.isSafeInteger(valor) ? valor : null;
}
