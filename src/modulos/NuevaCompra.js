import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { registrarAuditoria } from '../utils/auditoria'
import { useAuth } from '../context/AuthContext'

export default function NuevaCompra() {
  const navigate = useNavigate()
  const [almacenes, setAlmacenes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [productosSugeridos, setProductosSugeridos] = useState([])
  const [items, setItems] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    almacen_id: '',
    proveedor_id: '',
    tipo_documento: 'factura',
  })
  const { usuario } = useAuth()
  const [moneda, setMoneda] = useState('PEN')
  const [tipoCambio, setTipoCambio] = useState('')
  const [cargandoTC, setCargandoTC] = useState(false)

  async function obtenerTipoCambio() {
    setCargandoTC(true)
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const data = await res.json()
      setTipoCambio(data.rates.PEN.toFixed(3))
    } catch {
      setTipoCambio('3.750')
    }
    setCargandoTC(false)
  }

  useEffect(() => {
    async function cargarDatos() {
      const [{ data: alms }, { data: provs }, { data: cfg }] = await Promise.all([
        supabase.from('almacenes').select('*'),
        supabase.from('proveedores').select('*').order('nombre'),
        supabase.from('configuracion').select('*')
      ])
      setAlmacenes(alms || [])
      setProveedores(provs || [])

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
    supabase.from('proveedores').select('*').order('nombre').then(({ data }) => setProveedores(data || []))
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
        unidad_medida: p.unidad_medida,
        cantidad: 1,
        precio_unitario: p.precio_compra || 0,
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

  //const total = items.reduce((sum, i) => sum + (parseFloat(i.cantidad) * parseFloat(i.precio_unitario) || 0), 0)

  const totalUSD = items.reduce((sum, i) => sum + (parseFloat(i.cantidad) * parseFloat(i.precio_unitario) || 0), 0)
  const tc = parseFloat(tipoCambio) || 1
  const total = moneda === 'USD' ? totalUSD * tc : totalUSD

  async function handleGuardar() {
    if (!form.almacen_id) { alert('Selecciona un almacén'); return }
    if (items.length === 0) { alert('Agrega al menos un producto'); return }
    if (moneda === 'USD' && !tipoCambio) { alert('Ingresa el tipo de cambio'); return }
    setGuardando(true)

    const { data: compra, error } = await supabase.from('compras').insert([{
      almacen_id: form.almacen_id,
      proveedor_id: form.proveedor_id || null,
      tipo_documento: form.tipo_documento,
      total: total,
      total_usd: moneda === 'USD' ? totalUSD : null,
      moneda: moneda,
      tipo_cambio: moneda === 'USD' ? parseFloat(tipoCambio) : 1,
      estado: 'completada'
    }]).select().single()

    if (error) { alert('Error: ' + error.message); setGuardando(false); return }

    // Insertar detalle
    const detalle = items.map(i => ({
      compra_id: compra.id,
      producto_id: i.producto_id,
      cantidad: parseFloat(i.cantidad),
      precio_unitario: parseFloat(i.precio_unitario),
    }))
    await supabase.from('detalle_compras').insert(detalle)

    // Actualizar stock — compra SUMA al stock
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
          .update({ cantidad: stockActual.cantidad + parseFloat(item.cantidad) })
          .eq('producto_id', item.producto_id)
          .eq('almacen_id', form.almacen_id)
      } else {
        await supabase.from('stock').insert([{
          producto_id: item.producto_id,
          almacen_id: form.almacen_id,
          cantidad: parseFloat(item.cantidad)
        }])
      }

      // Registrar en kardex
      await supabase.rpc('registrar_kardex', {
        p_producto_id: item.producto_id,
        p_almacen_id: form.almacen_id,
        p_fecha: new Date().toISOString(),
        p_tipo: 'compra',
        p_referencia_id: compra.id,
        p_referencia_tipo: 'compra',
        p_cantidad: parseFloat(item.cantidad),
        p_costo_unitario: parseFloat(item.precio_unitario),
        p_nota: `Compra ${compra.tipo_documento}`
      })

      // Registrar historial de precio
      if (form.proveedor_id) {
        await supabase.from('historial_precios_compra').insert([{
          producto_id: item.producto_id,
          proveedor_id: form.proveedor_id,
          compra_id: compra.id,
          precio_unitario: parseFloat(item.precio_unitario),
        }])

        // Actualizar precio_compra en productos si cambió
        const { data: prodActual } = await supabase
          .from('productos').select('precio_compra').eq('id', item.producto_id).single()
        if (prodActual && parseFloat(item.precio_unitario) !== parseFloat(prodActual.precio_compra)) {
          await supabase.from('productos')
            .update({ precio_compra: parseFloat(item.precio_unitario) })
            .eq('id', item.producto_id)
        }
      }
    }



    await registrarAuditoria({
      usuario,
      accion: 'CREAR_COMPRA',
      modulo: 'compras',
      detalle: `Compra por S/ ${total.toFixed(2)} — ${items.length} productos`,
      referenciaId: compra.id
    })

    navigate('/compras')
    setGuardando(false)
  }

  return (
    <div style={{ maxWidth: '750px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/compras')}
          style={{ background: 'none', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          ← Volver
        </button>
        <h1 style={{ margin: 0 }}>Nueva Compra</h1>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          <Campo label="Almacén *">
            <select value={form.almacen_id} onChange={e => setForm({ ...form, almacen_id: e.target.value })} style={input}>
              <option value="">Seleccionar...</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </Campo>

          <Campo label="Proveedor">
            <select value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })} style={input}>
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>

          <Campo label="Tipo de documento">
            <select value={form.tipo_documento} onChange={e => setForm({ ...form, tipo_documento: e.target.value })} style={input}>
              <option value="factura">Factura</option>
              <option value="boleta">Boleta</option>
              <option value="ticket">Ticket</option>
              <option value="sin_documento">Sin documento</option>
            </select>
          </Campo>

          <Campo label="Moneda">
            <select value={moneda} onChange={e => { setMoneda(e.target.value); if (e.target.value === 'USD' && !tipoCambio) obtenerTipoCambio() }}
              style={input}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </select>
          </Campo>

          {moneda === 'USD' && (
            <Campo label="Tipo de cambio (S/ por US$)">
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" value={tipoCambio}
                  onChange={e => setTipoCambio(e.target.value)}
                  style={{ ...input, flex: 1 }}
                  placeholder="Ej: 3.750" />
                <button onClick={obtenerTipoCambio} disabled={cargandoTC}
                  style={{ padding: '9px 14px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px' }}>
                  {cargandoTC ? '...' : '🔄 Actualizar'}
                </button>
              </div>
              {tipoCambio && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>
                  US$ 1 = S/ {tipoCambio}
                </p>
              )}
            </Campo>
          )}
        </div>

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
                  <div key={p.id} onClick={() => agregarProducto(p)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <strong>{p.codigo}</strong> — {p.nombre}
                    <span style={{ float: 'right', color: '#888' }}>P.C: S/ {p.precio_compra}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Campo>
      </div>

      {items.length > 0 && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Producto</th>
                <th style={th}>Unidad</th>
                <th style={th}>Cant.</th>
                <th style={th}>P. Compra</th>
                <th style={th}>Subtotal</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{item.nombre}</td>
                  <td style={td}>{item.unidad_medida}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => {
                          const nueva = parseFloat(item.cantidad) - 1
                          if (nueva <= 0) eliminarItem(i)
                          else actualizarItem(i, 'cantidad', nueva)
                        }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px' }}
                      >−</button>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={e => actualizarItem(i, 'cantidad', e.target.value)}
                        style={{ width: '55px', padding: '5px', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'center', fontSize: '14px' }}
                      />
                      <button
                        onClick={() => actualizarItem(i, 'cantidad', parseFloat(item.cantidad) + 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px' }}
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
                  <td style={{ ...td, fontWeight: 'bold' }}>
                    S/ {(parseFloat(item.cantidad) * parseFloat(item.precio_unitario) || 0).toFixed(2)}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => eliminarItem(i)}
                      style={{ background: '#fee', border: '1px solid #fcc', color: '#e74c3c', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >🗑 Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: '16px 24px', background: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: '16px', alignItems: 'center' }}>
            {moneda === 'USD' && (
              <div style={{ textAlign: 'right', marginRight: '16px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Total en dólares</p>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#3498db' }}>US$ {totalUSD.toFixed(2)}</p>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              {moneda === 'USD' && <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#888' }}>TC: {tipoCambio}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '16px', color: '#555' }}>Total S/:</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f3460' }}>S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/compras')}
          style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={guardando}
          style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {guardando ? 'Guardando...' : '✓ Registrar Compra'}
        </button>
      </div>
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
const td = { padding: '12px 16px', fontSize: '13px' }
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }