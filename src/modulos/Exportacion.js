import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import * as XLSX from 'xlsx'

export default function Exportacion() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [generando, setGenerando] = useState(false)
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => { cargarResumen() }, [mes])

  async function cargarResumen() {
    setCargando(true)
    const inicio = mes + '-01'
    const fin = mes + '-31'

    const [{ data: ventas }, { data: compras }, { data: gastos }] = await Promise.all([
      supabase.from('ventas').select('*').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('compras').select('*').gte('fecha', inicio).lte('fecha', fin),
      supabase.from('gastos').select('*').gte('fecha', inicio).lte('fecha', fin),
    ])

    setResumen({
      ventas: ventas || [],
      compras: compras || [],
      gastos: gastos || [],
      totalVentas: (ventas || []).reduce((s, v) => s + (v.total || 0), 0),
      totalCompras: (compras || []).reduce((s, c) => s + (c.total || 0), 0),
      totalGastos: (gastos || []).reduce((s, g) => s + (g.monto || 0), 0),
    })
    setCargando(false)
  }

  async function exportarExcel() {
    setGenerando(true)
    const inicio = mes + '-01'
    const fin = mes + '-31'

    const [
      { data: ventas },
      { data: detalleVentas },
      { data: compras },
      { data: detalleCompras },
      { data: gastos },
      { data: cobrar },
      { data: pagar }
    ] = await Promise.all([
      supabase.from('ventas').select('*, clientes(nombre, dni_ruc), almacenes(nombre)').gte('fecha', inicio).lte('fecha', fin).order('fecha'),
      supabase.from('detalle_ventas').select('*, productos(codigo, nombre), ventas(fecha)').gte('ventas.fecha', inicio).lte('ventas.fecha', fin),
      supabase.from('compras').select('*, proveedores(nombre, ruc), almacenes(nombre)').gte('fecha', inicio).lte('fecha', fin).order('fecha'),
      supabase.from('detalle_compras').select('*, productos(codigo, nombre), compras(fecha)').gte('compras.fecha', inicio).lte('compras.fecha', fin),
      supabase.from('gastos').select('*').gte('fecha', inicio).lte('fecha', fin).order('fecha'),
      supabase.from('cuentas_por_cobrar').select('*, clientes(nombre, dni_ruc)').eq('estado', 'pendiente'),
      supabase.from('cuentas_por_pagar').select('*, proveedores(nombre, ruc)').eq('estado', 'pendiente'),
    ])

    const wb = XLSX.utils.book_new()

    // HOJA 1 — VENTAS
    const filasVentas = (ventas || []).map(v => ({
      'Fecha': new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-PE'),
      'Cliente': v.clientes?.nombre || 'Cliente varios',
      'DNI/RUC': v.clientes?.dni_ruc || '',
      'Almacén': v.almacenes?.nombre || '',
      'Comprobante': v.tipo_comprobante,
      'Forma de pago': v.forma_pago,
      'Total (S/)': parseFloat(v.total || 0),
    }))
    if (filasVentas.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(filasVentas)
      ws1['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws1, 'Ventas')
    }

    // HOJA 2 — COMPRAS
    const filasCompras = (compras || []).map(c => ({
      'Fecha': new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-PE'),
      'Proveedor': c.proveedores?.nombre || '—',
      'RUC Proveedor': c.proveedores?.ruc || '',
      'Almacén': c.almacenes?.nombre || '',
      'Tipo documento': c.tipo_documento,
      'Total (S/)': parseFloat(c.total || 0),
    }))
    if (filasCompras.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(filasCompras)
      ws2['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Compras')
    }

    // HOJA 3 — GASTOS
    const filasGastos = (gastos || []).map(g => ({
      'Fecha': new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-PE'),
      'Nombre/Razón': g.nombre_razon || '',
      'Concepto': g.concepto || '',
      'Tipo caja': g.tipo_caja,
      'Monto (S/)': parseFloat(g.monto || 0),
    }))
    if (filasGastos.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(filasGastos)
      ws3['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 14 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws3, 'Gastos')
    }

    // HOJA 4 — CUENTAS POR COBRAR
    const filasCobrar = (cobrar || []).map(c => ({
      'Cliente': c.clientes?.nombre || '—',
      'DNI/RUC': c.clientes?.dni_ruc || '',
      'Concepto': c.concepto,
      'Emisión': c.fecha_emision,
      'Vencimiento': c.fecha_vencimiento || '—',
      'Total (S/)': parseFloat(c.monto_total || 0),
      'Pagado (S/)': parseFloat(c.monto_pagado || 0),
      'Saldo (S/)': parseFloat(c.monto_total || 0) - parseFloat(c.monto_pagado || 0),
    }))
    if (filasCobrar.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(filasCobrar)
      ws4['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws4, 'Por Cobrar')
    }

    // HOJA 5 — CUENTAS POR PAGAR
    const filasPagar = (pagar || []).map(p => ({
      'Proveedor': p.proveedores?.nombre || '—',
      'RUC': p.proveedores?.ruc || '',
      'Concepto': p.concepto,
      'Emisión': p.fecha_emision,
      'Vencimiento': p.fecha_vencimiento || '—',
      'Total (S/)': parseFloat(p.monto_total || 0),
      'Pagado (S/)': parseFloat(p.monto_pagado || 0),
      'Saldo (S/)': parseFloat(p.monto_total || 0) - parseFloat(p.monto_pagado || 0),
    }))
    if (filasPagar.length > 0) {
      const ws5 = XLSX.utils.json_to_sheet(filasPagar)
      ws5['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws5, 'Por Pagar')
    }

    // HOJA 6 — RESUMEN
    const totalVentas = (ventas || []).reduce((s, v) => s + (v.total || 0), 0)
    const totalCompras = (compras || []).reduce((s, c) => s + (c.total || 0), 0)
    const totalGastos = (gastos || []).reduce((s, g) => s + (g.monto || 0), 0)
    const totalCobrar = (cobrar || []).reduce((s, c) => s + (c.monto_total - c.monto_pagado), 0)
    const totalPagar = (pagar || []).reduce((s, p) => s + (p.monto_total - p.monto_pagado), 0)

    const filasResumen = [
      { 'Concepto': 'VENTAS DEL MES', 'Monto (S/)': totalVentas },
      { 'Concepto': 'COMPRAS DEL MES', 'Monto (S/)': totalCompras },
      { 'Concepto': 'GASTOS DEL MES', 'Monto (S/)': totalGastos },
      { 'Concepto': '─────────────', 'Monto (S/)': '' },
      { 'Concepto': 'UTILIDAD BRUTA (Ventas - Compras - Gastos)', 'Monto (S/)': totalVentas - totalCompras - totalGastos },
      { 'Concepto': '─────────────', 'Monto (S/)': '' },
      { 'Concepto': 'CUENTAS POR COBRAR (pendiente)', 'Monto (S/)': totalCobrar },
      { 'Concepto': 'CUENTAS POR PAGAR (pendiente)', 'Monto (S/)': totalPagar },
    ]
    const ws6 = XLSX.utils.json_to_sheet(filasResumen)
    ws6['!cols'] = [{ wch: 45 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws6, 'Resumen')

    const nombreMes = new Date(mes + '-01').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    XLSX.writeFile(wb, `Contabilidad_Vargas_${mes}.xlsx`)
    setGenerando(false)
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0' }}>📤 Exportación para Contador</h1>

      {/* SELECTOR MES */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label style={{ fontSize: '14px', color: '#555', fontWeight: 'bold' }}>Mes a exportar:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
      </div>

      {/* RESUMEN */}
      {cargando ? <p>Calculando...</p> : resumen && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <Tarjeta label="Ventas del mes" valor={resumen.totalVentas} color="#2ecc71" icono="🛒" />
            <Tarjeta label="Compras del mes" valor={resumen.totalCompras} color="#3498db" icono="📥" />
            <Tarjeta label="Gastos del mes" valor={resumen.totalGastos} color="#e74c3c" icono="💸" />
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#555' }}>El archivo Excel incluirá:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                `📊 Hoja "Ventas" — ${resumen.ventas.length} registros`,
                `📊 Hoja "Compras" — ${resumen.compras.length} registros`,
                `📊 Hoja "Gastos" — ${resumen.gastos.length} registros`,
                `📊 Hoja "Por Cobrar" — cuentas pendientes`,
                `📊 Hoja "Por Pagar" — cuentas pendientes`,
                `📊 Hoja "Resumen" — utilidad del mes`,
              ].map((texto, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555' }}>
                  <span style={{ color: '#2ecc71' }}>✓</span> {texto}
                </div>
              ))}
            </div>
          </div>

          <button onClick={exportarExcel} disabled={generando}
            style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%' }}>
            {generando ? 'Generando Excel...' : '⬇️ Descargar Excel para Contador'}
          </button>
        </>
      )}
    </div>
  )
}

function Tarjeta({ label, valor, color, icono }) {
  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{label}</p>
          <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 'bold', color }}>S/ {parseFloat(valor).toFixed(2)}</p>
        </div>
        <span style={{ fontSize: '28px' }}>{icono}</span>
      </div>
    </div>
  )
}