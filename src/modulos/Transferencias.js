import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Transferencias() {
  const [transferencias, setTransferencias] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [productosSugeridos, setProductosSugeridos] = useState([])
  const [items, setItems] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ almacen_origen_id: '', almacen_destino_id: '', motivo: '' })

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: trans }, { data: alms }] = await Promise.all([
      supabase.from('transferencias')
        .select('*, almacen_origen:almacenes!transferencias_almacen_origen_id_fkey(nombre), almacen_destino:almacenes!transferencias_almacen_destino_id_fkey(nombre), detalle_transferencias(cantidad, productos(nombre))')
        .order('fecha', { ascending: false })
        .limit(50),
      supabase.from('almacenes').select('*')
    ])
    setTransferencias(trans || [])
    setAlmacenes(alms || [])
    setCargando(false)
  }

  useEffect(() => {
    if (busqueda.length < 2) { setProductosSugeridos([]); return }
    supabase.from('productos').select('*')
      .or(`nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%`)
      .limit(8)
      .then(({ data }) => setProductosSugeridos(data || []))
  }, [busqueda])

  function agregarProducto(p) {
    const existe = items.find(i => i.producto_id === p.id)
    if (existe) {
      setItems(items.map(i => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems([...items, { producto_id: p.id, nombre: p.nombre, codigo: p.codigo, cantidad: 1, precio_compra: p.precio_compra || 0 }])
    }
    setBusqueda('')
    setProductosSugeridos([])
  }

  function actualizarItem(index, valor) {
    setItems(items.map((item, i) => i === index ? { ...item, cantidad: valor } : item))
  }

  function eliminarItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  async function handleGuardar() {
    if (!form.almacen_origen_id || !form.almacen_destino_id) { alert('Selecciona ambos almacenes'); return }
    if (form.almacen_origen_id === form.almacen_destino_id) { alert('Los almacenes deben ser diferentes'); return }
    if (items.length === 0) { alert('Agrega al menos un producto'); return }
    setGuardando(true)

    const { data: trans, error } = await supabase
      .from('transferencias')
      .insert([{ almacen_origen_id: form.almacen_origen_id, almacen_destino_id: form.almacen_destino_id, motivo: form.motivo }])
      .select().single()

    if (error) { alert('Error: ' + error.message); setGuardando(false); return }

    const detalle = items.map(i => ({ transferencia_id: trans.id, producto_id: i.producto_id, cantidad: parseFloat(i.cantidad) }))
    await supabase.from('detalle_transferencias').insert(detalle)

    // Actualizar stock y kardex
    for (const item of items) {
      const cant = parseFloat(item.cantidad)

      // Restar del origen
      const { data: stockOrigen } = await supabase.from('stock').select('cantidad')
        .eq('producto_id', item.producto_id).eq('almacen_id', form.almacen_origen_id).single()
      if (stockOrigen) {
        await supabase.from('stock').update({ cantidad: stockOrigen.cantidad - cant })
          .eq('producto_id', item.producto_id).eq('almacen_id', form.almacen_origen_id)
      }

      // Sumar al destino
      const { data: stockDestino } = await supabase.from('stock').select('cantidad')
        .eq('producto_id', item.producto_id).eq('almacen_id', form.almacen_destino_id).single()
      if (stockDestino) {
        await supabase.from('stock').update({ cantidad: stockDestino.cantidad + cant })
          .eq('producto_id', item.producto_id).eq('almacen_id', form.almacen_destino_id)
      } else {
        await supabase.from('stock').insert([{ producto_id: item.producto_id, almacen_id: form.almacen_destino_id, cantidad: cant }])
      }

      // Kardex salida
      await supabase.rpc('registrar_kardex', {
        p_producto_id: item.producto_id,
        p_almacen_id: form.almacen_origen_id,
        p_fecha: new Date().toISOString(),
        p_tipo: 'transferencia_salida',
        p_referencia_id: trans.id,
        p_referencia_tipo: 'transferencia',
        p_cantidad: -cant,
        p_costo_unitario: item.precio_compra,
        p_nota: form.motivo || 'Transferencia entre almacenes'
      })

      // Kardex entrada
      await supabase.rpc('registrar_kardex', {
        p_producto_id: item.producto_id,
        p_almacen_id: form.almacen_destino_id,
        p_fecha: new Date().toISOString(),
        p_tipo: 'transferencia_entrada',
        p_referencia_id: trans.id,
        p_referencia_tipo: 'transferencia',
        p_cantidad: cant,
        p_costo_unitario: item.precio_compra,
        p_nota: form.motivo || 'Transferencia entre almacenes'
      })
    }

    setForm({ almacen_origen_id: '', almacen_destino_id: '', motivo: '' })
    setItems([])
    setMostrarForm(false)
    cargarTodo()
    setGuardando(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>🔄 Transferencias</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          {mostrarForm ? '✕ Cancelar' : '+ Nueva Transferencia'}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Campo label="Almacén origen *">
              <select value={form.almacen_origen_id} onChange={e => setForm({ ...form, almacen_origen_id: e.target.value })} style={input}>
                <option value="">Seleccionar...</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Almacén destino *">
              <select value={form.almacen_destino_id} onChange={e => setForm({ ...form, almacen_destino_id: e.target.value })} style={input}>
                <option value="">Seleccionar...</option>
                {almacenes.filter(a => a.id !== form.almacen_origen_id).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Motivo">
              <input value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} style={input} placeholder="Ej: Reposición stock" />
            </Campo>
          </div>

          <Campo label="Buscar producto">
            <div style={{ position: 'relative' }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && productosSugeridos.length > 0) agregarProducto(productosSugeridos[0]) }}
                placeholder="Escribe nombre o escanea código..." style={input} />
              {productosSugeridos.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', borderRadius: '6px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {productosSugeridos.map(p => (
                    <div key={p.id} onClick={() => agregarProducto(p)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <strong>{p.codigo}</strong> — {p.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Campo>

          {items.length > 0 && (
            <div style={{ marginTop: '16px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={th}>Producto</th>
                    <th style={th}>Cantidad</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={td}>{item.nombre}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => { const n = parseFloat(item.cantidad) - 1; if (n <= 0) eliminarItem(i); else actualizarItem(i, n) }}
                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px' }}>−</button>
                          <input type="number" value={item.cantidad} onChange={e => actualizarItem(i, e.target.value)}
                            style={{ width: '60px', padding: '5px', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'center' }} />
                          <button onClick={() => actualizarItem(i, parseFloat(item.cantidad) + 1)}
                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px' }}>+</button>
                        </div>
                      </td>
                      <td style={td}>
                        <button onClick={() => eliminarItem(i)}
                          style={{ background: '#fee', border: '1px solid #fcc', color: '#e74c3c', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          🗑 Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={handleGuardar} disabled={guardando}
              style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {guardando ? 'Procesando...' : '✓ Registrar Transferencia'}
            </button>
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Fecha</th>
                <th style={th}>Origen</th>
                <th style={th}>Destino</th>
                <th style={th}>Productos</th>
                <th style={th}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {transferencias.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay transferencias registradas</td></tr>
              ) : (
                transferencias.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    <td style={td}>{new Date(t.fecha).toLocaleDateString('es-PE')}</td>
                    <td style={td}><span style={{ color: '#e74c3c' }}>📦 {t.almacen_origen?.nombre}</span></td>
                    <td style={td}><span style={{ color: '#2ecc71' }}>📨 {t.almacen_destino?.nombre}</span></td>
                    <td style={td}>
                      {(t.detalle_transferencias || []).map((d, j) => (
                        <div key={j} style={{ fontSize: '12px' }}>{d.productos?.nombre} × {d.cantidad}</div>
                      ))}
                    </td>
                    <td style={td}>{t.motivo || '—'}</td>
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

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }