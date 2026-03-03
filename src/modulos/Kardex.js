import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Kardex() {
  const [movimientos, setMovimientos] = useState([])
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [filtro, setFiltro] = useState({
    producto_id: '',
    almacen_id: '',
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    supabase.from('productos').select('id, codigo, nombre').order('nombre').then(({ data }) => setProductos(data || []))
    supabase.from('almacenes').select('*').then(({ data }) => setAlmacenes(data || []))
  }, [])

  async function buscar() {
    if (!filtro.producto_id) { alert('Selecciona un producto'); return }
    setCargando(true)
    let query = supabase
      .from('kardex')
      .select('*, productos(codigo, nombre), almacenes(nombre)')
      .eq('producto_id', filtro.producto_id)
      .gte('fecha', filtro.fecha_inicio)
      .lte('fecha', filtro.fecha_fin + 'T23:59:59')
      .order('fecha')

    if (filtro.almacen_id) query = query.eq('almacen_id', filtro.almacen_id)

    const { data } = await query
    setMovimientos(data || [])
    setCargando(false)
  }

  const producto = productos.find(p => p.id === filtro.producto_id)
  const totalEntradas = movimientos.filter(m => m.cantidad > 0).reduce((sum, m) => sum + m.cantidad, 0)
  const totalSalidas = movimientos.filter(m => m.cantidad < 0).reduce((sum, m) => sum + Math.abs(m.cantidad), 0)
  const stockFinal = movimientos.length > 0 ? movimientos[movimientos.length - 1].stock_resultante : 0

  function colorTipo(tipo) {
    const colores = {
      compra: '#2ecc71',
      venta: '#e74c3c',
      transferencia_entrada: '#3498db',
      transferencia_salida: '#e67e22',
      ajuste: '#9b59b6'
    }
    return colores[tipo] || '#95a5a6'
  }

  function etiquetaTipo(tipo) {
    const etiquetas = {
      compra: '📥 Compra',
      venta: '📤 Venta',
      transferencia_entrada: '📨 Transferencia entrada',
      transferencia_salida: '📦 Transferencia salida',
      ajuste: '⚙️ Ajuste'
    }
    return etiquetas[tipo] || tipo
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0' }}>📋 Kardex</h1>

      {/* FILTROS */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
          <Campo label="Producto *">
            <select value={filtro.producto_id} onChange={e => setFiltro({ ...filtro, producto_id: e.target.value })} style={input}>
              <option value="">Seleccionar producto...</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Almacén">
            <select value={filtro.almacen_id} onChange={e => setFiltro({ ...filtro, almacen_id: e.target.value })} style={input}>
              <option value="">Todos</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Desde">
            <input type="date" value={filtro.fecha_inicio} onChange={e => setFiltro({ ...filtro, fecha_inicio: e.target.value })} style={input} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={filtro.fecha_fin} onChange={e => setFiltro({ ...filtro, fecha_fin: e.target.value })} style={input} />
          </Campo>
          <button onClick={buscar}
            style={{ background: '#0f3460', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', height: '40px' }}>
            Buscar
          </button>
        </div>
      </div>

      {/* RESUMEN */}
      {movimientos.length > 0 && producto && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#555', fontSize: '15px' }}>
            {producto.codigo} — {producto.nombre}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Total Entradas</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#2ecc71' }}>{totalEntradas}</p>
            </div>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Total Salidas</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{totalSalidas}</p>
            </div>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #0f3460' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Stock Final</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#0f3460' }}>{stockFinal}</p>
            </div>
          </div>
        </div>
      )}

      {/* TABLA */}
      {cargando ? <p>Buscando...</p> : movimientos.length > 0 ? (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Fecha</th>
                <th style={th}>Tipo</th>
                <th style={th}>Almacén</th>
                <th style={th}>Entrada</th>
                <th style={th}>Salida</th>
                <th style={th}>Stock</th>
                <th style={th}>Costo Unit.</th>
                <th style={th}>Costo Total</th>
                <th style={th}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={td}>{new Date(m.fecha).toLocaleDateString('es-PE')}</td>
                  <td style={td}>
                    <span style={{ background: colorTipo(m.tipo), color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {etiquetaTipo(m.tipo)}
                    </span>
                  </td>
                  <td style={td}>{m.almacenes?.nombre || '—'}</td>
                  <td style={{ ...td, color: '#2ecc71', fontWeight: 'bold' }}>
                    {m.cantidad > 0 ? m.cantidad : '—'}
                  </td>
                  <td style={{ ...td, color: '#e74c3c', fontWeight: 'bold' }}>
                    {m.cantidad < 0 ? Math.abs(m.cantidad) : '—'}
                  </td>
                  <td style={{ ...td, fontWeight: 'bold' }}>{m.stock_resultante}</td>
                  <td style={td}>{m.costo_unitario > 0 ? `S/ ${parseFloat(m.costo_unitario).toFixed(2)}` : '—'}</td>
                  <td style={td}>{m.costo_total > 0 ? `S/ ${parseFloat(m.costo_total).toFixed(2)}` : '—'}</td>
                  <td style={{ ...td, fontSize: '12px', color: '#888' }}>{m.nota || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filtro.producto_id ? (
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
          No hay movimientos para este producto en el período seleccionado
        </div>
      ) : null}
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