import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
  }
})

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: class {},
  CategoryScale: class {},
  LinearScale: class {},
  PointElement: class {},
  LineElement: class {},
  Filler: class {},
  Tooltip: class {},
  Legend: class {},
}))

vi.mock('react-chartjs-2', () => ({
  Line: () => null,
}))
