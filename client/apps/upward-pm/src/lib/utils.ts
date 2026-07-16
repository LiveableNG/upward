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

export function formatTenantName(tenant?: { commercialName?: string; firstName?: string; lastName?: string }): string {
  if (!tenant) return '';
  const fullName = `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
  const cName = (tenant.commercialName || '').trim();
  if (!cName && !fullName) return '';
  return cName || fullName;
}

export function dedupeBanksByCode<T extends { code: string }>(banks: T[]): T[] {
  return Array.from(new Map(banks.map((b) => [b.code, b])).values());
}

