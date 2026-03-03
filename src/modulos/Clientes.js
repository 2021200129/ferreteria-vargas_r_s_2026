import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    dni_ruc: '', nombre: '', telefono: '',
    direccion: '', ciudad: '', correo: '', tipo_precio: 'menor'
  })

  useEffect(() => { cargarClientes() }, [])

  async function cargarClientes() {
    setCargando(true)
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    setClientes(data || [])
    setCargando(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ dni_ruc: '', nombre: '', telefono: '', direccion: '', ciudad: '', correo: '', tipo_precio: 'menor' })
    setMostrarForm(true)
  }

  function abrirEditar(c) {
    setEditando(c.id)
    setForm({ dni_ruc: c.dni_ruc || '', nombre: c.nombre || '', telefono: c.telefono || '', direccion: c.direccion || '', ciudad: c.ciudad || '', correo: c.correo || '', tipo_precio: c.tipo_precio || 'menor' })
    setMostrarForm(true)
  }

  async function handleGuardar() {
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    setGuardando(true)
    if (editando) {
      await supabase.from('clientes').update(form).eq('id', editando)
    } else {
      await supabase.from('clientes').insert([form])
    }
    setForm({ dni_ruc: '', nombre: '', telefono: '', direccion: '', ciudad: '', correo: '', tipo_precio: 'menor' })
    setMostrarForm(false)
    setEditando(null)
    cargarClientes()
    setGuardando(false)
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    cargarClientes()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>👥 Clientes</h1>
        <button onClick={abrirNuevo}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          + Nuevo Cliente
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f3460' }}>{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Campo label="DNI / RUC">
              <input name="dni_ruc" value={form.dni_ruc} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Nombre / Razón Social *">
              <input name="nombre" value={form.nombre} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Teléfono">
              <input name="telefono" value={form.telefono} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Correo">
              <input name="correo" value={form.correo} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Ciudad">
              <input name="ciudad" value={form.ciudad} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Dirección">
              <input name="direccion" value={form.direccion} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Tipo de precio">
              <select name="tipo_precio" value={form.tipo_precio} onChange={handleChange} style={input}>
                <option value="menor">Precio menor (minorista)</option>
                <option value="mayor">Precio mayor (mayorista)</option>
              </select>
            </Campo>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={() => { setMostrarForm(false); setEditando(null) }}
              style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={guardando}
              style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Guardar Cliente'}
            </button>
          </div>
        </div>
      )}

      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>DNI / RUC</th>
                <th style={th}>Nombre</th>
                <th style={th}>Teléfono</th>
                <th style={th}>Ciudad</th>
                <th style={th}>Tipo precio</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay clientes registrados aún</td></tr>
              ) : (
                clientes.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    <td style={td}>{c.dni_ruc || '—'}</td>
                    <td style={td}><strong>{c.nombre}</strong></td>
                    <td style={td}>{c.telefono || '—'}</td>
                    <td style={td}>{c.ciudad || '—'}</td>
                    <td style={td}>
                      <span style={{ background: c.tipo_precio === 'mayor' ? '#3498db' : '#95a5a6', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                        {c.tipo_precio === 'mayor' ? 'Mayorista' : 'Minorista'}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => abrirEditar(c)}
                          style={{ background: '#f0f7ff', border: '1px solid #3498db', color: '#3498db', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleEliminar(c.id)}
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