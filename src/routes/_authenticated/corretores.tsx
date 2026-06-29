import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/corretores')({
  component: CorretoresLayout,
})

function CorretoresLayout() {
  return <Outlet />
}
