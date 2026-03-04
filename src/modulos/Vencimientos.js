import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Vencimientos() {
  const [lotes, setLotes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => { cargarLotes() }, [])

  async function cargarLotes() {
    setCargando(true)
    const { data } = await supabase
      .from('lotes')
      .select('*, productos(nombre, codigo), almacenes(nombre)')
      .eq('estado', 'activo')
      .gt('cantidad_actual', 0)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
    setLotes(data || [])
    setCargando(false)
  }

  function diasParaVencer(fecha) {
    if (!fecha) return null
    const hoy = new Date()
    const venc = new Date(fecha + 'T12:00:00')
    return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24))
  }

  function colorDias(dias) {
    if (dias === null) return '#95a5a6'
    if (dias < 0) return '#e74c3c'
    if (dias <= 30) return '#e74c3c'
    if (dias <= 90) return '#f39c12'
    return '#2ecc71'
  }

  function etiquetaDias(dias) {
    if (dias === null) return 'Sin fecha'
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`
    if (dias === 0) return 'Vence hoy'
    if (dias === 1) return 'Vence mañana'
    return `${dias} días`
  }

  const hoy = new Date()
  const lotesFiltrados = lotes.filter(l => {
    const dias = diasParaVencer(l.fecha_vencimiento)
    if (filtro === 'vencidos') return dias !== null && dias < 0
    if (filtro === 'criticos') return dias !== null && dias >= 0 && dias <= 30
    if (filtro === 'proximos') return dias !== null && dias > 30 && dias <= 90
    if (filtro === 'sin_fecha') return dias === null
    return true
  })

  const conteos = {
    vencidos: lotes.filter(l => { const d = diasParaVencer(l.fecha_vencimiento); return d !== null && d < 0 }).length,
    criticos: lotes.filter(l => { const d = diasParaVencer(l.fecha_vencimiento); return d !== null && d >= 0 && d <= 30 }).length,
    proximos: lotes.filter(l => { const d = diasParaVencer(l.fecha_vencimiento); return d !== null && d > 30 && d <= 90 }).length,
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0' }}>📅 Control de Vencimientos</h1>

      {/* RESUMEN ALERTAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div onClick={() => setFiltro(filtro === 'vencidos' ? 'todos' : 'vencidos')}
          style={{ background: conteos.vencidos > 0 ? '#fee' : 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #e74c3c', cursor: 'pointer' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Vencidos</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 'bold', color: '#e74c3c' }}>{conteos.vencidos}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>lotes — acción urgente</p>
        </div>
        <div onClick={() => setFiltro(filtro === 'criticos' ? 'todos' : 'criticos')}
          style={{ background: conteos.criticos > 0 ? '#fff8e1' : 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f39c12', cursor: 'pointer' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Vencen en 30 días</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 'bold', color: '#f39c12' }}>{conteos.criticos}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>lotes — vender pronto</p>
        </div>
        <div onClick={() => setFiltro(filtro === 'proximos' ? 'todos' : 'proximos')}
          style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3498db', cursor: 'pointer' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Vencen en 31-90 días</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: 'bold', color: '#3498db' }}>{conteos.proximos}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>lotes — monitorear</p>
        </div>
      </div>

      {/* TABLA */}
      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', gap: '8px' }}>
            {['todos', 'vencidos', 'criticos', 'proximos', 'sin_fecha'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid #ddd', cursor: 'pointer', fontSize: '12px', background: filtro === f ? '#0f3460' : 'white', color: filtro === f ? 'white' : '#555' }}>
                {f === 'todos' ? 'Todos' : f === 'vencidos' ? '🔴 Vencidos' : f === 'criticos' ? '🟡 ≤30 días' : f === 'proximos' ? '🔵 31-90 días' : '⚪ Sin fecha'}
              </button>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Producto</th>
                <th style={th}>Almacén</th>
                <th style={th}>Lote</th>
                <th style={th}>Stock actual</th>
                <th style={th}>Fecha venc.</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lotesFiltrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay lotes en esta categoría</td></tr>
              ) : (
                lotesFiltrados.map((l, i) => {
                  const dias = diasParaVencer(l.fecha_vencimiento)
                  return (
                    <tr key={l.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{l.productos?.nombre}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{l.productos?.codigo}</div>
                      </td>
                      <td style={td}>{l.almacenes?.nombre}</td>
                      <td style={td}>{l.numero_lote || <span style={{ color: '#aaa' }}>Sin número</span>}</td>
                      <td style={td}><strong>{l.cantidad_actual}</strong></td>
                      <td style={td}>
                        {l.fecha_vencimiento
                          ? new Date(l.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-PE')
                          : <span style={{ color: '#aaa' }}>Sin fecha</span>}
                      </td>
                      <td style={td}>
                        <span style={{ background: colorDias(dias), color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {etiquetaDias(dias)}
                        </span>
                      </td>
                    </tr>
                  )
                })
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