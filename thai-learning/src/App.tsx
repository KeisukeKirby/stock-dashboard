import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { SettingsProvider } from '@/hooks/useSettings'

const Home = lazy(() => import('@/pages/Home'))
const Today = lazy(() => import('@/pages/Today'))
const Quick = lazy(() => import('@/pages/Quick'))
const Tones = lazy(() => import('@/pages/Tones'))
const Phrases = lazy(() => import('@/pages/Phrases'))
const SceneDetail = lazy(() => import('@/pages/SceneDetail'))
const Listening = lazy(() => import('@/pages/Listening'))
const Roleplays = lazy(() => import('@/pages/Roleplays'))
const RoleplayPlay = lazy(() => import('@/pages/RoleplayPlay'))
const CurriculumPage = lazy(() => import('@/pages/CurriculumPage'))
const Settings = lazy(() => import('@/pages/Settings'))

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="p-6 text-center text-slate-400">読み込み中…</div>}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/today" element={<Today />} />
              <Route path="/quick" element={<Quick />} />
              <Route path="/tones" element={<Tones />} />
              <Route path="/phrases" element={<Phrases />} />
              <Route path="/phrases/:sceneId" element={<SceneDetail />} />
              <Route path="/listening" element={<Listening />} />
              <Route path="/roleplay" element={<Roleplays />} />
              <Route path="/roleplay/:id" element={<RoleplayPlay />} />
              <Route path="/curriculum" element={<CurriculumPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SettingsProvider>
  )
}
