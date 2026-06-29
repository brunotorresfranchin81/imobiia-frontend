import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { LeadStatusCount } from '#/lib/analytics'

const STATUS_COLORS: Record<string, string> = {
  quente: '#16a34a',
  morno: '#d97706',
  frio: '#6b7280',
  novo: '#0E3A52',
  qualificado: '#2563eb',
  em_visita: '#7c3aed',
  proposta: '#db2777',
  fechado: '#16a34a',
  perdido: '#ef4444',
  arquivado: '#6b7280',
}

const DEFAULT_COLOR = '#94a3b8'

interface LeadsByStatusChartProps {
  data: LeadStatusCount[]
}

export function LeadsByStatusChart({ data }: LeadsByStatusChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
        <XAxis dataKey="status" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] ?? DEFAULT_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
