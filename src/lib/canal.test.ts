import { describe, expect, it } from 'vitest'
import { canalLabel } from './canal'

describe('canalLabel', () => {
  it('devolve o label de um canal conhecido', () => {
    expect(canalLabel('instagram')).toBe('Instagram')
  })

  it('devolve — quando a origem é null (lead criado no CRM)', () => {
    expect(canalLabel(null)).toBe('—')
  })

  it('devolve — para valor desconhecido', () => {
    expect(canalLabel('tiktok')).toBe('—')
    expect(canalLabel('toString')).toBe('—')
  })
})
