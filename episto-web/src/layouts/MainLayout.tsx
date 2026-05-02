import { Outlet } from 'react-router-dom'
import PrimaryRail from '../components/PrimaryRail'
import ContextSidebar from '../components/ContextSidebar'
import Header from '../components/Header'
import ExamNotification from '../components/ExamNotification'
import TutorPanel from '../components/TutorPanel'

export default function MainLayout() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#D3D3D3] font-sans">
      {/* 1. Primary Rail — 64px icon-only navigation */}
      <PrimaryRail />

      {/* 2. Contextual Sidebar — 240px file tree / exam history */}
      <ContextSidebar />

      {/* 3. Main Content — flex-1 */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-[#E9E9E7] dark:border-[#2A2A2A]">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* 4. Tutor Panel — resizable right sidebar */}
      <TutorPanel />

      <ExamNotification />
    </div>
  )
}
