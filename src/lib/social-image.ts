export interface ImageDimensions {
  width: number
  height: number
}

/** Limites de proporção (largura/altura) aceitos pelo feed do Instagram: 4:5 a 1,91:1. */
export const INSTAGRAM_MIN_ASPECT_RATIO = 0.8
export const INSTAGRAM_MAX_ASPECT_RATIO = 1.91

export function isInstagramAspectRatioSupported({ width, height }: ImageDimensions): boolean {
  if (width <= 0 || height <= 0) return false
  const ratio = width / height
  return ratio >= INSTAGRAM_MIN_ASPECT_RATIO && ratio <= INSTAGRAM_MAX_ASPECT_RATIO
}

/**
 * Mensagem de aviso quando a foto não serve pro Instagram (o n8n pula o
 * Instagram e publica só no Facebook). Retorna null quando a foto é compatível.
 * Só avisa — não bloqueia o envio pra aprovação.
 */
export function getInstagramAspectRatioWarning(dimensions: ImageDimensions): string | null {
  if (dimensions.width <= 0 || dimensions.height <= 0) return null
  if (isInstagramAspectRatioSupported(dimensions)) return null

  const ratio = (dimensions.width / dimensions.height).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (
    `Essa foto (${dimensions.width}×${dimensions.height}, proporção ${ratio}) não é compatível ` +
    'com o Instagram, que aceita proporções de 0,8 a 1,91. ' +
    'Escolha outra foto ou o post sairá só no Facebook.'
  )
}

/** Mede a foto no navegador (as imagens do imóvel não guardam largura/altura no banco). */
export function loadImageDimensions(url: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Não foi possível carregar a foto'))
    img.src = url
  })
}
