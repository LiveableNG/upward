import BottomNav from '@/components/dashboard/BottomNav'
import AiWidget from '@/components/dashboard/AiWidget'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-layout">
      {/* 
        On Mobile, this nav sits at the bottom.
        On Desktop, globals.css media queries will force it into a fixed left Sidebar.
      */}
      <BottomNav />
      
      {/* The main scrollable content area */}
      <main className="dashboard-layout__main">
        {children}
      </main>

      {/* Globally mounting AI Widget for the entire dashboard */}
      <AiWidget />
    </div>
  )
}
