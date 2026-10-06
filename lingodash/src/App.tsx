import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { SettingsProvider } from '@/hooks/useSettings'

const Home = lazy(() => import('@/pages/Home'))
const Today = lazy(() => import('@/pages/Today'))
const Quick = lazy(() => import('@/pages/Quick'))
const Practice = lazy(() => import('@/pages/Practice'))
const Pronunciation = lazy(() => import('@/pages/Pronunciation'))
const Vocab = lazy(() => import('@/pages/Vocab'))
const SceneDetail = lazy(() => import('@/pages/SceneDetail'))
const Grammar = lazy(() => import('@/pages/Grammar'))
const Listening = lazy(() => import('@/pages/Listening'))
const Speaking = lazy(() => import('@/pages/Speaking'))
const RoleplayPlay = lazy(() => import('@/pages/RoleplayPlay'))
const Writing = lazy(() => import('@/pages/Writing'))
const Plan = lazy(() => import('@/pages/Plan'))
const LevelCheck = lazy(() => import('@/pages/LevelCheck'))
const Stats = lazy(() => import('@/pages/Stats'))
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
              <Route path="/practice" element={<Practice />} />
              <Route path="/pronunciation" element={<Pronunciation />} />
              <Route path="/vocab" element={<Vocab />} />
              <Route path="/vocab/:sceneId" element={<SceneDetail />} />
              <Route path="/grammar" element={<Grammar />} />
              <Route path="/grammar/:unitId" element={<Grammar />} />
              <Route path="/listening" element={<Listening />} />
              <Route path="/speaking" element={<Speaking />} />
              <Route path="/roleplay/:id" element={<RoleplayPlay />} />
              <Route path="/writing" element={<Writing />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/plan/:tab" element={<Plan />} />
              <Route path="/level-check" element={<LevelCheck />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SettingsProvider>
  )
}
