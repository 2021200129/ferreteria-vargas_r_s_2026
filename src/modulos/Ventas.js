import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()
  const [modalVenta, setModalVenta] = useState(null)
  const [detalleVenta, setDetalleVenta] = useState([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    cargarVentas()
  }, [])

  async function verDetalle(venta) {
    setModalVenta(venta)
    setCargandoDetalle(true)
    const { data } = await supabase
      .from('detalle_ventas')
      .select('*, productos(nombre, codigo, imagen_url)')
      .eq('venta_id', venta.id)
    setDetalleVenta(data || [])
    setCargandoDetalle(false)
  }

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
  const colores = { efectivo: '#2ecc71', tarjeta: '#3498db', yape: '#9b59b6', plin: '#1abc9c', credito: '#e67e22' }
  return colores[forma] || '#95a5a6'
}

  const hoy = new Date().toISOString().split('T')[0]
  const totalHoy = ventas
    .filter(v => (v.fecha || '').slice(0, 10) === hoy)
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
                <tr key={v.id}
                  onClick={() => verDetalle(v)}
                  style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9', cursor: 'pointer' }}
                  title="Click para ver detalle">
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

      {modalVenta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '620px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

            {/* HEADER */}
            <div style={{ padding: '24px', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Detalle de Venta</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#888' }}>
                    {new Date(modalVenta.fecha + 'T12:00:00').toLocaleDateString('es-PE')} · {modalVenta.clientes?.nombre || 'Cliente varios'} · {modalVenta.almacenes?.nombre}
                  </p>
                </div>
                <button onClick={() => setModalVenta(null)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888' }}>×</button>
              </div>

              {/* BADGES */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f0f0f0', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                  {modalVenta.tipo_comprobante}
                </span>
                <span style={{ background: colorFormaPago(modalVenta.forma_pago), color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                  {modalVenta.forma_pago}
                </span>
                {modalVenta.usuarios?.nombre && (
                  <span style={{ background: '#f0f7ff', color: '#3498db', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                    👤 {modalVenta.usuarios?.nombre}
                  </span>
                )}
                {modalVenta.descuento > 0 && (
                  <span style={{ background: '#fff5f5', color: '#e74c3c', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                    Descuento: S/ {parseFloat(modalVenta.descuento).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* PRODUCTOS */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
              {cargandoDetalle ? (
                <p style={{ textAlign: 'center', color: '#888' }}>Cargando...</p>
              ) : detalleVenta.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>Sin detalle registrado</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={thM}>Producto</th>
                      <th style={{ ...thM, textAlign: 'center' }}>Cant.</th>
                      <th style={{ ...thM, textAlign: 'right' }}>P. Unit.</th>
                      <th style={{ ...thM, textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleVenta.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={tdM}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {d.productos?.imagen_url
                              ? <img src={d.productos.imagen_url} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                              : <div style={{ width: '32px', height: '32px', background: '#eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📦</div>
                            }
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{d.productos?.nombre}</div>
                              <div style={{ fontSize: '11px', color: '#888' }}>{d.productos?.codigo}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...tdM, textAlign: 'center' }}>{d.cantidad}</td>
                        <td style={{ ...tdM, textAlign: 'right' }}>S/ {parseFloat(d.precio_unitario).toFixed(2)}</td>
                        <td style={{ ...tdM, textAlign: 'right', fontWeight: 'bold' }}>
                          S/ {(parseFloat(d.cantidad) * parseFloat(d.precio_unitario)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER TOTAL */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', background: '#f9f9f9', borderRadius: '0 0 12px 12px' }}>
              {modalVenta.descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#888' }}>
                  <span>Subtotal:</span>
                  <span>S/ {(parseFloat(modalVenta.total) + parseFloat(modalVenta.descuento || 0)).toFixed(2)}</span>
                </div>
              )}
              {modalVenta.descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#e74c3c' }}>
                  <span>Descuento ({modalVenta.motivo_descuento}):</span>
                  <span>- S/ {parseFloat(modalVenta.descuento).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 'bold' }}>Total:</span>
                <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#2ecc71' }}>
                  S/ {parseFloat(modalVenta.total).toFixed(2)}
                </span>
              </div>

              {/* ID para devoluciones */}
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#aaa' }}>ID: {modalVenta.id}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(modalVenta.id); alert('ID copiado') }}
                  style={{ background: 'none', border: '1px solid #ddd', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#888' }}>
                  📋 Copiar ID (para devoluciones)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }
const thM = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#555' }
const tdM = { padding: '10px 12px', fontSize: '13px' }