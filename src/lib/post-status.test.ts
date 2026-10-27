import { describe, expect, it } from 'vitest'
import { describePostStatus, isPostInFlight } from './post-status'

const base = { ig_post_id: null, fb_post_id: null, error_message: null }

describe('describePostStatus', () => {
  it('publicado nos dois canais', () => {
    expect(describePostStatus({ ...base, status: 'published', ig_post_id: 'ig1', fb_post_id: 'fb1' })).toEqual({
      label: 'Publicado',
      tone: 'success',
      detail: null,
    })
  })

  it('publicado só no Facebook mostra o motivo do Instagram', () => {
    const view = describePostStatus({
      ...base,
      status: 'published',
      fb_post_id: 'fb1',
      error_message: 'Instagram: proporção inválida',
    })
    expect(view.label).toBe('Publicado só no Facebook')
    expect(view.detail).toBe('Instagram: proporção inválida')
  })

  it('falhou traz o error_message', () => {
    const view = describePostStatus({ ...base, status: 'failed', error_message: 'FB: token expirado' })
    expect(view.tone).toBe('error')
    expect(view.detail).toBe('FB: token expirado')
  })

  it('falhou sem motivo nunca fica em branco', () => {
    expect(describePostStatus({ ...base, status: 'failed', error_message: '  ' }).detail).toBe('Motivo não informado.')
  })

  it('aprovado aparece como publicando', () => {
    expect(describePostStatus({ ...base, status: 'approved' }).label).toBe('Publicando...')
  })
})

describe('isPostInFlight', () => {
  it('só approved/publishing estão em andamento no n8n', () => {
    expect(isPostInFlight('approved')).toBe(true)
    expect(isPostInFlight('publishing')).toBe(true)
    expect(isPostInFlight('pending_approval')).toBe(false)
    expect(isPostInFlight('published')).toBe(false)
  })
})
