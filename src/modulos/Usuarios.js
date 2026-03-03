import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

export default function Usuarios() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', pin: '', rol: 'vendedor', local_id: '' })

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: users }, { data: locs }] = await Promise.all([
      supabase.from('usuarios').select('*, locales(nombre)').order('nombre'),
      supabase.from('locales').select('*')
    ])
    setUsuarios(users || [])
    setLocales(locs || [])
    setCargando(false)
  }

  async function handleGuardar() {
    if (!form.nombre || !form.email || !form.pin) { alert('Nombre, email y PIN son obligatorios'); return }
    if (form.pin.length !== 4) { alert('El PIN debe tener exactamente 4 dígitos'); return }
    setGuardando(true)
    const { error } = await supabase.from('usuarios').insert([{
      nombre: form.nombre,
      email: form.email,
      pin: form.pin,
      rol: form.rol,
      local_id: form.local_id || null
    }])
    if (error) { alert('Error: ' + error.message) }
    else {
      setForm({ nombre: '', email: '', pin: '', rol: 'vendedor', local_id: '' })
      setMostrarForm(false)
      cargarTodo()
    }
    setGuardando(false)
  }

  async function toggleActivo(id, activo) {
    await supabase.from('usuarios').update({ activo: !activo }).eq('id', id)
    cargarTodo()
  }

  if (usuario?.rol !== 'admin') {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Solo el administrador puede gestionar usuarios.</div>
  }

  const coloresRol = { admin: '#e74c3c', vendedor: '#2ecc71', almacenero: '#3498db', contador: '#9b59b6' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>👥 Usuarios</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          {mostrarForm ? '✕ Cancelar' : '+ Nuevo Usuario'}
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f3460' }}>Nuevo Usuario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Campo label="Nombre completo *">
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={input} />
            </Campo>
            <Campo label="Email *">
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} />
            </Campo>
            <Campo label="PIN (4 dígitos) *">
              <input type="password" maxLength={4} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} style={input} placeholder="••••" />
            </Campo>
            <Campo label="Rol">
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} style={input}>
                <option value="admin">Administrador</option>
                <option value="vendedor">Vendedor</option>
                <option value="almacenero">Almacenero</option>
                <option value="contador">Contador</option>
              </select>
            </Campo>
            <Campo label="Local asignado">
              <select value={form.local_id} onChange={e => setForm({ ...form, local_id: e.target.value })} style={input}>
                <option value="">Todos los locales</option>
                {locales.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={handleGuardar} disabled={guardando}
              style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : 'Guardar Usuario'}
            </button>
          </div>
        </div>
      )}

      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Nombre</th>
                <th style={th}>Email</th>
                <th style={th}>Rol</th>
                <th style={th}>Local</th>
                <th style={th}>Estado</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9', opacity: u.activo ? 1 : 0.5 }}>
                  <td style={td}><strong>{u.nombre}</strong></td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <span style={{ background: coloresRol[u.rol] || '#95a5a6', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                      {u.rol}
                    </span>
                  </td>
                  <td style={td}>{u.locales?.nombre || 'Todos'}</td>
                  <td style={td}>
                    <span style={{ background: u.activo ? '#2ecc71' : '#e74c3c', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={td}>
                    {u.email !== 'admin@vargas.com' && (
                      <button onClick={() => toggleActivo(u.id, u.activo)}
                        style={{ background: u.activo ? '#e74c3c' : '#2ecc71', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }