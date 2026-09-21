import { describe, expect, it } from 'vitest'
import { getInstagramAspectRatioWarning, isInstagramAspectRatioSupported } from './social-image'

describe('isInstagramAspectRatioSupported', () => {
  it('aceita proporções dentro de 0,8 a 1,91', () => {
    expect(isInstagramAspectRatioSupported({ width: 1000, height: 1000 })).toBe(true) // 1:1
    expect(isInstagramAspectRatioSupported({ width: 906, height: 680 })).toBe(true) // 1,33 (post que publicou)
    expect(isInstagramAspectRatioSupported({ width: 1080, height: 1350 })).toBe(true) // 4:5 = limite mínimo
    expect(isInstagramAspectRatioSupported({ width: 1910, height: 1000 })).toBe(true) // 1,91 = limite máximo
  })

  it('recusa proporções fora do intervalo', () => {
    expect(isInstagramAspectRatioSupported({ width: 1024, height: 461 })).toBe(false) // 2,22 (post que falhou)
    expect(isInstagramAspectRatioSupported({ width: 1000, height: 1500 })).toBe(false) // 0,67
  })

  it('recusa dimensões inválidas', () => {
    expect(isInstagramAspectRatioSupported({ width: 0, height: 100 })).toBe(false)
    expect(isInstagramAspectRatioSupported({ width: 100, height: 0 })).toBe(false)
  })
})

describe('getInstagramAspectRatioWarning', () => {
  it('não avisa quando a foto é compatível', () => {
    expect(getInstagramAspectRatioWarning({ width: 906, height: 680 })).toBeNull()
  })

  it('não avisa quando as dimensões são desconhecidas', () => {
    expect(getInstagramAspectRatioWarning({ width: 0, height: 0 })).toBeNull()
  })

  it('avisa com dimensões e proporção quando a foto é incompatível', () => {
    const warning = getInstagramAspectRatioWarning({ width: 1024, height: 461 })
    expect(warning).toContain('1024×461')
    expect(warning).toContain('2,22')
    expect(warning).toContain('só no Facebook')
  })
})
