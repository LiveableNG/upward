export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number, currency: string = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatCurrencyInput(amount: number | undefined | null): string {
  if (amount === null || amount === undefined) return '';
  if (!Number.isFinite(amount)) return '';
  if (amount <= 0) return '';
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(Math.trunc(amount));
}

export function parseCurrencyInput(value: string): number | null {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return null;
  const n = Number(digitsOnly);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatTenantName(tenant?: { commercialName?: string; firstName?: string; lastName?: string }): string {
  if (!tenant) return '';
  
  const sanitize = (name?: string | null) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.toLowerCase() === 'null') return '';
    return trimmed;
  };

  const fName = sanitize(tenant.firstName);
  const lName = sanitize(tenant.lastName);
  const cName = sanitize(tenant.commercialName);

  const fullName = `${fName} ${lName}`.trim();
  if (!cName && !fullName) return '';
  return cName || fullName;
}

export function dedupeBanksByCode<T extends { code: string }>(banks: T[]): T[] {
  return Array.from(new Map(banks.map((b) => [b.code, b])).values());
}

