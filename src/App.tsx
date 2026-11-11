import { useConvexAuth } from 'convex/react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppDataProvider, useMe } from './lib/app'
import { devNoAuth } from './lib/auth'
import { Loading } from './lib/ui'
import Shell from './components/Shell'
import SignIn from './screens/SignIn'
import FirstRun from './screens/FirstRun'
import Trip from './screens/Trip'
import MapScreen from './screens/MapScreen'
import Money from './screens/Money'
import Life from './screens/Life'
import Compare from './screens/Compare'
import Editor from './screens/Editor'
import Progress from './screens/Progress'
import Settings from './screens/Settings'
import Profile from './screens/Profile'
import Paperwork from './screens/Paperwork'
import Settlement from './screens/Settlement'
import SharePage from './screens/SharePage'

export default function App() {
  const { pathname } = useLocation()
  const { isLoading, isAuthenticated } = useConvexAuth()
  // Share links work without signing in.
  if (pathname.startsWith('/share/')) return <SharePage />
  if (devNoAuth) return <Signed />
  if (isLoading) return <Loading />
  if (!isAuthenticated) return <SignIn />
  return <Signed />
}

function Signed() {
  const me = useMe()
  if (me === undefined) return <Loading />
  if (me === null) return <Loading label="Signing you in" />
  if (!me.profile || !me.profile.onboarded || me.scenarios.length === 0) return <FirstRun />
  return (
    <AppDataProvider me={me}>
      <Shell>
        <Routes>
          <Route path="/" element={<Trip />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/money" element={<Money />} />
          <Route path="/life" element={<Life />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/paperwork" element={<Paperwork />} />
          <Route path="/settlement" element={<Settlement />} />
          <Route path="/scenario/:id" element={<Editor />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/more" element={<Navigate to="/profile" replace />} />
          <Route path="/link" element={<Navigate to="/settings/loot" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:section" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </AppDataProvider>
  )
}
