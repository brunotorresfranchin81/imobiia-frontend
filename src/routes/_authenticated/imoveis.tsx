import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/imoveis')({
  component: ImoveisLayout,
})

function ImoveisLayout() {
  return <Outlet />
}
