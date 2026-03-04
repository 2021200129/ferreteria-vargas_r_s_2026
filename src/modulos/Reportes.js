import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Reportes() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => { cargarDatos() }, [mes])

  async function cargarDatos() {
    setCargando(true)
    const inicio = mes + '-01'
    const fin = mes + '-31'

    const [
      { data: ventas },
      { data: detalleVentas },
      { data: compras },
      { data: gastos },
      { data: stockBajo },
      { data: ventasVendedor },
    ] = await Promise.all([
      supabase.from('ventas').select('*, clientes(nombre)').gte('fecha', inicio).lte('fecha', fin).order('fecha'),
      supabase.from('detalle_ventas').select('*, productos(nombre, codigo), ventas(fecha, total, forma_pago)').gte('ventas.fecha', inicio).lte('ventas.fecha', fin),
      supabase.from('compras').select('*, proveedores(nombre)').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('gastos').select('*').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('stock').select('cantidad, productos(nombre, stock_minimo, codigo), almacenes(nombre)'),
      supabase.from('ventas').select('total, usuario_id, usuarios(nombre)').gte('fecha', inicio).lte('fecha', fin),
    ])

    // Ventas por día
    const porDia = {}
    ;(ventas || []).forEach(v => {
      const dia = v.fecha?.slice(0, 10)
      if (!porDia[dia]) porDia[dia] = 0
      porDia[dia] += v.total || 0
    })

    // Ventas por forma de pago
    const porFormaPago = {}
    ;(ventas || []).forEach(v => {
      porFormaPago[v.forma_pago] = (porFormaPago[v.forma_pago] || 0) + (v.total || 0)
    })

    // Top 10 productos más vendidos
    const porProducto = {}
    ;(detalleVentas || []).forEach(d => {
      const nombre = d.productos?.nombre || 'Sin nombre'
      const codigo = d.productos?.codigo || ''
      if (!porProducto[nombre]) porProducto[nombre] = { nombre, codigo, cantidad: 0, total: 0 }
      porProducto[nombre].cantidad += parseFloat(d.cantidad || 0)
      porProducto[nombre].total += parseFloat(d.cantidad || 0) * parseFloat(d.precio_unitario || 0)
    })
    const topProductos = Object.values(porProducto).sort((a, b) => b.total - a.total).slice(0, 10)

    // Top 10 clientes
    const porCliente = {}
    ;(ventas || []).forEach(v => {
      const nombre = v.clientes?.nombre || 'Cliente varios'
      if (!porCliente[nombre]) porCliente[nombre] = { nombre, total: 0, visitas: 0 }
      porCliente[nombre].total += v.total || 0
      porCliente[nombre].visitas += 1
    })
    const topClientes = Object.values(porCliente).sort((a, b) => b.total - a.total).slice(0, 10)

    // Top proveedores
    const porProveedor = {}
    ;(compras || []).forEach(c => {
      const nombre = c.proveedores?.nombre || 'Sin proveedor'
      if (!porProveedor[nombre]) porProveedor[nombre] = { nombre, total: 0, compras: 0 }
      porProveedor[nombre].total += c.total || 0
      porProveedor[nombre].compras += 1
    })
    const topProveedores = Object.values(porProveedor).sort((a, b) => b.total - a.total).slice(0, 10)

    const porVendedor = {}
    ;(ventasVendedor || []).forEach(v => {
      const nombre = v.usuarios?.nombre || 'Sin asignar'
      if (!porVendedor[nombre]) porVendedor[nombre] = { nombre, total: 0, ventas: 0 }
      porVendedor[nombre].total += v.total || 0
      porVendedor[nombre].ventas += 1
    })
    const topVendedores = Object.values(porVendedor).sort((a, b) => b.total - a.total)

    // Stock bajo
    const stockAlerta = (stockBajo || []).filter(s => s.productos && s.cantidad <= (s.productos.stock_minimo || 0))

    const totalVentas = (ventas || []).reduce((s, v) => s + (v.total || 0), 0)
    const totalCosto = (detalleVentas || []).reduce((s, d) => s + (parseFloat(d.cantidad || 0) * parseFloat(d.precio_compra || 0)), 0)
    const totalGastos = (gastos || []).reduce((s, g) => s + (g.monto || 0), 0)
    const totalCompras = (compras || []).reduce((s, c) => s + (c.total || 0), 0)

    setDatos({
      totalVentas, totalCosto, totalGastos, totalCompras,
      ganancia: totalVentas - totalCosto,
      neto: totalVentas - totalCosto - totalGastos,
      porDia, porFormaPago,
      topProductos, topClientes, topProveedores,
      stockAlerta,
      cantVentas: (ventas || []).length,
      cantCompras: (compras || []).length,
      topVendedores,
    })
    setCargando(false)
  }

  if (cargando) return <p>Cargando reportes...</p>
  if (!datos) return null

  const maxDia = Math.max(...Object.values(datos.porDia), 1)
  const maxProducto = datos.topProductos[0]?.total || 1
  const maxCliente = datos.topClientes[0]?.total || 1
  const maxProveedor = datos.topProveedores[0]?.total || 1
  const maxVendedor = datos.topVendedores[0]?.total || 1

  const nombreMes = new Date(mes + '-02').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>📊 Reportes</h1>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
      </div>

      {/* RESUMEN CAJA */}
      <div style={{ background: '#0f3460', color: 'white', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', opacity: 0.8, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Resumen {nombreMes}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Total Ventas', valor: datos.totalVentas, color: '#2ecc71' },
            { label: 'Costo Ventas', valor: datos.totalCosto, color: '#e67e22' },
            { label: 'Ganancia Bruta', valor: datos.ganancia, color: '#3498db' },
            { label: 'Gastos', valor: datos.totalGastos, color: '#e74c3c' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>{item.label}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: item.color }}>
                S/ {item.valor.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '16px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ opacity: 0.7 }}>Neto del mes (Ganancia - Gastos)</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: datos.neto >= 0 ? '#2ecc71' : '#e74c3c' }}>
            S/ {datos.neto.toFixed(2)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '12px', opacity: 0.7, fontSize: '13px' }}>
          {Object.entries(datos.porFormaPago).map(([forma, total]) => (
            <span key={forma}>{forma}: S/ {total.toFixed(2)}</span>
          ))}
        </div>
      </div>

      {/* VENTAS POR DÍA */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Ventas por día
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(datos.porDia).sort().map(([dia, total]) => {
            const fecha = new Date(dia + 'T12:00:00')
            const diaSemana = fecha.toLocaleDateString('es-PE', { weekday: 'short' })
            const diaNum = fecha.getDate()
            return (
              <div key={dia} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#888', width: '80px' }}>{diaSemana} {diaNum}</span>
                <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                  <div style={{ width: `${(total / maxDia) * 100}%`, background: '#3498db', height: '100%', borderRadius: '4px', minWidth: '4px' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 'bold', width: '90px', textAlign: 'right' }}>S/ {total.toFixed(2)}</span>
              </div>
            )
          })}
          {Object.keys(datos.porDia).length === 0 && <p style={{ color: '#888', fontSize: '13px' }}>Sin ventas este mes</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* TOP PRODUCTOS */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🏆 Top 10 Productos
          </h3>
          {datos.topProductos.length === 0 ? <p style={{ color: '#888', fontSize: '13px' }}>Sin datos</p> : (
            datos.topProductos.map((p, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px' }}>
                    <strong style={{ color: '#0f3460' }}>#{i + 1}</strong> {p.nombre}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>S/ {p.total.toFixed(2)}</span>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '6px' }}>
                  <div style={{ width: `${(p.total / maxProducto) * 100}%`, background: '#0f3460', height: '100%', borderRadius: '4px' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#888' }}>{p.cantidad} unidades vendidas</span>
              </div>
            ))
          )}
        </div>

        {/* TOP CLIENTES */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
            👥 Top 10 Clientes
          </h3>
          {datos.topClientes.length === 0 ? <p style={{ color: '#888', fontSize: '13px' }}>Sin datos</p> : (
            datos.topClientes.map((c, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px' }}>
                    <strong style={{ color: '#2ecc71' }}>#{i + 1}</strong> {c.nombre}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>S/ {c.total.toFixed(2)}</span>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '6px' }}>
                  <div style={{ width: `${(c.total / maxCliente) * 100}%`, background: '#2ecc71', height: '100%', borderRadius: '4px' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#888' }}>{c.visitas} compras</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TOP PROVEEDORES */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🏭 Top Proveedores del mes
        </h3>
        {datos.topProveedores.length === 0 ? <p style={{ color: '#888', fontSize: '13px' }}>Sin compras este mes</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {datos.topProveedores.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px' }}><strong style={{ color: '#e67e22' }}>#{i + 1}</strong> {p.nombre}</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>S/ {p.total.toFixed(2)}</span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '6px' }}>
                    <div style={{ width: `${(p.total / maxProveedor) * 100}%`, background: '#e67e22', height: '100%', borderRadius: '4px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#888' }}>{p.compras} compras</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VENTAS POR VENDEDOR */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🧑‍💼 Ventas por vendedor
        </h3>
        {datos.topVendedores.length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px' }}>Sin datos — asigna vendedor al registrar ventas</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {datos.topVendedores.map((v, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px' }}>
                    <strong style={{ color: '#0f3460' }}>#{i + 1}</strong> {v.nombre}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>S/ {v.total.toFixed(2)}</span>
                    <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>{v.ventas} ventas</span>
                  </div>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px' }}>
                  <div style={{ width: `${(v.total / maxVendedor) * 100}%`, background: '#0f3460', height: '100%', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                  Ticket promedio: S/ {(v.total / v.ventas).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STOCK BAJO */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
          ⚠️ Stock bajo o agotado ({datos.stockAlerta.length})
        </h3>
        {datos.stockAlerta.length === 0 ? (
          <p style={{ color: '#2ecc71', fontSize: '13px' }}>✓ Todo el stock está bien</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>Código</th>
                <th style={th}>Producto</th>
                <th style={th}>Almacén</th>
                <th style={th}>Stock actual</th>
                <th style={th}>Stock mínimo</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {datos.stockAlerta.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{s.productos?.codigo}</td>
                  <td style={td}>{s.productos?.nombre}</td>
                  <td style={td}>{s.almacenes?.nombre}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: s.cantidad <= 0 ? '#e74c3c' : '#f39c12' }}>{s.cantidad}</td>
                  <td style={td}>{s.productos?.stock_minimo}</td>
                  <td style={td}>
                    <span style={{ background: s.cantidad <= 0 ? '#e74c3c' : '#f39c12', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '11px' }}>
                      {s.cantidad <= 0 ? 'Agotado' : 'Stock bajo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th = { padding: '10px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#555' }
const td = { padding: '10px 16px', fontSize: '13px' }