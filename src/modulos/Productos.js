import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { usePermiso } from '../context/AuthContext'
import { registrarAuditoria } from '../utils/auditoria'
import { useAuth } from '../context/AuthContext'


export default function Productos() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const navigate = useNavigate()

  const [modalAjuste, setModalAjuste] = useState(null)
  const [ajuste, setAjuste] = useState({ cantidad_real: '', motivo: '' })
  const [almacenes, setAlmacenes] = useState([])
  const [almacenAjuste, setAlmacenAjuste] = useState('')
  const [guardandoAjuste, setGuardandoAjuste] = useState(false)

  const { puede } = usePermiso()

  const { usuario } = useAuth()

  useEffect(() => {
    cargarProductos()
    supabase.from('almacenes').select('*').then(({ data }) => setAlmacenes(data || []))
  }, [])

  async function cargarProductos() {
    setCargando(true)
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre), stock(cantidad, almacen_id, almacenes(nombre))')
      .order('nombre')
    setProductos(data || [])
    setCargando(false)
  }

  async function eliminarProducto(id, nombre) {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return
    await supabase.from('productos').delete().eq('id', id)
    cargarProductos()
  }

  async function handleAjustarStock() {
    if (!almacenAjuste) { alert('Selecciona un almacén'); return }
    if (ajuste.cantidad_real === '') { alert('Ingresa la cantidad real'); return }
    setGuardandoAjuste(true)

    const cantidadReal = parseFloat(ajuste.cantidad_real)

    const { data: stockActual } = await supabase.from('stock')
      .select('cantidad')
      .eq('producto_id', modalAjuste.id)
      .eq('almacen_id', almacenAjuste)
      .single()

    const cantidadActual = stockActual?.cantidad || 0
    const diferencia = cantidadReal - cantidadActual

    if (diferencia === 0) {
      alert('El stock ya está en esa cantidad, no hay diferencia.')
      setGuardandoAjuste(false)
      return
    }

    if (stockActual) {
      await supabase.from('stock').update({ cantidad: cantidadReal })
        .eq('producto_id', modalAjuste.id).eq('almacen_id', almacenAjuste)
    } else {
      await supabase.from('stock').insert([{
        producto_id: modalAjuste.id,
        almacen_id: almacenAjuste,
        cantidad: cantidadReal
      }])
    }

    await supabase.rpc('registrar_kardex', {
      p_producto_id: modalAjuste.id,
      p_almacen_id: almacenAjuste,
      p_fecha: new Date().toISOString(),
      p_tipo: 'ajuste',
      p_referencia_id: null,
      p_referencia_tipo: 'ajuste',
      p_cantidad: diferencia,
      p_costo_unitario: modalAjuste.precio_compra || 0,
      p_nota: ajuste.motivo || 'Ajuste de inventario'
    })

    setModalAjuste(null)
    setAjuste({ cantidad_real: '', motivo: '' })
    setAlmacenAjuste('')
    cargarProductos()
    setGuardandoAjuste(false)

    await registrarAuditoria({
      usuario,
      accion: 'AJUSTE_STOCK',
      modulo: 'productos',
      detalle: `${modalAjuste.nombre} — diferencia: ${diferencia > 0 ? '+' : ''}${diferencia} — motivo: ${ajuste.motivo || 'Sin motivo'}`,
      referenciaId: modalAjuste.id
    })

    alert(`✅ Stock ajustado. Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia} unidades.`)
  }

  const productosIncompletos = productos.filter(p =>
    !p.precio_compra || p.precio_compra === 0 ||
    !p.precio_venta_menor || p.precio_venta_menor === 0 ||
    !p.unidad_medida
  )

  const productosFiltrados = busqueda === '__incompletos__'
    ? productosIncompletos
    : productos.filter(p =>
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
      )

  return (
    <div>
      {productosIncompletos.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#856404' }}>
            ⚠️ <strong>{productosIncompletos.length} productos</strong> tienen datos incompletos
          </span>
          <button onClick={() => setBusqueda(busqueda === '__incompletos__' ? '' : '__incompletos__')}
            style={{ background: '#ffc107', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            {busqueda === '__incompletos__' ? 'Ver todos' : 'Ver cuáles'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
        <input
          placeholder="Buscar por nombre o código..."
          value={busqueda === '__incompletos__' ? '' : busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ padding: '10px', width: '300px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
        />
        <button onClick={() => navigate('/productos/nuevo')}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>
          + Nuevo Producto
        </button>
      </div>

      {cargando ? <p>Cargando productos...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Imagen</th>
                <th style={th}>Código</th>
                <th style={th}>Nombre</th>
                <th style={th}>Categoría</th>
                <th style={th}>Unidad</th>
                <th style={th}>Stock</th>
                <th style={th}>P. Menor</th>
                <th style={th}>P. Mayor</th>
                {puede('reportes') && (
                  <th style={th}>P. Compra</th>
                )}
                <th style={th}>Mín.</th>
                <th style={th}>Ubicación</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay productos</td></tr>
              ) : (
                productosFiltrados.map((p, i) => {
                  const stockTotal = (p.stock || []).reduce((sum, s) => sum + (s.cantidad || 0), 0)
                  const colorStock = stockTotal <= 0 ? '#e74c3c' : stockTotal <= p.stock_minimo ? '#f39c12' : '#2ecc71'
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                      <td style={td}>
                        {p.imagen_url
                          ? <img src={p.imagen_url} alt={p.nombre} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                          : <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                        }
                      </td>
                      <td style={td}>{p.codigo}</td>
                      <td style={{ ...td, maxWidth: '200px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{p.nombre}</div>
                        {p.marca && <div style={{ fontSize: '11px', color: '#888' }}>{p.marca}</div>}
                      </td>
                      <td style={td}>{p.categorias?.nombre || '—'}</td>
                      <td style={td}>{p.unidad_medida || <span style={{ color: '#e74c3c' }}>⚠</span>}</td>
                      <td style={td}>
                        <span style={{ fontWeight: 'bold', color: colorStock }}>{stockTotal}</span>
                      </td>
                      <td style={td}>
                        {p.precio_venta_menor > 0
                          ? `S/ ${parseFloat(p.precio_venta_menor).toFixed(2)}`
                          : <span style={{ color: '#e74c3c' }}>⚠</span>}
                      </td>
                      <td style={td}>
                        {p.precio_venta_mayor > 0
                          ? `S/ ${parseFloat(p.precio_venta_mayor).toFixed(2)}`
                          : '—'}
                      </td>
                      {puede('reportes') && (
                        <td style={td}>S/ {parseFloat(p.precio_compra || 0).toFixed(2)}</td>
                      )}
                      <td style={td}>{p.stock_minimo || '—'}</td>
                      <td style={td}>{p.ubicacion || '—'}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button onClick={() => navigate(`/productos/editar/${p.id}`)}
                            style={{ background: '#3498db', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            ✏️
                          </button>
                          <button onClick={() => { setModalAjuste(p); setAjuste({ cantidad_real: '', motivo: '' }); setAlmacenAjuste('') }}
                            style={{ background: '#fff8e1', border: '1px solid #f39c12', color: '#f39c12', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            📦
                          </button>
                          <button onClick={() => eliminarProducto(p.id, p.nombre)}
                            style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', background: '#f9f9f9', fontSize: '13px', color: '#888' }}>
            {productosFiltrados.length} de {productos.length} productos
          </div>
        </div>
      )}

      {/* MODAL AJUSTE DE STOCK */}
      {modalAjuste && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', padding: '30px' }}>
            <h3 style={{ margin: '0 0 6px 0' }}>📦 Ajuste de Stock</h3>
            <p style={{ margin: '0 0 20px 0', color: '#888', fontSize: '13px' }}>
              {modalAjuste.codigo} — {modalAjuste.nombre}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>Almacén *</label>
                <select value={almacenAjuste} onChange={e => setAlmacenAjuste(e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>

              {almacenAjuste && (
                <StockActual productoId={modalAjuste.id} almacenId={almacenAjuste} />
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>
                  Cantidad real en físico *
                </label>
                <input
                  type="number"
                  value={ajuste.cantidad_real}
                  onChange={e => setAjuste({ ...ajuste, cantidad_real: e.target.value })}
                  style={inputStyle}
                  placeholder="¿Cuántas hay realmente?"
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>Motivo</label>
                <input
                  value={ajuste.motivo}
                  onChange={e => setAjuste({ ...ajuste, motivo: e.target.value })}
                  style={inputStyle}
                  placeholder="Ej: Conteo físico, merma, error de ingreso"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setModalAjuste(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
                Cancelar
              </button>
              <button onClick={handleAjustarStock} disabled={guardandoAjuste}
                style={{ padding: '10px 24px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                {guardandoAjuste ? 'Ajustando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StockActual({ productoId, almacenId }) {
  const [stockActual, setStockActual] = useState(null)

  useEffect(() => {
    supabase.from('stock').select('cantidad')
      .eq('producto_id', productoId)
      .eq('almacen_id', almacenId)
      .single()
      .then(({ data }) => setStockActual(data?.cantidad ?? 0))
  }, [productoId, almacenId])

  if (stockActual === null) return null
  return (
    <div style={{ background: '#f0f7ff', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
      Stock actual en sistema: <strong style={{ color: '#0f3460', fontSize: '16px' }}>{stockActual}</strong> unidades
    </div>
  )
}

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }
const td = { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #eee', verticalAlign: 'middle' }
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }