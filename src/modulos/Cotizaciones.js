import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { cargarCotizaciones() }, [])

  async function cargarCotizaciones() {
    setCargando(true)
    const { data } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('numero', { ascending: false })
      .limit(50)
    setCotizaciones(data || [])
    setCargando(false)
  }

  function colorEstado(estado) {
    const colores = { pendiente: '#f39c12', aceptada: '#2ecc71', rechazada: '#e74c3c' }
    return colores[estado] || '#95a5a6'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>📋 Cotizaciones</h1>
        <button
          onClick={() => navigate('/cotizaciones/nueva')}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
        >
          + Nueva Cotización
        </button>
      </div>

      {cargando ? <p>Cargando...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#0f3460', color: 'white' }}>
              <th style={th}>N°</th>
              <th style={th}>Fecha</th>
              <th style={th}>Cliente</th>
              <th style={th}>Obra / Actividad</th>
              <th style={th}>Total</th>
              <th style={th}>Estado</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay cotizaciones aún</td></tr>
            ) : (
              cotizaciones.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={td}><strong>{String(c.numero).padStart(4, '0')}-{new Date(c.fecha).getFullYear()}</strong></td>
                  <td style={td}>{new Date(c.fecha).toLocaleDateString('es-PE')}</td>
                  <td style={td}>{c.cliente_nombre || '—'}</td>
                  <td style={td}>{c.obra_actividad || '—'}</td>
                  <td style={{ ...td, fontWeight: 'bold' }}>S/ {c.total?.toFixed(2)}</td>
                  <td style={td}>
                    <span style={{ background: colorEstado(c.estado), color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                      {c.estado}
                    </span>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => navigate(`/cotizaciones/${c.id}`)}
                      style={{ background: '#0f3460', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Ver / Imprimir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }