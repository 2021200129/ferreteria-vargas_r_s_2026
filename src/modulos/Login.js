import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

export default function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', pin: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleLogin() {
    if (!form.email || !form.pin) { setError('Completa todos los campos'); return }
    setCargando(true)
    setError('')

    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', form.email)
      .eq('pin', form.pin)
      .eq('activo', true)
      .single()

    if (!data) {
      setError('Email o PIN incorrecto')
      setCargando(false)
      return
    }

    login(data)
    setCargando(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏗️</div>
          <h2 style={{ margin: 0, color: '#0f3460' }}>Vargas DCP</h2>
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '13px' }}>Ferretería y Constructora</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="usuario@vargas.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>PIN</label>
            <input
              type="password"
              value={form.pin}
              onChange={e => setForm({ ...form, pin: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              maxLength={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', letterSpacing: '8px', textAlign: 'center' }}
              placeholder="••••"
            />
          </div>

          {error && <p style={{ margin: 0, color: '#e74c3c', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

          <button onClick={handleLogin} disabled={cargando}
            style={{ background: '#0f3460', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
            {cargando ? 'Verificando...' : 'Ingresar'}
          </button>
        </div>

        <p style={{ margin: '20px 0 0 0', textAlign: 'center', fontSize: '12px', color: '#aaa' }}>
          PIN por defecto: 1234
        </p>
      </div>
    </div>
  )
}