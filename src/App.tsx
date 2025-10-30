import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import CompleteProfile from './pages/CompleteProfile'
import Profile from './pages/Profile'
import MapPage from './pages/Map'
import ChatPage from './pages/Chat'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}> 
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/profile/:uid?" element={<Profile />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/chat/:uid?" element={<ChatPage />} />
      </Route>
    </Routes>
  )
}

export default App
