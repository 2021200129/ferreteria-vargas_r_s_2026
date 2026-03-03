import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    cargarVentas()
  }, [])

  async function cargarVentas() {
    setCargando(true)
    const { data, error } = await supabase.from('ventas')
      .select('*, clientes(nombre), almacenes(nombre), usuarios(nombre)')
      .order('fecha', { ascending: false })
      .limit(100)
    if (error) console.error(error)
    else setVentas(data)
    setCargando(false)
  }

  function formatFecha(f) {
    return new Date(f).toLocaleDateString('es-PE')
  }

  function colorFormaPago(forma) {
    const colores = {
      efectivo: '#2ecc71',
      tarjeta: '#3498db',
      yape: '#9b59b6',
      plin: '#1abc9c'
    }
    return colores[forma] || '#95a5a6'
  }

  const totalHoy = ventas
    .filter(v => new Date(v.fecha).toDateString() === new Date().toDateString())
    .reduce((sum, v) => sum + (v.total || 0), 0)

  return (
    <div>
      {/* ENCABEZADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>🛒 Ventas</h1>
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>
            Venta de hoy: <strong style={{ color: '#2ecc71' }}>S/ {totalHoy.toFixed(2)}</strong>
          </p>
        </div>
        <button
          onClick={() => navigate('/ventas/nueva')}
          style={{
            background: '#0f3460', color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
          }}
        >
          + Nueva Venta
        </button>
      </div>

      {/* TABLA */}
      {cargando ? <p>Cargando ventas...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#0f3460', color: 'white' }}>
              <th style={th}>Fecha</th>
              <th style={th}>Cliente</th>
              <th style={th}>Almacén</th>
              <th style={th}>Comprobante</th>
              <th style={th}>Forma de pago</th>
              <th style={th}>Total</th>
              <th style={th}>Vendedor</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  No hay ventas registradas aún
                </td>
              </tr>
            ) : (
              ventas.map((v, i) => (
                <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={td}>{formatFecha(v.fecha)}</td>
                  <td style={td}>{v.clientes?.nombre || 'Cliente varios'}</td>
                  <td style={td}>{v.almacenes?.nombre || '—'}</td>
                  <td style={td}>{v.tipo_comprobante}</td>
                  <td style={td}>
                    <span style={{
                      background: colorFormaPago(v.forma_pago),
                      color: 'white', padding: '3px 10px',
                      borderRadius: '12px', fontSize: '12px'
                    }}>
                      {v.forma_pago}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#2ecc71' }}>
                    S/ {v.total?.toFixed(2)}
                  </td>
                  <td style={td}>{v.usuarios?.nombre || '—'}</td>
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