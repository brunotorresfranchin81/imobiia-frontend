import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

interface KpiCardProps {
  label: string
  value: number | string
  description?: string
}

export function KpiCard({ label, value, description }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
