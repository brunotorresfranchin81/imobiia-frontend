export type Canal = 'instagram' | 'facebook' | 'google' | 'site'

export const CANAL_LABELS: Record<Canal, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  site: 'Site',
}

export function canalLabel(origem: string | null): string {
  if (origem && Object.hasOwn(CANAL_LABELS, origem)) return CANAL_LABELS[origem as Canal]
  return '—'
}
