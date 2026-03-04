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
  const [modalHistorialPrecios, setModalHistorialPrecios] = useState(null)
  const [historialPrecios, setHistorialPrecios] = useState([])
  const [cargandoPrecios, setCargandoPrecios] = useState(false)

  useEffect(() => { cargarProveedores() }, [])

  async function verHistorialPrecios(proveedor) {
    setModalHistorialPrecios(proveedor)
    setCargandoPrecios(true)
    const { data } = await supabase
      .from('historial_precios_compra')
      .select('*, productos(nombre, codigo), compras(fecha)')
      .eq('proveedor_id', proveedor.id)
      .order('fecha', { ascending: false })
      .limit(100)
    setHistorialPrecios(data || [])
    setCargandoPrecios(false)
  }

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

                        <button onClick={() => verHistorialPrecios(p)}
                          style={{ background: '#f0fff4', border: '1px solid #2ecc71', color: '#2ecc71', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          📈 Precios
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

      {modalHistorialPrecios && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '24px', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>📈 Historial de precios</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#888' }}>{modalHistorialPrecios.nombre}</p>
                </div>
                <button onClick={() => setModalHistorialPrecios(null)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888' }}>×</button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {cargandoPrecios ? (
                <p style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Cargando...</p>
              ) : historialPrecios.length === 0 ? (
                <p style={{ padding: '40px', textAlign: 'center', color: '#888' }}>No hay compras registradas a este proveedor</p>
              ) : (() => {
                // Agrupar por producto para detectar cambios de precio
                const porProducto = {}
                historialPrecios.forEach(h => {
                  const key = h.producto_id
                  if (!porProducto[key]) porProducto[key] = []
                  porProducto[key].push(h)
                })

                return Object.values(porProducto).map((registros, gi) => {
                  const nombre = registros[0].productos?.nombre
                  const codigo = registros[0].productos?.codigo
                  const precioActual = registros[0].precio_unitario
                  const precioAnterior = registros[1]?.precio_unitario
                  const variacion = precioAnterior ? ((precioActual - precioAnterior) / precioAnterior * 100) : null

                  return (
                    <div key={gi} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ padding: '12px 24px', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{nombre}</span>
                          <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>{codigo}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>S/ {parseFloat(precioActual).toFixed(2)}</span>
                          {variacion !== null && (
                            <span style={{
                              background: variacion > 0 ? '#fee' : variacion < 0 ? '#f0fff4' : '#f5f5f5',
                              color: variacion > 0 ? '#e74c3c' : variacion < 0 ? '#2ecc71' : '#888',
                              padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                            }}>
                              {variacion > 0 ? '▲' : variacion < 0 ? '▼' : '='} {Math.abs(variacion).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {registros.map((r, i) => (
                        <div key={i} style={{ padding: '8px 24px 8px 40px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                          <span>{new Date(r.fecha).toLocaleDateString('es-PE')}</span>
                          <span style={{ fontWeight: i === 0 ? 'bold' : 'normal', color: i === 0 ? '#0f3460' : '#888' }}>
                            S/ {parseFloat(r.precio_unitario).toFixed(2)}
                            {i === 0 && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#3498db' }}>actual</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })
              })()}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setModalHistorialPrecios(null)}
                style={{ width: '100%', padding: '10px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
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