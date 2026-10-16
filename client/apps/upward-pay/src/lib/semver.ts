/**
 * Client semver parsing & comparison utility.
 */
export function parseSemver(version?: string | null): number[] {
  if (!version || typeof version !== 'string') return [0, 0, 0]
  const clean = (version.trim().replace(/^v/i, '').split('-')[0] || '').split('+')[0] || ''
  const parts = clean.split('.').map((p) => {
    const num = parseInt(p, 10)
    return isNaN(num) ? 0 : num
  })
  while (parts.length < 3) parts.push(0)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

export function compareSemver(a?: string | null, b?: string | null): number {
  const partsA = parseSemver(a)
  const partsB = parseSemver(b)

  for (let i = 0; i < 3; i++) {
    const valA = partsA[i] ?? 0
    const valB = partsB[i] ?? 0
    if (valA > valB) return 1
    if (valA < valB) return -1
  }

  return 0
}

export function isVersionOlder(
  clientVersion: string,
  clientBuild: number,
  targetVersion: string,
  targetBuild?: number,
): boolean {
  const cmp = compareSemver(clientVersion, targetVersion)
  if (cmp < 0) return true
  if (cmp > 0) return false

  if (typeof targetBuild === 'number' && targetBuild > 0) {
    return clientBuild < targetBuild
  }

  return false
}
