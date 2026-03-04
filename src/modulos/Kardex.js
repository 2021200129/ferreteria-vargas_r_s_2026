import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Kardex() {
  const [movimientos, setMovimientos] = useState([])
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [costoPromedio, setCostoPromedio] = useState(null)
  const [filtro, setFiltro] = useState({
    producto_id: '',
    almacen_id: '',
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    supabase.from('productos').select('id, codigo, nombre, costo_promedio, precio_compra').order('nombre').then(({ data }) => setProductos(data || []))
    supabase.from('almacenes').select('*').then(({ data }) => setAlmacenes(data || []))
  }, [])

  async function buscar() {
    if (!filtro.producto_id) { alert('Selecciona un producto'); return }
    setCargando(true)

    let query = supabase
      .from('kardex')
      .select('*, productos(codigo, nombre, costo_promedio), almacenes(nombre)')
      .eq('producto_id', filtro.producto_id)
      .gte('fecha', filtro.fecha_inicio)
      .lte('fecha', filtro.fecha_fin + 'T23:59:59')
      .order('fecha')

    if (filtro.almacen_id) query = query.eq('almacen_id', filtro.almacen_id)

    const { data } = await query
    setMovimientos(data || [])

    // Cargar costo promedio actual del producto
    const prod = productos.find(p => p.id === filtro.producto_id)
    setCostoPromedio(prod?.costo_promedio || prod?.precio_compra || 0)

    setCargando(false)
  }

  const producto = productos.find(p => p.id === filtro.producto_id)
  const totalEntradas = movimientos.filter(m => m.cantidad > 0).reduce((sum, m) => sum + m.cantidad, 0)
  const totalSalidas = movimientos.filter(m => m.cantidad < 0).reduce((sum, m) => sum + Math.abs(m.cantidad), 0)
  const stockFinal = movimientos.length > 0 ? movimientos[movimientos.length - 1].stock_resultante : 0
  const valorInventario = stockFinal * (costoPromedio || 0)

  const costoTotalEntradas = movimientos.filter(m => m.cantidad > 0).reduce((sum, m) => sum + (m.costo_total || 0), 0)
  const costoTotalSalidas = movimientos.filter(m => m.cantidad < 0).reduce((sum, m) => sum + (m.costo_total || 0), 0)

  function colorTipo(tipo) {
    const colores = {
      compra: '#2ecc71',
      venta: '#e74c3c',
      transferencia_entrada: '#3498db',
      transferencia_salida: '#e67e22',
      ajuste: '#9b59b6',
      nota_credito: '#f39c12',
    }
    return colores[tipo] || '#95a5a6'
  }

  function etiquetaTipo(tipo) {
    const etiquetas = {
      compra: '📥 Compra',
      venta: '📤 Venta',
      transferencia_entrada: '📨 Transf. entrada',
      transferencia_salida: '📦 Transf. salida',
      ajuste: '⚙️ Ajuste',
      nota_credito: '↩️ Devolución',
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
            
            <select value={filtro.producto_id} onChange={e => {
              const nuevoFiltro = { ...filtro, producto_id: e.target.value }
              setFiltro(nuevoFiltro)
              if (e.target.value) {
                // Buscar automático al seleccionar
                setTimeout(() => document.getElementById('btn-buscar-kardex').click(), 100)
              }
            }} style={input}>
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
          <button id="btn-buscar-kardex" onClick={buscar}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Entradas</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#2ecc71' }}>{totalEntradas}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>S/ {costoTotalEntradas.toFixed(2)}</p>
            </div>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Salidas</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#e74c3c' }}>{totalSalidas}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>S/ {costoTotalSalidas.toFixed(2)}</p>
            </div>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #0f3460' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Stock Final</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#0f3460' }}>{stockFinal}</p>
            </div>
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Costo Prom. (CPP)</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#f39c12' }}>
                S/ {parseFloat(costoPromedio || 0).toFixed(2)}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>Vigente hoy</p>
            </div>
            <div style={{ background: '#0f3460', padding: '16px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Valor Inventario</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                S/ {valorInventario.toFixed(2)}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                {stockFinal} × S/{parseFloat(costoPromedio || 0).toFixed(2)}
              </p>
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
                <th style={th}>C. Unit. (CPP)</th>
                <th style={th}>Costo Total</th>
                <th style={th}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={td}>
                    <div>{new Date(m.fecha).toLocaleDateString('es-PE')}</div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>{new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
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
                  <td style={td}>
                    {m.costo_unitario > 0
                      ? <span>
                          S/ {parseFloat(m.costo_unitario).toFixed(2)}
                          {m.tipo === 'compra' && <span style={{ fontSize: '10px', color: '#2ecc71', display: 'block' }}>nuevo CPP</span>}
                        </span>
                      : '—'}
                  </td>
                  <td style={{ ...td, fontWeight: m.costo_total > 0 ? 'bold' : 'normal' }}>
                    {m.costo_total > 0 ? `S/ ${parseFloat(m.costo_total).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...td, fontSize: '12px', color: '#888', maxWidth: '180px' }}>{m.nota || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>TOTALES DEL PERÍODO</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#2ecc71' }}>{totalEntradas}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e74c3c' }}>{totalSalidas}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{stockFinal}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#f39c12' }}>S/ {parseFloat(costoPromedio || 0).toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>S/ {valorInventario.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
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