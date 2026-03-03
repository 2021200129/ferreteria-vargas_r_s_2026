import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function NuevaCotizacion() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [productosSugeridos, setProductosSugeridos] = useState([])
  const [items, setItems] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    cliente_id: '',
    cliente_nombre: '',
    cliente_dni_ruc: '',
    cliente_direccion: '',
    cliente_ciudad: '',
    cliente_telefono: '',
    obra_actividad: '',
    tipo_pago: 'contado',
    fecha: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    supabase.from('clientes').select('*').order('nombre').then(({ data }) => setClientes(data || []))
  }, [])

  useEffect(() => {
    if (busqueda.length < 2) { setProductosSugeridos([]); return }
    supabase
      .from('productos')
      .select('*')
      .or(`nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%`)
      .limit(8)
      .then(({ data }) => setProductosSugeridos(data || []))
  }, [busqueda])

  function seleccionarCliente(e) {
    const id = e.target.value
    setForm({ ...form, cliente_id: id })
    if (!id) return
    const cliente = clientes.find(c => c.id === id)
    if (cliente) {
      setForm(prev => ({
        ...prev,
        cliente_id: id,
        cliente_nombre: cliente.nombre || '',
        cliente_dni_ruc: cliente.dni_ruc || '',
        cliente_direccion: cliente.direccion || '',
        cliente_ciudad: cliente.ciudad || '',
        cliente_telefono: cliente.telefono || '',
      }))
    }
  }

  function agregarProducto(p) {
    const existe = items.find(i => i.producto_id === p.id)
    if (existe) {
      setItems(items.map(i => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems([...items, {
        producto_id: p.id,
        nombre_producto: p.nombre,
        codigo_producto: p.codigo,
        unidad: p.unidad_medida,
        cantidad: 1,
        precio_unitario: p.precio_venta_menor || 0,
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

  const total = items.reduce((sum, i) => sum + (parseFloat(i.cantidad) * parseFloat(i.precio_unitario) || 0), 0)

  async function handleGuardar() {
    if (!form.cliente_nombre) { alert('El nombre del cliente es obligatorio'); return }
    if (items.length === 0) { alert('Agrega al menos un producto'); return }
    setGuardando(true)

    const { data: cot, error } = await supabase
      .from('cotizaciones')
      .insert([{ ...form, total }])
      .select()
      .single()

    if (error) { alert('Error: ' + error.message); setGuardando(false); return }

    const detalle = items.map(i => ({ ...i, cotizacion_id: cot.id }))
    await supabase.from('detalle_cotizaciones').insert(detalle)

    navigate(`/cotizaciones/${cot.id}`)
    setGuardando(false)
  }

  return (
    <div style={{ maxWidth: '750px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/cotizaciones')}
          style={{ background: 'none', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          ← Volver
        </button>
        <h1 style={{ margin: 0 }}>Nueva Cotización</h1>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0f3460', fontSize: '13px', textTransform: 'uppercase' }}>Datos del Cliente</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Campo label="Seleccionar cliente existente">
            <select value={form.cliente_id} onChange={seleccionarCliente} style={input}>
              <option value="">Nuevo cliente / escribir abajo</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Fecha">
            <input name="fecha" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={input} />
          </Campo>
          <Campo label="DNI / RUC">
            <input value={form.cliente_dni_ruc} onChange={e => setForm({ ...form, cliente_dni_ruc: e.target.value })} style={input} />
          </Campo>
          <Campo label="Nombre / Razón Social *">
            <input value={form.cliente_nombre} onChange={e => setForm({ ...form, cliente_nombre: e.target.value })} style={input} />
          </Campo>
          <Campo label="Dirección">
            <input value={form.cliente_direccion} onChange={e => setForm({ ...form, cliente_direccion: e.target.value })} style={input} />
          </Campo>
          <Campo label="Ciudad">
            <input value={form.cliente_ciudad} onChange={e => setForm({ ...form, cliente_ciudad: e.target.value })} style={input} />
          </Campo>
          <Campo label="Teléfono">
            <input value={form.cliente_telefono} onChange={e => setForm({ ...form, cliente_telefono: e.target.value })} style={input} />
          </Campo>
          <Campo label="Obra / Actividad">
            <input value={form.obra_actividad} onChange={e => setForm({ ...form, obra_actividad: e.target.value })} style={input} />
          </Campo>
          <Campo label="Tipo de pago">
            <select value={form.tipo_pago} onChange={e => setForm({ ...form, tipo_pago: e.target.value })} style={input}>
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
            </select>
          </Campo>
        </div>

        <div style={{ marginTop: '16px' }}>
          <Campo label="Buscar producto">
            <div style={{ position: 'relative' }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && productosSugeridos.length > 0) {
                    agregarProducto(productosSugeridos[0])
                  }
                }}
                placeholder="Escribe, busca o escanea código de barras..." style={input} />
              {productosSugeridos.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', borderRadius: '6px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {productosSugeridos.map(p => (
                    
                    <div key={p.id} onClick={() => agregarProducto(p)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <strong>{p.codigo}</strong> — {p.nombre}
                      <span style={{ float: 'right', color: '#0f3460' }}>S/ {p.precio_venta_menor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Campo>
        </div>
      </div>

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
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{item.nombre}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      Mayor: S/{item.precio_mayor} | Menor: S/{item.precio_menor}
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

          <div style={{ padding: '16px 24px', background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#888' }}>{items.length} producto(s) en el carrito</span>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#555' }}>Total:</span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f3460' }}>S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/cotizaciones')}
          style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
          Cancelar
        </button>
        <button onClick={handleGuardar} disabled={guardando}
          style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {guardando ? 'Guardando...' : '✓ Guardar Cotización'}
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