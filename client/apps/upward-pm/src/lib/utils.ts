export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
