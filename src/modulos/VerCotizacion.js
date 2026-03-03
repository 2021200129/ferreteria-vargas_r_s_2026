import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function VerCotizacion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cotizacion, setCotizacion] = useState(null)
  const [items, setItems] = useState([])
  const [config, setConfig] = useState({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarTodo() }, [id])

  async function cargarTodo() {
    const [{ data: cot }, { data: det }, { data: cfg }] = await Promise.all([
      supabase.from('cotizaciones').select('*').eq('id', id).single(),
      supabase.from('detalle_cotizaciones').select('*').eq('cotizacion_id', id),
      supabase.from('configuracion').select('*')
    ])
    setCotizacion(cot)
    setItems(det || [])
    const cfgObj = {}
    ;(cfg || []).forEach(c => { cfgObj[c.clave] = c.valor })
    setConfig(cfgObj)
    setCargando(false)
  }

  async function cambiarEstado(estado) {
    await supabase.from('cotizaciones').update({ estado }).eq('id', id)
    setCotizacion({ ...cotizacion, estado })
  }

  async function convertirEnVenta() {
    if (cotizacion.estado === 'convertida') { alert('Esta cotización ya fue convertida'); return }
    if (!window.confirm('¿Convertir esta cotización en venta? Se descontará el stock automáticamente.')) return

    // Obtener almacén predeterminado
    const { data: cfg } = await supabase.from('configuracion').select('*')
    const cfgObj = {}
    ;(cfg || []).forEach(c => { cfgObj[c.clave] = c.valor })
    const almacenId = cfgObj.almacen_predeterminado
    if (!almacenId) { alert('Configura un almacén predeterminado en Configuración primero'); return }

    // Buscar cliente por dni_ruc si existe
    let clienteId = null
    if (cotizacion.cliente_dni_ruc) {
      const { data: clienteExiste } = await supabase.from('clientes')
        .select('id').eq('dni_ruc', cotizacion.cliente_dni_ruc).single()
      if (clienteExiste) clienteId = clienteExiste.id
    }

    // Crear venta
    const { data: venta, error } = await supabase.from('ventas').insert([{
      almacen_id: almacenId,
      cliente_id: clienteId,
      tipo_comprobante: cotizacion.tipo_pago === 'credito' ? 'factura' : 'ticket',
      forma_pago: cotizacion.tipo_pago === 'credito' ? 'credito' : 'efectivo',
      total: cotizacion.total,
      estado: 'completada'
    }]).select().single()

    if (error) { alert('Error al crear venta: ' + error.message); return }

    // Insertar detalle y actualizar stock
    for (const item of items) {
      await supabase.from('detalle_ventas').insert([{
        venta_id: venta.id,
        producto_id: item.producto_id,
        cantidad: parseFloat(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario),
        precio_compra: item.productos?.precio_compra || 0
      }])

      // Restar stock
      const { data: stockActual } = await supabase.from('stock').select('cantidad')
        .eq('producto_id', item.producto_id).eq('almacen_id', almacenId).single()
      if (stockActual) {
        await supabase.from('stock').update({ cantidad: stockActual.cantidad - parseFloat(item.cantidad) })
          .eq('producto_id', item.producto_id).eq('almacen_id', almacenId)
      }

      // Kardex
      await supabase.rpc('registrar_kardex', {
        p_producto_id: item.producto_id,
        p_almacen_id: almacenId,
        p_fecha: new Date().toISOString(),
        p_tipo: 'venta',
        p_referencia_id: venta.id,
        p_referencia_tipo: 'venta',
        p_cantidad: -parseFloat(item.cantidad),
        p_costo_unitario: item.productos?.precio_compra || 0,
        p_nota: `Venta desde cotización #${cotizacion.numero}`
      })
    }

    // Marcar cotización como convertida
    await supabase.from('cotizaciones').update({ estado: 'convertida' }).eq('id', cotizacion.id)

    // Si es crédito, crear cuenta por cobrar automáticamente
    if (cotizacion.tipo_pago === 'credito' && clienteId) {
      await supabase.from('cuentas_por_cobrar').insert([{
        venta_id: venta.id,
        cliente_id: clienteId,
        concepto: `Venta cotización #${cotizacion.numero} - ${cotizacion.obra_actividad || ''}`,
        monto_total: cotizacion.total,
        estado: 'pendiente'
      }])
    }

    alert('✅ Venta registrada exitosamente' + (cotizacion.tipo_pago === 'credito' ? '\nSe creó una cuenta por cobrar automáticamente.' : ''))
    navigate('/ventas')
  }

  if (cargando) return <p>Cargando...</p>
  if (!cotizacion) return <p>Cotización no encontrada</p>

  const numero = String(cotizacion.numero).padStart(4, '0') + '-' + new Date(cotizacion.fecha).getFullYear()
  const total = items.reduce((sum, i) => sum + (parseFloat(i.cantidad) * parseFloat(i.precio_unitario) || 0), 0)

  return (
    <div>
      {/* BOTONES — no se imprimen */}
      <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
  
        <button onClick={() => navigate('/cotizaciones')}
          style={{ background: 'none', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          ← Volver
        </button>

        <button onClick={() => window.print()}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
          🖨️ Imprimir
        </button>

        {cotizacion.estado !== 'convertida' ? (
          <>
            <select
              value={cotizacion.estado}
              onChange={e => cambiarEstado(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
            </select>

            <button onClick={convertirEnVenta}
              style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              ✓ Convertir en Venta
            </button>
          </>
        ) : (
          <span style={{ background: '#2ecc71', color: 'white', padding: '10px 20px', borderRadius: '6px', fontSize: '14px' }}>
            ✅ Ya convertida en venta
          </span>
        )}

      </div>

      {/* COTIZACIÓN IMPRIMIBLE */}
      <div id="cotizacion-print" style={{ background: 'white', padding: '40px', maxWidth: '800px', borderRadius: '8px' }}>

        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ border: '2px dashed #e67e22', padding: '16px', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{config.nombre_empresa}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>FERRETERÍA Y CONSTRUCTORA</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>RUC: {config.ruc_empresa}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{config.direccion_empresa}</p>
            <p style={{ margin: '8px 0 0 0', color: '#0f3460', fontWeight: 'bold', fontStyle: 'italic' }}>¡Solo calidad!</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f3460' }}>COTIZACIÓN</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 'bold', border: '1px solid #333', padding: '6px 16px', borderRadius: '4px' }}>
              N° {numero}
            </p>
            <div style={{ marginTop: '8px', border: '1px solid #333', padding: '6px 16px', borderRadius: '4px' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>Fecha: </span>
              <span style={{ fontWeight: 'bold' }}>{new Date(cotizacion.fecha + 'T12:00:00').toLocaleDateString('es-PE')}</span>
            </div>
          </div>
        </div>

        {/* DATOS CLIENTE */}
        <div style={{ border: '2px solid #3498db', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div><span style={{ fontSize: '12px', color: '#888' }}>DNI/RUC: </span><strong>{cotizacion.cliente_dni_ruc || '—'}</strong></div>
          <div><span style={{ fontSize: '12px', color: '#888' }}>T. Pago: </span><strong>{cotizacion.tipo_pago}</strong></div>
          <div><span style={{ fontSize: '12px', color: '#888' }}>Razón social: </span><strong>{cotizacion.cliente_nombre}</strong></div>
          <div><span style={{ fontSize: '12px', color: '#888' }}>Ciudad: </span><strong>{cotizacion.cliente_ciudad || '—'}</strong></div>
          <div><span style={{ fontSize: '12px', color: '#888' }}>Dirección: </span><strong>{cotizacion.cliente_direccion || '—'}</strong></div>
          <div><span style={{ fontSize: '12px', color: '#888' }}>Teléfono: </span><strong>{cotizacion.cliente_telefono || '—'}</strong></div>
          <div style={{ gridColumn: '1 / -1' }}><span style={{ fontSize: '12px', color: '#888' }}>Obra/Actividad: </span><strong>{cotizacion.obra_actividad || '—'}</strong></div>
        </div>

        {/* TABLA PRODUCTOS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#3498db', color: 'white' }}>
              <th style={thP}>ITEM</th>
              <th style={thP}>CÓDIGO</th>
              <th style={thP}>PRODUCTO</th>
              <th style={thP}>CANTIDAD</th>
              <th style={thP}>UNIDAD</th>
              <th style={thP}>P.U. (S/)</th>
              <th style={thP}>PRECIO TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8f9fa' }}>
                <td style={tdP}>{i + 1}</td>
                <td style={tdP}>{item.codigo_producto}</td>
                <td style={tdP}>{item.nombre_producto}</td>
                <td style={{ ...tdP, textAlign: 'center' }}>{item.cantidad}</td>
                <td style={{ ...tdP, textAlign: 'center' }}>{item.unidad}</td>
                <td style={{ ...tdP, textAlign: 'right' }}>S/ {parseFloat(item.precio_unitario).toFixed(2)}</td>
                <td style={{ ...tdP, textAlign: 'right', fontWeight: 'bold' }}>
                  S/ {(parseFloat(item.cantidad) * parseFloat(item.precio_unitario)).toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Filas vacías para dar formato */}
            {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
              <tr key={'empty-' + i} style={{ background: (items.length + i) % 2 === 0 ? 'white' : '#f8f9fa' }}>
                <td style={tdP}>&nbsp;</td>
                <td style={tdP}></td>
                <td style={tdP}></td>
                <td style={tdP}></td>
                <td style={tdP}></td>
                <td style={tdP}></td>
                <td style={tdP}></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#0f3460', color: 'white' }}>
              <td colSpan={5} style={{ padding: '12px 16px', fontSize: '14px' }}></td>
              <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>TOTAL</td>
              <td style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>S/ {total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          #cotizacion-print { box-shadow: none; border-radius: 0; }
        }
      `}</style>
    </div>
  )
}

const thP = { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }
const tdP = { padding: '10px 12px', fontSize: '12px', borderBottom: '1px solid #eee' }