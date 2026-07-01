import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { DataProvider } from './context/DataContext'
import ComparePage from './pages/ComparePage'
import DashboardPage from './pages/DashboardPage'
import ExecutivePage from './pages/ExecutivePage'
import TicketPage from './pages/TicketPage'

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="diretoria" element={<ExecutivePage />} />
            <Route path="comparar" element={<ComparePage />} />
            <Route path="ticket" element={<TicketPage />} />
          </Route>
        </Routes>
      </DataProvider>
    </BrowserRouter>
  )
}
