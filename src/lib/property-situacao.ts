import type { Database } from './database.types'

export type PropertySituacao = Database['public']['Enums']['property_status']
type OperationType = Database['public']['Enums']['property_intent']

export const SITUACAO_LABELS: Record<PropertySituacao, string> = {
  disponivel: 'Disponível',
  em_negociacao: 'Em negociação',
  vendido: 'Vendido',
  alugado: 'Alugado',
  arquivado: 'Arquivado',
}

export const SITUACAO_COLORS: Record<PropertySituacao, string> = {
  disponivel: 'bg-green-100 text-green-700',
  em_negociacao: 'bg-yellow-100 text-yellow-700',
  vendido: 'bg-blue-100 text-blue-700',
  alugado: 'bg-purple-100 text-purple-700',
  arquivado: 'bg-gray-100 text-gray-600',
}

// arquivado é legado ("Fechado com outra corretora", migrado pra vendido/alugado):
// não é oferecido na caixinha, só aparece se o imóvel ainda estiver nele.
const ORDER: PropertySituacao[] = ['disponivel', 'em_negociacao', 'vendido', 'alugado']

/** Situações que tiram o imóvel do site e da lista padrão ("Mostrar arquivados"). */
export function isForaDoSite(situacao: PropertySituacao | null | undefined): boolean {
  return situacao === 'vendido' || situacao === 'alugado' || situacao === 'arquivado'
}

/** vendido só em venda; alugado só em aluguel. operation_type nulo = venda (default do banco). */
export function isSituacaoPermitida(situacao: PropertySituacao, operationType: OperationType | null | undefined): boolean {
  const tipo = operationType ?? 'venda'
  if (situacao === 'vendido') return tipo === 'venda'
  if (situacao === 'alugado') return tipo === 'aluguel'
  return true
}

export function situacoesPermitidas(operationType: OperationType | null | undefined): PropertySituacao[] {
  return ORDER.filter((s) => isSituacaoPermitida(s, operationType))
}

/** Só vendido/alugado pedem confirmação (saem do site). */
export function precisaConfirmar(situacao: PropertySituacao): boolean {
  return situacao === 'vendido' || situacao === 'alugado'
}
