import { useConvexAuth } from 'convex/react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppDataProvider, useMe } from './lib/app'
import { useAuth } from './lib/auth'
import { supabaseConfigured } from './lib/supabase'
import { Loading } from './lib/ui'
import Shell from './components/Shell'
import SignIn from './screens/SignIn'
import FirstRun from './screens/FirstRun'
import Home from './screens/Home'
import MapScreen from './screens/MapScreen'
import Money from './screens/Money'
import Life from './screens/Life'
import Compare from './screens/Compare'
import Editor from './screens/Editor'
import Progress from './screens/Progress'
import Settings from './screens/Settings'
import More from './screens/More'

export default function App() {
  const { session, loading, dev } = useAuth()
  if (!supabaseConfigured && !dev) {
    return <Loading label="Northbound needs Loot's Supabase settings in .env.local" />
  }
  if (loading) return <Loading />
  if (!session && !dev) return <SignIn />
  return <Signed />
}

function Signed() {
  const { isLoading } = useConvexAuth()
  const me = useMe()
  if (isLoading || me === undefined) return <Loading />
  if (me === null) return <Loading label="Signing you in" />
  if (!me.profile || !me.profile.onboarded || me.scenarios.length === 0) return <FirstRun />
  return (
    <AppDataProvider me={me}>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/money" element={<Money />} />
          <Route path="/life" element={<Life />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/scenario/:id" element={<Editor />} />
          <Route path="/more" element={<More />} />
          <Route path="/link" element={<Navigate to="/settings/loot" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:section" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </AppDataProvider>
  )
}
