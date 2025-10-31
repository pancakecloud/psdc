import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="container" style={{ padding: 24 }}>
      <h1>Home</h1>
      <p>Quick navigation to app pages</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 18 }}>
        <Link to="/" className="btn">Home</Link>
        <Link to="/login" className="btn">Login</Link>
        <Link to="/register" className="btn secondary">Register</Link>
        <Link to="/complete-profile" className="btn">Complete Profile</Link>
        <Link to="/profile" className="btn">Profile</Link>
        <Link to="/map" className="btn ghost">Map</Link>
        <Link to="/chat" className="btn">Chat</Link>
      </div>
    </div>
  )
}

