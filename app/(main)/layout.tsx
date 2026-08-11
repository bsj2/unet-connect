import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'

export default function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      <Header />
      <Sidebar />
      <BottomNav />
      
      {/* Contenedor principal dinámico con espaciados globales */}
      <main className="flex-1 pt-16 pb-16 md:pb-0 md:pl-64">
        {children}
      </main>
      {modal}
    </>
  )
}