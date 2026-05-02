import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import VaultPage from './pages/VaultPage'
import AssessmentsPage from './pages/AssessmentsPage'
import TutorPage from './pages/TutorPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/assessments" element={<AssessmentsPage />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="*" element={<Navigate to="/vault" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
