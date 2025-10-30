import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await registerWithEmail(email, password);
      navigate('/complete-profile');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
    }
  }

  async function onGoogle() {
    setError(null);
    try {
      await loginWithGoogle();
      navigate('/complete-profile');
    } catch (err: any) {
      setError(err?.message ?? 'Google signup failed');
    }
  }

  return (
    <div className="container" style={{ padding: 24, maxWidth: 480 }}>
      <h2 style={{ marginBottom: 16 }}>Register</h2>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <form className="stack" onSubmit={onSubmit}>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn" type="submit">Create Account</button>
          <button className="btn ghost" type="button" onClick={onGoogle}>Continue with Google</button>
        </div>
      </form>
      <p style={{ marginTop: 12 }}>Have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}

