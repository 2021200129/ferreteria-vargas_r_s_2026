import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    const [
      { data: ventasHoy },
      { data: ventasMes },
      { data: gastosMes },
      { data: porCobrar },
      { data: porPagar },
      { data: stockBajo },
      { data: ultimasVentas }
    ] = await Promise.all([
      supabase.from('ventas').select('total, forma_pago').gte('fecha', hoy),
      supabase.from('ventas').select('total').gte('fecha', hoy.slice(0, 7) + '-01'),
      supabase.from('gastos').select('monto').gte('fecha', hoy.slice(0, 7) + '-01'),
      supabase.from('cuentas_por_cobrar').select('monto_total, monto_pagado').eq('estado', 'pendiente'),
      supabase.from('cuentas_por_pagar').select('monto_total, monto_pagado').eq('estado', 'pendiente'),
      supabase.from('stock').select('cantidad, producto_id, almacen_id, productos(nombre, stock_minimo)').lt('cantidad', 5),
      supabase.from('ventas').select('fecha, total, forma_pago, clientes(nombre)').order('fecha', { ascending: false }).limit(5)
    ])

    const totalHoy = (ventasHoy || []).reduce((sum, v) => sum + (v.total || 0), 0)
    const totalMes = (ventasMes || []).reduce((sum, v) => sum + (v.total || 0), 0)
    const totalGastos = (gastosMes || []).reduce((sum, g) => sum + (g.monto || 0), 0)
    const totalCobrar = (porCobrar || []).reduce((sum, c) => sum + (c.monto_total - c.monto_pagado), 0)
    const totalPagar = (porPagar || []).reduce((sum, c) => sum + (c.monto_total - c.monto_pagado), 0)

    const porFormaPago = {}
    ;(ventasHoy || []).forEach(v => {
      porFormaPago[v.forma_pago] = (porFormaPago[v.forma_pago] || 0) + (v.total || 0)
    })

    setDatos({
      totalHoy, totalMes, totalGastos,
      totalCobrar, totalPagar,
      stockBajo: (stockBajo || []).filter(s => s.productos && s.cantidad <= (s.productos.stock_minimo || 0)),
      ultimasVentas: ultimasVentas || [],
      porFormaPago,
      ventasCount: (ventasHoy || []).length
    })
    setCargando(false)
  }

  if (cargando) return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Cargando dashboard...</div>

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div>
      {/* SALUDO */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>{saludo} 👋</h1>
        <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* TARJETAS PRINCIPALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Tarjeta
          label="Ventas hoy"
          valor={`S/ ${datos.totalHoy.toFixed(2)}`}
          sub={`${datos.ventasCount} transacciones`}
          color="#2ecc71"
          icono="🛒"
          onClick={() => navigate('/ventas')}
        />
        <Tarjeta
          label="Ventas del mes"
          valor={`S/ ${datos.totalMes.toFixed(2)}`}
          sub={`Gastos: S/ ${datos.totalGastos.toFixed(2)}`}
          color="#3498db"
          icono="📅"
          onClick={() => navigate('/reportes')}
        />
        <Tarjeta
          label="Por cobrar"
          valor={`S/ ${datos.totalCobrar.toFixed(2)}`}
          sub="Pendiente de clientes"
          color="#f39c12"
          icono="💰"
          onClick={() => navigate('/cuentas-por-cobrar')}
        />
        <Tarjeta
          label="Por pagar"
          valor={`S/ ${datos.totalPagar.toFixed(2)}`}
          sub="Pendiente a proveedores"
          color="#e74c3c"
          icono="🧾"
          onClick={() => navigate('/cuentas-por-pagar')}
        />
      </div>

      {/* FORMA DE PAGO HOY */}
      {Object.keys(datos.porFormaPago).length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Ventas de hoy por forma de pago</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.entries(datos.porFormaPago).map(([forma, total]) => (
              <div key={forma} style={{ background: '#f9f9f9', padding: '12px 20px', borderRadius: '8px', textAlign: 'center', minWidth: '120px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>{forma}</p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '18px', color: '#0f3460' }}>S/ {total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* ÚLTIMAS VENTAS */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Últimas ventas</h3>
            <button onClick={() => navigate('/ventas')}
              style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: '13px' }}>
              Ver todas →
            </button>
          </div>
          {datos.ultimasVentas.length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px' }}>No hay ventas hoy</p>
          ) : (
            datos.ultimasVentas.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{v.clientes?.nombre || 'Cliente varios'}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>
                    {new Date(v.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} — {v.forma_pago}
                  </p>
                </div>
                <span style={{ fontWeight: 'bold', color: '#2ecc71' }}>S/ {v.total?.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        {/* STOCK BAJO */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ⚠️ Stock bajo ({datos.stockBajo.length})
            </h3>
            <button onClick={() => navigate('/productos')}
              style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: '13px' }}>
              Ver productos →
            </button>
          </div>
          {datos.stockBajo.length === 0 ? (
            <p style={{ color: '#2ecc71', fontSize: '13px' }}>✓ Todo el stock está bien</p>
          ) : (
            datos.stockBajo.slice(0, 6).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <p style={{ margin: 0, fontSize: '13px' }}>{s.productos?.nombre}</p>
                <span style={{
                  background: s.cantidad <= 0 ? '#e74c3c' : '#f39c12',
                  color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px'
                }}>
                  {s.cantidad <= 0 ? 'Agotado' : `Stock: ${s.cantidad}`}
                </span>
              </div>
            ))
          )}
        </div>

      </div>

      {/* ACCESOS RÁPIDOS */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Accesos rápidos</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: '+ Nueva Venta', ruta: '/ventas/nueva', color: '#2ecc71' },
            { label: '+ Nueva Compra', ruta: '/compras/nueva', color: '#3498db' },
            { label: '+ Nueva Cotización', ruta: '/cotizaciones/nueva', color: '#9b59b6' },
            { label: '+ Nuevo Gasto', ruta: '/gastos', color: '#e67e22' },
          ].map(a => (
            <button key={a.ruta} onClick={() => navigate(a.ruta)}
              style={{ background: a.color, color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tarjeta({ label, valor, sub, color, icono, onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: `4px solid ${color}`, cursor: 'pointer', transition: 'transform 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
          <p style={{ margin: '6px 0 4px 0', fontSize: '22px', fontWeight: 'bold', color }}>{valor}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{sub}</p>
        </div>
        <span style={{ fontSize: '28px' }}>{icono}</span>
      </div>
    </div>
  )
}