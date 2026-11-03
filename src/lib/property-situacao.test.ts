import { describe, expect, it } from 'vitest'
import { isForaDoSite, isSituacaoPermitida, precisaConfirmar, situacoesPermitidas } from './property-situacao'

describe('isSituacaoPermitida', () => {
  it('vendido só em imóvel de venda', () => {
    expect(isSituacaoPermitida('vendido', 'venda')).toBe(true)
    expect(isSituacaoPermitida('vendido', 'aluguel')).toBe(false)
  })

  it('alugado só em imóvel de aluguel', () => {
    expect(isSituacaoPermitida('alugado', 'aluguel')).toBe(true)
    expect(isSituacaoPermitida('alugado', 'venda')).toBe(false)
  })

  it('tipo de negócio nulo conta como venda', () => {
    expect(isSituacaoPermitida('vendido', null)).toBe(true)
    expect(isSituacaoPermitida('alugado', null)).toBe(false)
  })

  it('disponivel, em_negociacao e arquivado valem para os dois', () => {
    for (const tipo of ['venda', 'aluguel'] as const) {
      expect(isSituacaoPermitida('disponivel', tipo)).toBe(true)
      expect(isSituacaoPermitida('em_negociacao', tipo)).toBe(true)
      expect(isSituacaoPermitida('arquivado', tipo)).toBe(true)
    }
  })
})

describe('situacoesPermitidas', () => {
  it('lista as opções da caixinha conforme o tipo de negócio, sem o arquivado legado', () => {
    expect(situacoesPermitidas('venda')).toEqual(['disponivel', 'em_negociacao', 'vendido'])
    expect(situacoesPermitidas('aluguel')).toEqual(['disponivel', 'em_negociacao', 'alugado'])
  })
})

describe('isForaDoSite / precisaConfirmar', () => {
  it('vendido, alugado e arquivado saem do site; em negociação continua', () => {
    expect(isForaDoSite('vendido')).toBe(true)
    expect(isForaDoSite('alugado')).toBe(true)
    expect(isForaDoSite('arquivado')).toBe(true)
    expect(isForaDoSite('em_negociacao')).toBe(false)
    expect(isForaDoSite('disponivel')).toBe(false)
    expect(isForaDoSite(null)).toBe(false)
  })

  it('só vendido e alugado pedem confirmação', () => {
    expect(precisaConfirmar('vendido')).toBe(true)
    expect(precisaConfirmar('alugado')).toBe(true)
    expect(precisaConfirmar('em_negociacao')).toBe(false)
    expect(precisaConfirmar('disponivel')).toBe(false)
    expect(precisaConfirmar('arquivado')).toBe(false)
  })
})
