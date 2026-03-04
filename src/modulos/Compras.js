import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Compras() {
  const [compras, setCompras] = useState([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()
  const [repitiendo, setRepitiendo] = useState(null)
  

  useEffect(() => { cargarCompras() }, [])

  async function cargarCompras() {
    setCargando(true)
    const { data, error } = await supabase
      .from('compras')
      .select('*, proveedores(nombre), almacenes(nombre)')
      .order('fecha', { ascending: false })
      .limit(100)
    if (error) console.error(error)
    else setCompras(data)
    setCargando(false)
  }

  async function repetirCompra(compra) {
    setRepitiendo(compra.id)
    const { data: detalle } = await supabase
      .from('detalle_compras')
      .select('*, productos(id, nombre, codigo, unidad_medida, precio_compra, tiene_vencimiento)')
      .eq('compra_id', compra.id)

    if (!detalle || detalle.length === 0) {
      alert('Esta compra no tiene detalle registrado')
      setRepitiendo(null)
      return
    }

    // Guardar en sessionStorage para que NuevaCompra lo lea
    sessionStorage.setItem('repetir_compra', JSON.stringify({
      proveedor_id: compra.proveedor_id,
      tipo_documento: compra.tipo_documento,
      items: detalle.map(d => ({
        producto_id: d.producto_id,
        nombre: d.productos?.nombre,
        codigo: d.productos?.codigo,
        unidad_medida: d.productos?.unidad_medida,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        tiene_vencimiento: d.productos?.tiene_vencimiento || false,
      }))
    }))

    navigate('/compras/nueva')
    setRepitiendo(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>📥 Compras</h1>
        <button
          onClick={() => navigate('/compras/nueva')}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
        >
          + Nueva Compra
        </button>
      </div>

      {cargando ? <p>Cargando...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#0f3460', color: 'white' }}>
              <th style={th}>Fecha</th>
              <th style={th}>Proveedor</th>
              <th style={th}>Almacén</th>
              <th style={th}>Documento</th>
              <th style={th}>Total</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {compras.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay compras registradas aún</td></tr>
            ) : (
              compras.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={td}>{new Date(c.fecha).toLocaleDateString('es-PE')}</td>
                  <td style={td}>{c.proveedores?.nombre || '—'}</td>
                  <td style={td}>{c.almacenes?.nombre || '—'}</td>
                  <td style={td}>{c.tipo_documento}</td>
                  <td style={{ ...td, fontWeight: 'bold' }}>
                    S/ {parseFloat(c.total || 0).toFixed(2)}
                    {c.moneda === 'USD' && (
                      <div style={{ fontSize: '11px', color: '#3498db' }}>
                        US$ {parseFloat(c.total_usd || 0).toFixed(2)} · TC: {c.tipo_cambio}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => repetirCompra(c)}
                      disabled={repitiendo === c.id}
                      style={{ background: '#f0f7ff', border: '1px solid #3498db', color: '#3498db', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      {repitiendo === c.id ? '...' : '🔄 Repetir'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }