import { describe, expect, it } from 'vitest'
import { sanitizeCaption } from './caption-sanitize'

// Descrição real do imóvel 58ec803a-d2e8-45cc-b3dc-b8523db16d2c (ref IMO-987251B0).
const IMO_987251B0 =
  '🏡✨ **CASA EM ESTILO COLONIAL NO BLUE GARDEN ECOVILLE! VENDA OU LOCAÇÃO!** 🔥\n\n😍 Charme, conforto e versatilidade em um dos condomínios mais desejados de São Pedro da Aldeia!\n\n🌟 **DIFERENCIAL: POSSIBILIDADE DE DUAS RESIDÊNCIAS INDEPENDENTES!**\n\n🏠 Casa principal com:\\\n🔹 2 suítes, sendo 1 master com closet e banheira\\\n🔹 Sala ampla integrada à cozinha americana\\\n🔹 Área de serviço\n\n🏡 Segunda residência nos fundos:\\\n🔹 1 suíte\\\n🔹 Sala espaçosa\\\n🔹 Cozinha gourmet completa\n\n🚗 Garagem para até 3 veículos | Terreno de 360 m².\n\n🌴 **CONDOMÍNIO COMPLETO!**\\\nPiscina com raia e bar molhado, sauna, quadras esportivas, playground, espaço kids, gourmet e portaria com segurança 24 horas!\n\n📍 Excelente localização, próximo ao Centro, supermercados, escolas, farmácias, academias e comércio em geral.\n\n💰 **VALORES:**\\\n🏷️ VENDA: R$ 1.600.000\\\n🔑 LOCAÇÃO: R$ 8.000/mês\n\n📅 Locação disponível a partir de fevereiro!\n\n📲 **AGENDE SUA VISITA! ATENDIMENTO IMEDIATO!**\n\n👉 WhatsApp: [https://wa.me/552299971624?text=Ol%C3%A1%21%20Tenho%20interesse%20no%20im%C3%B3vel%20C%C3%B3d.%20557](https://wa.me/552299971624?text=Ol%C3%A1%21%20Tenho%20interesse%20no%20im%C3%B3vel%20C%C3%B3d.%20557).\n\n🏡 **SENA CORRETOR DE IMÓVEIS**\\\n📌 CÓD. 557'

describe('sanitizeCaption', () => {
  it('limpa a descrição do IMO-987251B0', () => {
    const out = sanitizeCaption(IMO_987251B0)
    expect(out).not.toMatch(/\*\*|__/)
    expect(out).not.toMatch(/\\/)
    expect(out).not.toMatch(/wa\.me|https?:/)
    expect(out).not.toMatch(/\n{3,}/)
    expect(out).toContain('👉 WhatsApp: (22) 9997-1624\n')
    expect(out).not.toContain('WhatsApp: WhatsApp')
    expect(out.startsWith('🏡✨ CASA EM ESTILO COLONIAL NO BLUE GARDEN ECOVILLE! VENDA OU LOCAÇÃO! 🔥')).toBe(true)
    expect(out).toContain('🏠 Casa principal com:\n🔹 2 suítes, sendo 1 master com closet e banheira\n🔹 Sala ampla')
    expect(out.endsWith('🏡 SENA CORRETOR DE IMÓVEIS\n📌 CÓD. 557')).toBe(true)
  })

  it('link markdown comum vira só a url', () => {
    expect(sanitizeCaption('Veja [aqui](https://site.com/x) e [https://a.com](https://a.com)')).toBe(
      'Veja https://site.com/x e https://a.com',
    )
  })

  it('wa.me solto sem rótulo ganha "WhatsApp:" e celular de 9 dígitos', () => {
    expect(sanitizeCaption('Fale: https://wa.me/5522999971624')).toBe('Fale: WhatsApp: (22) 99997-1624')
  })

  it('remove título markdown mas preserva hashtags', () => {
    expect(sanitizeCaption('## Casa linda\n#imóveis #CaboFrio')).toBe('Casa linda\n#imóveis #CaboFrio')
  })

  it('colapsa quebras e tolera vazio', () => {
    expect(sanitizeCaption('a\n\n\n\nb')).toBe('a\n\nb')
    expect(sanitizeCaption(null)).toBe('')
  })
})
