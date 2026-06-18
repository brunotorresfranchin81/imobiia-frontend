import { useState } from 'react'
import { createFileRoute, redirect, Outlet, Link, useRouter } from '@tanstack/react-router'
import { getSession, signOut } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/auth/login' })
    }
  },
  component: AuthenticatedLayout,
})

const navItems = [
  { label: 'Visão Geral', to: '/dashboard' },
  { label: 'Imóveis', to: '/imoveis' },
  { label: 'Oportunidades', to: '/oportunidades' },
] as const

function AuthenticatedLayout() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    void router.navigate({ to: '/auth/login' })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#0E3A52] text-white transition-transform duration-200',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex flex-col items-center px-6 py-8">
          <span className="text-2xl font-bold tracking-widest">IMOBIIA</span>
          <span className="mt-1 text-xs tracking-widest text-white/60 uppercase">
            Gestão Imobiliária
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center rounded-md px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              activeProps={{ className: 'flex items-center rounded-md px-3 py-2.5 text-sm font-medium bg-white/15 text-white' }}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={() => { void handleSignOut() }}
            className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-auto">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>
          <span className="font-semibold text-[#0E3A52]">IMOBIIA</span>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
