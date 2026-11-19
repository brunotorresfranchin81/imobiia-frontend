/**
 * Limpa o texto da descrição/legenda pra ir ao Instagram/Facebook e ser
 * exibido no CRM. A description vem de editores com markdown (negrito, quebra
 * de linha com "\", links [url](url)) que nessas redes aparecem crus.
 */

const WA_URL = String.raw`https?:\/\/(?:api\.)?(?:wa\.me|whatsapp\.com\/send)\/?[^\s)\]]*`

function formatBrPhone(digits: string): string {
  let d = digits
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length < 10) return d
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  const split = rest.length - 4
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
}

function phoneFromWaUrl(url: string): string | null {
  const match = url.match(/wa\.me\/(\d+)/) ?? url.match(/[?&]phone=(\d+)/)
  return match ? formatBrPhone(match[1]) : null
}

export function sanitizeCaption(text: string | null | undefined): string {
  if (!text) return ''
  let out = text.replace(/\r\n?/g, '\n')

  // Link wa.me (markdown ou solto) vira "WhatsApp: (DDD) número" — link não é clicável no Instagram.
  const waPattern = new RegExp(
    String.raw`(WhatsApp:?\s*)?(?:\[[^\]]*\]\((${WA_URL})\)|(${WA_URL}))\.?`,
    'gi',
  )
  out = out.replace(waPattern, (whole, _label: string | undefined, mdUrl?: string, bareUrl?: string) => {
    const phone = phoneFromWaUrl(mdUrl ?? bareUrl ?? '')
    if (!phone) return whole
    return `WhatsApp: ${phone}`
  })

  // [texto](url) → url (sem duplicar)
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, _label: string, url: string) => url)

  // negrito/sublinhado markdown
  out = out.replace(/\*\*|__/g, '')

  // "\" solta no fim de linha (quebra de linha do markdown)
  out = out.replace(/[ \t]*\\+[ \t]*$/gm, '')

  // espaços no fim de linha e 3+ quebras → 2
  out = out.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n')

  return out.trim()
}
