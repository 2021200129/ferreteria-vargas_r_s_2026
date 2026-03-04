import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { registrarAuditoria } from '../utils/auditoria'

export default function NotaCredito() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [notas, setNotas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ventaId, setVentaId] = useState('')
  const [venta, setVenta] = useState(null)
  const [buscandoVenta, setBuscandoVenta] = useState(false)
  const [itemsDevolver, setItemsDevolver] = useState([])
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarNotas() }, [])

  async function cargarNotas() {
    setCargando(true)
    const { data } = await supabase.from('notas_credito')
      .select('*, ventas(total, clientes(nombre)), usuarios(nombre)')
      .order('fecha', { ascending: false })
      .limit(50)
    setNotas(data || [])
    setCargando(false)
  }

  async function buscarVenta() {
    if (!ventaId.trim()) return
    setBuscandoVenta(true)
    const { data } = await supabase.from('ventas')
      .select('*, clientes(nombre), almacenes(nombre), detalle_ventas(*, productos(nombre, codigo))')
      .eq('id', ventaId.trim())
      .single()
    if (!data) {
      alert('Venta no encontrada. Verifica el ID.')
    } else {
      setVenta(data)
      setItemsDevolver(data.detalle_ventas.map(d => ({
        ...d,
        devolver: false,
        cantidad_devolver: d.cantidad,
      })))
    }
    setBuscandoVenta(false)
  }

  function toggleItem(index) {
    setItemsDevolver(itemsDevolver.map((item, i) =>
      i === index ? { ...item, devolver: !item.devolver } : item
    ))
  }

  function actualizarCantidad(index, valor) {
    setItemsDevolver(itemsDevolver.map((item, i) =>
      i === index ? { ...item, cantidad_devolver: Math.min(parseFloat(valor) || 0, item.cantidad) } : item
    ))
  }

  const itemsSeleccionados = itemsDevolver.filter(i => i.devolver && i.cantidad_devolver > 0)
  const totalDevolver = itemsSeleccionados.reduce((s, i) => s + (i.cantidad_devolver * i.precio_unitario), 0)

  async function handleGuardar() {
    if (!motivo.trim()) { alert('Escribe el motivo de la devolución'); return }
    if (itemsSeleccionados.length === 0) { alert('Selecciona al menos un producto a devolver'); return }
    setGuardando(true)

    // Crear nota de crédito
    const { data: nota, error } = await supabase.from('notas_credito').insert([{
      venta_id: venta.id,
      usuario_id: usuario?.id,
      motivo,
      total: totalDevolver,
      estado: 'emitida'
    }]).select().single()

    if (error) { alert('Error: ' + error.message); setGuardando(false); return }

    // Insertar detalle y devolver stock
    for (const item of itemsSeleccionados) {
      await supabase.from('detalle_notas_credito').insert([{
        nota_credito_id: nota.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad_devolver,
        precio_unitario: item.precio_unitario,
      }])

      // Devolver stock al almacén
      const { data: stockActual } = await supabase.from('stock').select('cantidad')
        .eq('producto_id', item.producto_id)
        .eq('almacen_id', venta.almacen_id)
        .single()

      if (stockActual) {
        await supabase.from('stock')
          .update({ cantidad: stockActual.cantidad + item.cantidad_devolver })
          .eq('producto_id', item.producto_id)
          .eq('almacen_id', venta.almacen_id)
      } else {
        await supabase.from('stock').insert([{
          producto_id: item.producto_id,
          almacen_id: venta.almacen_id,
          cantidad: item.cantidad_devolver
        }])
      }

      // Kardex
      await supabase.rpc('registrar_kardex', {
        p_producto_id: item.producto_id,
        p_almacen_id: venta.almacen_id,
        p_fecha: new Date().toISOString(),
        p_tipo: 'ajuste',
        p_referencia_id: nota.id,
        p_referencia_tipo: 'nota_credito',
        p_cantidad: item.cantidad_devolver,
        p_costo_unitario: item.precio_unitario,
        p_nota: `Devolución — ${motivo}`
      })
    }

    await registrarAuditoria({
      usuario,
      accion: 'NOTA_CREDITO',
      modulo: 'notas_credito',
      detalle: `Devolución venta — S/ ${totalDevolver.toFixed(2)} — ${motivo}`,
      referenciaId: nota.id
    })

    alert(`✅ Nota de crédito emitida.\nSe devolvió S/ ${totalDevolver.toFixed(2)} al stock.`)
    setMostrarForm(false)
    setVenta(null)
    setVentaId('')
    setMotivo('')
    setItemsDevolver([])
    cargarNotas()
    setGuardando(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>↩️ Notas de Crédito / Devoluciones</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          {mostrarForm ? '✕ Cancelar' : '+ Nueva Devolución'}
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f3460' }}>Nueva Devolución</h3>

          {/* BUSCAR VENTA */}
          {!venta && (
            <div>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                Para encontrar el ID de la venta ve a Ventas y haz click en la fila. O pide al cliente el número de ticket.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>ID de la venta *</label>
                  <input value={ventaId} onChange={e => setVentaId(e.target.value)}
                    placeholder="Pega el ID de la venta aquí"
                    style={input} />
                </div>
                <button onClick={buscarVenta} disabled={buscandoVenta}
                  style={{ padding: '9px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {buscandoVenta ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
          )}

          {/* VENTA ENCONTRADA */}
          {venta && (
            <div>
              <div style={{ background: '#f0f7ff', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    Venta del {new Date(venta.fecha + 'T12:00:00').toLocaleDateString('es-PE')}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#888' }}>
                    Cliente: {venta.clientes?.nombre || 'Cliente varios'} · Total: S/ {parseFloat(venta.total).toFixed(2)}
                  </p>
                </div>
                <button onClick={() => { setVenta(null); setVentaId(''); setItemsDevolver([]) }}
                  style={{ background: 'none', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  Cambiar venta
                </button>
              </div>

              <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                Selecciona los productos a devolver y la cantidad:
              </p>

              <div style={{ marginBottom: '16px' }}>
                {itemsDevolver.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: item.devolver ? '#f0fff4' : '#f9f9f9', borderRadius: '6px', marginBottom: '8px', border: `1px solid ${item.devolver ? '#2ecc71' : '#eee'}` }}>
                    <input type="checkbox" checked={item.devolver} onChange={() => toggleItem(i)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.productos?.nombre}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>S/ {parseFloat(item.precio_unitario).toFixed(2)} c/u · Cantidad comprada: {item.cantidad}</div>
                    </div>
                    {item.devolver && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', color: '#555' }}>Cant. a devolver:</label>
                        <input type="number" value={item.cantidad_devolver}
                          onChange={e => actualizarCantidad(i, e.target.value)}
                          min="1" max={item.cantidad}
                          style={{ ...input, width: '70px', padding: '6px' }} />
                      </div>
                    )}
                    {item.devolver && (
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e74c3c', minWidth: '80px', textAlign: 'right' }}>
                        S/ {(item.cantidad_devolver * item.precio_unitario).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {itemsSeleccionados.length > 0 && (
                <div style={{ background: '#fff5f5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#555' }}>Total a devolver:</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e74c3c' }}>S/ {totalDevolver.toFixed(2)}</span>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>Motivo de devolución *</label>
                <input value={motivo} onChange={e => setMotivo(e.target.value)}
                  style={input} placeholder="Ej: Producto defectuoso, talla incorrecta, cambio de opinión" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => { setMostrarForm(false); setVenta(null); setVentaId('') }}
                  style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
                  Cancelar
                </button>
                <button onClick={handleGuardar} disabled={guardando}
                  style={{ padding: '10px 24px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {guardando ? 'Procesando...' : '↩️ Confirmar Devolución'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORIAL */}
      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Fecha</th>
                <th style={th}>Venta original</th>
                <th style={th}>Cliente</th>
                <th style={th}>Motivo</th>
                <th style={th}>Total devuelto</th>
                <th style={th}>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {notas.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay devoluciones registradas</td></tr>
              ) : (
                notas.map((n, i) => (
                  <tr key={n.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    <td style={td}>{new Date(n.fecha).toLocaleDateString('es-PE')}</td>
                    <td style={{ ...td, fontSize: '11px', color: '#888' }}>{n.venta_id?.slice(0, 8)}...</td>
                    <td style={td}>{n.ventas?.clientes?.nombre || 'Cliente varios'}</td>
                    <td style={td}>{n.motivo}</td>
                    <td style={{ ...td, fontWeight: 'bold', color: '#e74c3c' }}>S/ {parseFloat(n.total).toFixed(2)}</td>
                    <td style={td}>{n.usuarios?.nombre}</td>
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
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }