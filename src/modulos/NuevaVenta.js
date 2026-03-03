import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function NuevaVenta() {
  const navigate = useNavigate()
  const [almacenes, setAlmacenes] = useState([])
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [productosSugeridos, setProductosSugeridos] = useState([])
  const [items, setItems] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    almacen_id: '',
    cliente_id: '',
    tipo_comprobante: 'ticket',
    forma_pago: 'efectivo',
    descuento: 0,
    motivo_descuento: '',
    usuario_id: '',
  })
  const [modalProducto, setModalProducto] = useState(null)
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    async function cargarDatos() {
      const [{ data: alms }, { data: clis }, { data: cfg }] = await Promise.all([
        supabase.from('almacenes').select('*'),
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('configuracion').select('*'),
        supabase.from('usuarios').select('id, nombre').eq('activo', true).order('nombre')
          .then(({ data }) => setUsuarios(data || []))
      ])
      setAlmacenes(alms || [])
      setClientes(clis || [])

      // Almacén predeterminado
      const cfgObj = {}
      ;(cfg || []).forEach(c => { cfgObj[c.clave] = c.valor })
      if (cfgObj.almacen_predeterminado) {
        setForm(prev => ({ ...prev, almacen_id: cfgObj.almacen_predeterminado }))
      }
    }
    cargarDatos()
  }, [])

  useEffect(() => {
    supabase.from('almacenes').select('*').then(({ data }) => setAlmacenes(data || []))
    supabase.from('clientes').select('*').order('nombre').then(({ data }) => setClientes(data || []))
  }, [])

  useEffect(() => {
    if (busqueda.length < 2) { setProductosSugeridos([]); return }
    supabase
      .from('productos')
      .select('*')
      .or(`nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%,codigo_barras.ilike.%${busqueda}%`)
      .limit(8)
      .then(({ data }) => setProductosSugeridos(data || []))
  }, [busqueda])

  function agregarProducto(p) {
    const existe = items.find(i => i.producto_id === p.id)
    if (existe) {
      setItems(items.map(i => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems([...items, {
        producto_id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        cantidad: 1,
        precio_unitario: p.precio_venta_menor,
        precio_compra: p.precio_compra,
        precio_mayor: p.precio_venta_mayor,
        precio_menor: p.precio_venta_menor,
        // datos para modal
        imagen_url: p.imagen_url,
        marca: p.marca,
        ubicacion: p.ubicacion,
      }])
    }
    setBusqueda('')
    setProductosSugeridos([])
  }

  function actualizarItem(index, campo, valor) {
    setItems(items.map((item, i) => i === index ? { ...item, [campo]: valor } : item))
  }

  function eliminarItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  // const total = items.reduce((sum, i) => sum + (parseFloat(i.cantidad) * parseFloat(i.precio_unitario) || 0), 0)
  const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.cantidad) * parseFloat(i.precio_unitario) || 0), 0)
  const descuento = parseFloat(form.descuento) || 0
  const total = subtotal - descuento

  async function handleGuardar() {
    if (!form.almacen_id) { alert('Selecciona un almacén'); return }
    if (items.length === 0) { alert('Agrega al menos un producto'); return }
    if (parseFloat(form.descuento) > 0 && !form.motivo_descuento) {
      alert('Escribe el motivo del descuento'); return
    }
    setGuardando(true)

    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert([{
        almacen_id: form.almacen_id,
        cliente_id: form.cliente_id || null,
        tipo_comprobante: form.tipo_comprobante,
        forma_pago: form.forma_pago,
        total: total,
        estado: 'completada',
        descuento: descuento,
        motivo_descuento: form.motivo_descuento || null,
        usuario_id: form.usuario_id || null,
        total: total,  // ya usa el total con descuento
      }])
      .select()
      .single()

    if (errorVenta) { alert('Error: ' + errorVenta.message); setGuardando(false); return }

    // Insertar detalle
    const detalle = items.map(i => ({
      venta_id: venta.id,
      producto_id: i.producto_id,
      cantidad: parseFloat(i.cantidad),
      precio_unitario: parseFloat(i.precio_unitario),
      precio_compra: parseFloat(i.precio_compra)
    }))
    await supabase.from('detalle_ventas').insert(detalle)

    for (const item of items) {
      const { data: stockActual } = await supabase
        .from('stock')
        .select('cantidad')
        .eq('producto_id', item.producto_id)
        .eq('almacen_id', form.almacen_id)
        .single()

      if (stockActual) {
        await supabase
          .from('stock')
          .update({ cantidad: stockActual.cantidad - parseFloat(item.cantidad) })
          .eq('producto_id', item.producto_id)
          .eq('almacen_id', form.almacen_id)
      } else {
        await supabase.from('stock').insert([{
          producto_id: item.producto_id,
          almacen_id: form.almacen_id,
          cantidad: -parseFloat(item.cantidad)
        }])
      }

      // Registrar en kardex
      await supabase.rpc('registrar_kardex', {
        p_producto_id: item.producto_id,
        p_almacen_id: form.almacen_id,
        p_fecha: new Date().toISOString(),
        p_tipo: 'venta',
        p_referencia_id: venta.id,
        p_referencia_tipo: 'venta',
        p_cantidad: -parseFloat(item.cantidad),
        p_costo_unitario: parseFloat(item.precio_compra),
        p_nota: `Venta ${venta.tipo_comprobante}`
      })
    }

    navigate('/ventas')
    setGuardando(false)
  }

  return (
    <div style={{ maxWidth: '750px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/ventas')}
          style={{ background: 'none', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          ← Volver
        </button>
        <h1 style={{ margin: 0 }}>Nueva Venta</h1>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          <Campo label="Almacén *">
            <select value={form.almacen_id} onChange={e => setForm({ ...form, almacen_id: e.target.value })} style={input}>
              <option value="">Seleccionar...</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </Campo>

          <Campo label="Cliente">
            <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} style={input}>
              <option value="">Cliente varios</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Campo>

          <Campo label="Comprobante">
            <select value={form.tipo_comprobante} onChange={e => setForm({ ...form, tipo_comprobante: e.target.value })} style={input}>
              <option value="ticket">Ticket</option>
              <option value="nota_venta">Nota de venta</option>
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
            </select>
          </Campo>

          <Campo label="Forma de pago">
            <select value={form.forma_pago} onChange={e => setForm({ ...form, forma_pago: e.target.value })} style={input}>
              <option value="efectivo">Efectivo</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </Campo>

          <Campo label="Vendedor">
            <select value={form.usuario_id} onChange={e => setForm({ ...form, usuario_id: e.target.value })} style={input}>
              <option value="">Sin asignar</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Campo>

          <Campo label="Descuento (S/)">
            <input
              type="number"
              value={form.descuento}
              onChange={e => setForm({ ...form, descuento: e.target.value })}
              style={input}
              placeholder="0.00"
              min="0"
            />
          </Campo>

          {parseFloat(form.descuento) > 0 && (
            <Campo label="Motivo del descuento *">
              <input
                value={form.motivo_descuento}
                onChange={e => setForm({ ...form, motivo_descuento: e.target.value })}
                style={input}
                placeholder="Ej: Cliente frecuente, producto dañado, negociación"
              />
            </Campo>
          )}
        </div>

        {/* BUSCADOR DE PRODUCTOS */}
        <Campo label="Buscar producto">
          <div style={{ position: 'relative' }}>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && productosSugeridos.length > 0) {
                  agregarProducto(productosSugeridos[0])
                }
              }}
              placeholder="Escribe, busca o escanea código de barras..."
              style={input}
              autoFocus
            />
            
            {productosSugeridos.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'white', border: '1px solid #ddd', borderRadius: '6px',
                zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {productosSugeridos.map(p => (
                  <div
                    key={p.id}
                    onClick={() => agregarProducto(p)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <strong>{p.codigo}</strong> — {p.nombre}
                    <span style={{ float: 'right', color: '#0f3460' }}>S/ {p.precio_venta_menor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Campo>
      </div>

      {/* TABLA DE ITEMS */}
      {items.length > 0 && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Producto</th>
                <th style={th}>Cant.</th>
                <th style={th}>Precio</th>
                <th style={th}>Subtotal</th>
                <th style={th}></th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px' }}>{item.nombre}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          Mayor: S/{item.precio_mayor} | Menor: S/{item.precio_menor}
                        </div>
                      </div>
                      <button onClick={() => setModalProducto(item)}
                        style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>
                        👁
                      </button>
                    </div>
                  </td>

                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => {
                          const nueva = parseFloat(item.cantidad) - 1
                          if (nueva <= 0) eliminarItem(i)
                          else actualizarItem(i, 'cantidad', nueva)
                        }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >−</button>

                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={e => actualizarItem(i, 'cantidad', e.target.value)}
                        style={{ width: '55px', padding: '5px', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'center', fontSize: '14px' }}
                      />

                      <button
                        onClick={() => actualizarItem(i, 'cantidad', parseFloat(item.cantidad) + 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >+</button>
                    </div>
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={item.precio_unitario}
                      onChange={e => actualizarItem(i, 'precio_unitario', e.target.value)}
                      style={{ width: '90px', padding: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                    />
                  </td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#0f3460' }}>
                    S/ {(parseFloat(item.cantidad) * parseFloat(item.precio_unitario) || 0).toFixed(2)}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => eliminarItem(i)}
                      style={{ background: '#fee', border: '1px solid #fcc', color: '#e74c3c', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >
                      🗑 Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* <div style={{ padding: '16px 24px', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#888' }}>{items.length} producto(s) en el carrito</span>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#555' }}>Total:</span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f3460' }}>S/ {total.toFixed(2)}</span>
            </div>
          </div> */}

          <div style={{ padding: '16px 24px', background: '#f9f9f9' }}>
            {descuento > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#888' }}>Subtotal:</span>
                <span style={{ fontSize: '14px', color: '#555' }}>S/ {subtotal.toFixed(2)}</span>
              </div>
            )}
            {descuento > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#e74c3c' }}>Descuento:</span>
                <span style={{ fontSize: '14px', color: '#e74c3c' }}>- S/ {descuento.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '16px', color: '#555' }}>Total:</span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f3460' }}>S/ {total.toFixed(2)}</span>
            </div>
          </div>

        </div>
      )}

      {/* BOTONES */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/ventas')}
          style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
          Cancelar
        </button>
        
        <button onClick={handleGuardar} disabled={guardando}
          style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {guardando ? 'Guardando...' : '✓ Registrar Venta'}
        </button>
      </div>

      <ModalProducto producto={modalProducto} onCerrar={() => setModalProducto(null)} />
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

function ModalProducto({ producto, onCerrar }) {
  if (!producto) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '420px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Imagen */}
        <div style={{ height: '220px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {producto.imagen_url
            ? <img src={producto.imagen_url} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <span style={{ fontSize: '80px' }}>📦</span>
          }
        </div>
        {/* Info */}
        <div style={{ padding: '20px' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#888' }}>{producto.codigo}</p>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{producto.nombre}</h3>
          {producto.marca && <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#888' }}>Marca: {producto.marca}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div style={{ background: '#f0f7ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Precio Mayor</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '20px', color: '#0f3460' }}>S/ {parseFloat(producto.precio_venta_mayor || 0).toFixed(2)}</p>
            </div>
            <div style={{ background: '#f0fff4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Precio Menor</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '20px', color: '#2ecc71' }}>S/ {parseFloat(producto.precio_venta_menor || 0).toFixed(2)}</p>
            </div>
          </div>
          {producto.ubicacion && (
            <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#888' }}>📍 Ubicación: {producto.ubicacion}</p>
          )}
        </div>
        <div style={{ padding: '0 20px 20px 20px' }}>
          <button onClick={onCerrar}
            style={{ width: '100%', padding: '10px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px' }
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }