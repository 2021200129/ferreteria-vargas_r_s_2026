import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function CuentasPorPagar() {
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [modalPago, setModalPago] = useState(null)
  const [modalNueva, setModalNueva] = useState(false)
  const [proveedores, setProveedores] = useState([])
  const [pago, setPago] = useState({ monto: '', forma_pago: 'efectivo', nota: '', fecha: new Date().toISOString().split('T')[0] })
  const [nueva, setNueva] = useState({ proveedor_id: '', concepto: '', monto_total: '', fecha_vencimiento: '', fecha_emision: new Date().toISOString().split('T')[0] })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarTodo() }, [filtro])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: ctas }, { data: provs }] = await Promise.all([
      supabase.from('cuentas_por_pagar')
        .select('*, proveedores(nombre, ruc), pagos_proveedor(*)')
        .order('fecha_vencimiento'),
      supabase.from('proveedores').select('*').order('nombre')
    ])
    const filtradas = filtro === 'todos'
      ? (ctas || [])
      : (ctas || []).filter(c => c.estado === filtro)
    setCuentas(filtradas)
    setProveedores(provs || [])
    setCargando(false)
  }

  async function registrarPago() {
    if (!pago.monto || pago.monto <= 0) { alert('Ingresa un monto válido'); return }
    setGuardando(true)
    const cuenta = modalPago
    const nuevoPagado = parseFloat(cuenta.monto_pagado) + parseFloat(pago.monto)
    const nuevoEstado = nuevoPagado >= parseFloat(cuenta.monto_total) ? 'pagado' : 'pendiente'

    await supabase.from('pagos_proveedor').insert([{
      cuenta_id: cuenta.id,
      fecha: pago.fecha,
      monto: parseFloat(pago.monto),
      forma_pago: pago.forma_pago,
      nota: pago.nota
    }])

    await supabase.from('cuentas_por_pagar').update({
      monto_pagado: nuevoPagado,
      estado: nuevoEstado
    }).eq('id', cuenta.id)

    setPago({ monto: '', forma_pago: 'efectivo', nota: '', fecha: new Date().toISOString().split('T')[0] })
    setModalPago(null)
    cargarTodo()
    setGuardando(false)
  }

  async function crearCuenta() {
    if (!nueva.proveedor_id || !nueva.concepto || !nueva.monto_total) {
      alert('Proveedor, concepto y monto son obligatorios'); return
    }
    setGuardando(true)
    await supabase.from('cuentas_por_pagar').insert([{
      proveedor_id: nueva.proveedor_id,
      concepto: nueva.concepto,
      monto_total: parseFloat(nueva.monto_total),
      fecha_emision: nueva.fecha_emision,
      fecha_vencimiento: nueva.fecha_vencimiento || null,
      estado: 'pendiente'
    }])
    setNueva({ proveedor_id: '', concepto: '', monto_total: '', fecha_vencimiento: '', fecha_emision: new Date().toISOString().split('T')[0] })
    setModalNueva(false)
    cargarTodo()
    setGuardando(false)
  }

  const totalPendiente = cuentas
    .filter(c => c.estado === 'pendiente')
    .reduce((sum, c) => sum + (parseFloat(c.monto_total) - parseFloat(c.monto_pagado)), 0)

  const hoy = new Date().toISOString().split('T')[0]

  function colorEstado(c) {
    if (c.estado === 'pagado') return '#2ecc71'
    if (c.fecha_vencimiento && c.fecha_vencimiento < hoy) return '#e74c3c'
    return '#f39c12'
  }

  function etiquetaEstado(c) {
    if (c.estado === 'pagado') return 'Pagado'
    if (c.fecha_vencimiento && c.fecha_vencimiento < hoy) return 'Vencido'
    return 'Pendiente'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>🧾 Cuentas por Pagar</h1>
        <button onClick={() => setModalNueva(true)}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          + Nueva Cuenta
        </button>
      </div>

      {/* RESUMEN */}
      <div style={{ background: '#e74c3c', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Total pendiente de pago</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: 'bold' }}>S/ {totalPendiente.toFixed(2)}</p>
        </div>
        <div style={{ fontSize: '40px' }}>📤</div>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['pendiente', 'Pendientes'], ['pagado', 'Pagados'], ['todos', 'Todos']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)}
            style={{ padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px',
              background: filtro === val ? '#0f3460' : '#e0e0e0',
              color: filtro === val ? 'white' : '#555' }}>
            {label}
          </button>
        ))}
      </div>

      {/* TABLA */}
      {cargando ? <p>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f3460', color: 'white' }}>
                <th style={th}>Proveedor</th>
                <th style={th}>Concepto</th>
                <th style={th}>Emisión</th>
                <th style={th}>Vencimiento</th>
                <th style={th}>Total</th>
                <th style={th}>Pagado</th>
                <th style={th}>Saldo</th>
                <th style={th}>Estado</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay cuentas</td></tr>
              ) : (
                cuentas.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    <td style={td}>
                      <strong>{c.proveedores?.nombre || '—'}</strong>
                      <div style={{ fontSize: '11px', color: '#888' }}>{c.proveedores?.ruc}</div>
                    </td>
                    <td style={td}>{c.concepto}</td>
                    <td style={td}>{new Date(c.fecha_emision + 'T12:00:00').toLocaleDateString('es-PE')}</td>
                    <td style={td}>
                      {c.fecha_vencimiento
                        ? <span style={{ color: c.fecha_vencimiento < hoy && c.estado !== 'pagado' ? '#e74c3c' : 'inherit' }}>
                            {new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-PE')}
                          </span>
                        : '—'}
                    </td>
                    <td style={td}>S/ {parseFloat(c.monto_total).toFixed(2)}</td>
                    <td style={{ ...td, color: '#2ecc71' }}>S/ {parseFloat(c.monto_pagado).toFixed(2)}</td>
                    <td style={{ ...td, fontWeight: 'bold', color: '#e74c3c' }}>
                      S/ {(parseFloat(c.monto_total) - parseFloat(c.monto_pagado)).toFixed(2)}
                    </td>
                    <td style={td}>
                      <span style={{ background: colorEstado(c), color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>
                        {etiquetaEstado(c)}
                      </span>
                    </td>
                    <td style={td}>
                      {c.estado !== 'pagado' && (
                        <button onClick={() => setModalPago(c)}
                          style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          💸 Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PAGO */}
      {modalPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '420px' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Registrar Pago a Proveedor</h3>
            <p style={{ margin: '0 0 16px 0', color: '#888', fontSize: '13px' }}>
              {modalPago.proveedores?.nombre} — Saldo: <strong style={{ color: '#e74c3c' }}>S/ {(parseFloat(modalPago.monto_total) - parseFloat(modalPago.monto_pagado)).toFixed(2)}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Campo label="Fecha">
                <input type="date" value={pago.fecha} onChange={e => setPago({ ...pago, fecha: e.target.value })} style={input} />
              </Campo>
              <Campo label="Monto pagado (S/)">
                <input type="number" value={pago.monto} onChange={e => setPago({ ...pago, monto: e.target.value })} style={input} placeholder="0.00" autoFocus />
              </Campo>
              <Campo label="Forma de pago">
                <select value={pago.forma_pago} onChange={e => setPago({ ...pago, forma_pago: e.target.value })} style={input}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="yape">Yape</option>
                </select>
              </Campo>
              <Campo label="Nota (opcional)">
                <input value={pago.nota} onChange={e => setPago({ ...pago, nota: e.target.value })} style={input} placeholder="Ej: Pago parcial factura 001" />
              </Campo>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModalPago(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
                Cancelar
              </button>
              <button onClick={registrarPago} disabled={guardando}
                style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA */}
      {modalNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '420px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Nueva Cuenta por Pagar</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Campo label="Proveedor *">
                <select value={nueva.proveedor_id} onChange={e => setNueva({ ...nueva, proveedor_id: e.target.value })} style={input}>
                  <option value="">Seleccionar...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Campo>
              <Campo label="Concepto *">
                <input value={nueva.concepto} onChange={e => setNueva({ ...nueva, concepto: e.target.value })} style={input} placeholder="Ej: Compra tubería PVC factura 0234" />
              </Campo>
              <Campo label="Monto total (S/) *">
                <input type="number" value={nueva.monto_total} onChange={e => setNueva({ ...nueva, monto_total: e.target.value })} style={input} />
              </Campo>
              <Campo label="Fecha de emisión">
                <input type="date" value={nueva.fecha_emision} onChange={e => setNueva({ ...nueva, fecha_emision: e.target.value })} style={input} />
              </Campo>
              <Campo label="Fecha de vencimiento">
                <input type="date" value={nueva.fecha_vencimiento} onChange={e => setNueva({ ...nueva, fecha_vencimiento: e.target.value })} style={input} />
              </Campo>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModalNueva(false)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
                Cancelar
              </button>
              <button onClick={crearCuenta} disabled={guardando}
                style={{ padding: '10px 20px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {guardando ? 'Guardando...' : 'Crear Cuenta'}
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

const th = { padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }
const td = { padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #eee' }
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }