import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Auditoria() {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtros, setFiltros] = useState({ modulo: '', usuario: '', fecha: '' })

  useEffect(() => { cargarRegistros() }, [])

  async function cargarRegistros() {
    setCargando(true)
    let query = supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(200)
    const { data } = await query
    setRegistros(data || [])
    setCargando(false)
  }

  const colores = {
    CREAR_VENTA:    '#2ecc71',
    CREAR_COMPRA:   '#3498db',
    AJUSTE_STOCK:   '#f39c12',
    EDITAR_PRODUCTO:'#9b59b6',
    ELIMINAR:       '#e74c3c',
    LOGIN:          '#95a5a6',
  }

  const registrosFiltrados = registros.filter(r => {
    if (filtros.modulo && r.modulo !== filtros.modulo) return false
    if (filtros.usuario && !r.usuario_nombre?.toLowerCase().includes(filtros.usuario.toLowerCase())) return false
    if (filtros.fecha && !r.created_at?.startsWith(filtros.fecha)) return false
    return true
  })

  const modulos = [...new Set(registros.map(r => r.modulo))]

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0' }}>🔍 Auditoría</h1>

      {/* FILTROS */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Módulo</label>
          <select value={filtros.modulo} onChange={e => setFiltros({ ...filtros, modulo: e.target.value })}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
            <option value="">Todos</option>
            {modulos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Usuario</label>
          <input value={filtros.usuario} onChange={e => setFiltros({ ...filtros, usuario: e.target.value })}
            placeholder="Buscar usuario..."
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Fecha</label>
          <input type="date" value={filtros.fecha} onChange={e => setFiltros({ ...filtros, fecha: e.target.value })}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <button onClick={() => setFiltros({ modulo: '', usuario: '', fecha: '' })}
          style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white', fontSize: '13px' }}>
          Limpiar
        </button>
        <span style={{ fontSize: '13px', color: '#888', marginLeft: 'auto' }}>
          {registrosFiltrados.length} registros
        </span>
      </div>

      {/* TABLA */}
      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Fecha y hora</th>
                <th style={th}>Usuario</th>
                <th style={th}>Acción</th>
                <th style={th}>Módulo</th>
                <th style={th}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay registros</td></tr>
              ) : (
                registrosFiltrados.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    <td style={td}>
                      <div style={{ fontSize: '13px' }}>{new Date(r.created_at).toLocaleDateString('es-PE')}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{new Date(r.created_at).toLocaleTimeString('es-PE')}</div>
                    </td>
                    <td style={td}><strong>{r.usuario_nombre}</strong></td>
                    <td style={td}>
                      <span style={{ background: colores[r.accion] || '#95a5a6', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {r.accion}
                      </span>
                    </td>
                    <td style={td}>{r.modulo}</td>
                    <td style={{ ...td, fontSize: '12px', color: '#555', maxWidth: '300px' }}>{r.detalle}</td>
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

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }