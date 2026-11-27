import { AppRouter } from '../routes/AppRouter'
import { AppProviders } from './AppProviders'

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
