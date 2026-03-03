import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    ruc: '', nombre: '', telefono: '', contacto: '', direccion: ''
  })

  useEffect(() => { cargarProveedores() }, [])

  async function cargarProveedores() {
    setCargando(true)
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data || [])
    setCargando(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ ruc: '', nombre: '', telefono: '', contacto: '', direccion: '' })
    setMostrarForm(true)
  }

  function abrirEditar(p) {
    setEditando(p.id)
    setForm({ ruc: p.ruc || '', nombre: p.nombre || '', telefono: p.telefono || '', contacto: p.contacto || '', direccion: p.direccion || '' })
    setMostrarForm(true)
  }

  async function handleGuardar() {
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    setGuardando(true)
    if (editando) {
      await supabase.from('proveedores').update(form).eq('id', editando)
    } else {
      await supabase.from('proveedores').insert([form])
    }
    setForm({ ruc: '', nombre: '', telefono: '', contacto: '', direccion: '' })
    setMostrarForm(false)
    setEditando(null)
    cargarProveedores()
    setGuardando(false)
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este proveedor?')) return
    await supabase.from('proveedores').delete().eq('id', id)
    cargarProveedores()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>🏭 Proveedores</h1>
        <button onClick={abrirNuevo}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          + Nuevo Proveedor
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f3460' }}>{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Campo label="RUC">
              <input name="ruc" value={form.ruc} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Nombre / Razón Social *">
              <input name="nombre" value={form.nombre} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Teléfono">
              <input name="telefono" value={form.telefono} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Contacto">
              <input name="contacto" value={form.contacto} onChange={handleChange} style={input} placeholder="Nombre del vendedor" />
            </Campo>
            <Campo label="Dirección">
              <input name="direccion" value={form.direccion} onChange={handleChange} style={input} />
            </Campo>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={() => { setMostrarForm(false); setEditando(null) }}
              style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={guardando}
              style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Guardar Proveedor'}
            </button>
          </div>
        </div>
      )}

      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>RUC</th>
                <th style={th}>Nombre</th>
                <th style={th}>Teléfono</th>
                <th style={th}>Contacto</th>
                <th style={th}>Dirección</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay proveedores registrados aún</td></tr>
              ) : (
                proveedores.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    <td style={td}>{p.ruc || '—'}</td>
                    <td style={td}><strong>{p.nombre}</strong></td>
                    <td style={td}>{p.telefono || '—'}</td>
                    <td style={td}>{p.contacto || '—'}</td>
                    <td style={td}>{p.direccion || '—'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => abrirEditar(p)}
                          style={{ background: '#f0f7ff', border: '1px solid #3498db', color: '#3498db', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleEliminar(p.id)}
                          style={{ background: '#fee', border: '1px solid #fcc', color: '#e74c3c', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          🗑 Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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