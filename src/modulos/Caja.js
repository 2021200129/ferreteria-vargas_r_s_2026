import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

export default function Caja() {
  const { usuario } = useAuth()
  const [cajaActiva, setCajaActiva] = useState(null)
  const [historial, setHistorial] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [resumenHoy, setResumenHoy] = useState(null)
  const [form, setForm] = useState({ almacen_id: '', monto_inicial: '' })
  const [cierre, setCierre] = useState({ monto_fisico: '', observaciones: '' })
  const [mostrarCierre, setMostrarCierre] = useState(false)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const hoy = new Date().toISOString().split('T')[0]

    const [{ data: alms }, { data: cajas }, { data: ventas }, { data: gastos }] = await Promise.all([
      supabase.from('almacenes').select('*'),
      supabase.from('cajas').select('*, almacenes(nombre), usuarios(nombre)')
        .order('fecha_apertura', { ascending: false }).limit(20),
      supabase.from('ventas').select('total, forma_pago').gte('fecha', hoy),
      supabase.from('gastos').select('monto').gte('fecha', hoy),
    ])
    const { data: cfg } = await supabase.from('configuracion').select('*')
    const cfgObj = {}
    ;(cfg || []).forEach(c => { cfgObj[c.clave] = c.valor })
    if (cfgObj.almacen_predeterminado) {
    setForm(prev => ({ ...prev, almacen_id: cfgObj.almacen_predeterminado }))
    }

    setAlmacenes(alms || [])
    setHistorial(cajas || [])

    const abierta = (cajas || []).find(c => c.estado === 'abierta' && c.usuarios?.nombre === usuario?.nombre)
    setCajaActiva(abierta || null)

    const totalVentas = (ventas || []).reduce((s, v) => s + (v.total || 0), 0)
    const totalEfectivo = (ventas || []).filter(v => v.forma_pago === 'efectivo').reduce((s, v) => s + (v.total || 0), 0)
    const totalGastos = (gastos || []).reduce((s, g) => s + (g.monto || 0), 0)
    const porFormaPago = {}
    ;(ventas || []).forEach(v => {
      porFormaPago[v.forma_pago] = (porFormaPago[v.forma_pago] || 0) + (v.total || 0)
    })

    setResumenHoy({ totalVentas, totalEfectivo, totalGastos, porFormaPago, cantVentas: (ventas || []).length })
    setCargando(false)
  }

  async function abrirCaja() {
    if (!form.almacen_id) { alert('Selecciona un almacén'); return }
    if (form.monto_inicial === '') { alert('Ingresa el monto inicial'); return }
    setGuardando(true)
    await supabase.from('cajas').insert([{
      almacen_id: form.almacen_id,
      usuario_id: usuario?.id,
      monto_inicial: parseFloat(form.monto_inicial),
      estado: 'abierta'
    }])
    setForm(prev => ({ ...prev, monto_inicial: '' }))
    cargarTodo()
    setGuardando(false)
  }

  async function cerrarCaja() {
    if (cierre.monto_fisico === '') { alert('Ingresa el monto físico contado'); return }
    setGuardando(true)

    const montoSistema = cajaActiva.monto_inicial + (resumenHoy?.totalEfectivo || 0) - (resumenHoy?.totalGastos || 0)
    const montoFisico = parseFloat(cierre.monto_fisico)
    const diferencia = montoFisico - montoSistema

    await supabase.from('cajas').update({
      fecha_cierre: new Date().toISOString(),
      monto_final_sistema: montoSistema,
      monto_final_fisico: montoFisico,
      diferencia: diferencia,
      observaciones: cierre.observaciones || null,
      estado: 'cerrada'
    }).eq('id', cajaActiva.id)

    setMostrarCierre(false)
    setCierre({ monto_fisico: '', observaciones: '' })
    cargarTodo()
    setGuardando(false)
  }

  if (cargando) return <p>Cargando...</p>

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0' }}>🏧 Caja</h1>

      {/* ESTADO ACTUAL */}
      {cajaActiva ? (
        <div style={{ background: '#2ecc71', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Caja abierta</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>
                {cajaActiva.almacenes?.nombre} — desde {new Date(cajaActiva.fecha_apertura).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>
                Monto inicial: S/ {parseFloat(cajaActiva.monto_inicial).toFixed(2)}
              </p>
            </div>
            <button onClick={() => setMostrarCierre(true)}
              style={{ background: 'white', color: '#2ecc71', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              Cerrar Caja
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: '#e74c3c', color: 'white', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
          ⚠️ No hay caja abierta. Abre una para registrar ventas.
        </div>
      )}

      {/* RESUMEN DEL DÍA */}
      {resumenHoy && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Resumen de hoy
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: '#f0fff4', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Total ventas</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#2ecc71' }}>S/ {resumenHoy.totalVentas.toFixed(2)}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>{resumenHoy.cantVentas} transacciones</p>
            </div>
            <div style={{ background: '#f0f7ff', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Efectivo en caja</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#3498db' }}>
                S/ {(cajaActiva ? parseFloat(cajaActiva.monto_inicial) : 0 + resumenHoy.totalEfectivo - resumenHoy.totalGastos).toFixed(2)}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>Inicial + ventas efectivo - gastos</p>
            </div>
            <div style={{ background: '#fff5f5', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Gastos del día</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#e74c3c' }}>S/ {resumenHoy.totalGastos.toFixed(2)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.entries(resumenHoy.porFormaPago).map(([forma, total]) => (
              <div key={forma} style={{ background: '#f9f9f9', padding: '8px 16px', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#888', textTransform: 'capitalize' }}>{forma}: </span>
                <strong>S/ {total.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABRIR CAJA */}
      {!cajaActiva && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f3460' }}>Abrir caja</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
            <Campo label="Almacén *">
              <select value={form.almacen_id} onChange={e => setForm({ ...form, almacen_id: e.target.value })} style={input}>
                <option value="">Seleccionar...</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Monto inicial en caja (S/) *">
              <input type="number" value={form.monto_inicial}
                onChange={e => setForm({ ...form, monto_inicial: e.target.value })}
                style={input} placeholder="¿Cuánto hay en la caja ahora?" />
            </Campo>
            <button onClick={abrirCaja} disabled={guardando}
              style={{ padding: '9px 24px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              {guardando ? 'Abriendo...' : '✓ Abrir Caja'}
            </button>
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Historial de cajas</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={th}>Fecha apertura</th>
              <th style={th}>Almacén</th>
              <th style={th}>Usuario</th>
              <th style={th}>Inicial</th>
              <th style={th}>Sistema</th>
              <th style={th}>Físico</th>
              <th style={th}>Diferencia</th>
              <th style={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay registros</td></tr>
            ) : (
              historial.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={td}>{new Date(c.fecha_apertura).toLocaleDateString('es-PE')} {new Date(c.fecha_apertura).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={td}>{c.almacenes?.nombre}</td>
                  <td style={td}>{c.usuarios?.nombre}</td>
                  <td style={td}>S/ {parseFloat(c.monto_inicial).toFixed(2)}</td>
                  <td style={td}>{c.monto_final_sistema ? `S/ ${parseFloat(c.monto_final_sistema).toFixed(2)}` : '—'}</td>
                  <td style={td}>{c.monto_final_fisico ? `S/ ${parseFloat(c.monto_final_fisico).toFixed(2)}` : '—'}</td>
                  <td style={td}>
                    {c.diferencia !== null && c.diferencia !== undefined && c.estado === 'cerrada' ? (
                      <span style={{ color: c.diferencia === 0 ? '#2ecc71' : c.diferencia > 0 ? '#3498db' : '#e74c3c', fontWeight: 'bold' }}>
                        {c.diferencia > 0 ? '+' : ''}S/ {parseFloat(c.diferencia).toFixed(2)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={td}>
                    <span style={{ background: c.estado === 'abierta' ? '#2ecc71' : '#95a5a6', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CIERRE */}
      {mostrarCierre && cajaActiva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '460px', padding: '30px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Cerrar Caja</h3>

            <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#555' }}>Resumen del sistema:</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>Monto inicial:</span>
                <strong>S/ {parseFloat(cajaActiva.monto_inicial).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span>+ Ventas en efectivo:</span>
                <strong style={{ color: '#2ecc71' }}>S/ {(resumenHoy?.totalEfectivo || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span>- Gastos:</span>
                <strong style={{ color: '#e74c3c' }}>S/ {(resumenHoy?.totalGastos || 0).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                <span>Debería haber:</span>
                <span style={{ color: '#0f3460' }}>
                  S/ {(parseFloat(cajaActiva.monto_inicial) + (resumenHoy?.totalEfectivo || 0) - (resumenHoy?.totalGastos || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Campo label="Monto físico contado (S/) *">
                <input type="number" value={cierre.monto_fisico}
                  onChange={e => setCierre({ ...cierre, monto_fisico: e.target.value })}
                  style={input} placeholder="¿Cuánto hay realmente en la caja?" autoFocus />
              </Campo>
              <Campo label="Observaciones">
                <input value={cierre.observaciones}
                  onChange={e => setCierre({ ...cierre, observaciones: e.target.value })}
                  style={input} placeholder="Ej: Faltaron S/20 por vuelto incorrecto" />
              </Campo>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setMostrarCierre(false)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
                Cancelar
              </button>
              <button onClick={cerrarCaja} disabled={guardando}
                style={{ padding: '10px 24px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                {guardando ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
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

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#555' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }