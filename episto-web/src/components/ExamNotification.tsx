import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAppStore } from '../store'

export default function ExamNotification() {
  const notification = useAppStore((s) => s.notification)
  const setNotification = useAppStore((s) => s.setNotification)
  const navigate = useNavigate()
  const location = useLocation()

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(null), 5000)
    return () => clearTimeout(timer)
  }, [notification, setNotification])

  // Don't show notification if already on the assessments page
  const alreadyOnAssessments = location.pathname === '/assessments'
  if (!notification || alreadyOnAssessments) return null

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-3 bg-white dark:bg-[#2A2A2A] border border-[rgba(0,0,0,0.1)] dark:border-[#3A3A3A] rounded px-4 py-2.5 shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.027)_0px_2px_7.85px,rgba(0,0,0,0.02)_0px_0.8px_2.93px]"
      >
        <p className="text-[13px] text-[#37352F] dark:text-[#D3D3D3] leading-snug max-w-xs">
          {notification}
        </p>
        <button
          onClick={() => {
            setNotification(null)
            navigate('/assessments')
          }}
          className="text-[13px] font-medium text-[#0075de] dark:text-[#4DA3E8] hover:underline shrink-0"
        >
          前往评测室 →
        </button>
        <button
          onClick={() => setNotification(null)}
          className="ml-1 text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#37352F] dark:hover:text-[#D3D3D3] transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
