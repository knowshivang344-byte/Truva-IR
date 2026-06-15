import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardPage from './app/dashboard/page'
import InvestigatePage from './app/investigate/page'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/investigate/:id" element={<InvestigatePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
