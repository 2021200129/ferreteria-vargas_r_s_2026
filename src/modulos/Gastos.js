import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [form, setForm] = useState({
    concepto: '',
    nombre_razon: '',
    monto: '',
    tipo_caja: 'principal',
    fecha: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { cargarGastos() }, [])

  async function cargarGastos() {
    setCargando(true)
    const { data } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100)
    setGastos(data || [])
    setCargando(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleGuardar() {
    if (!form.concepto) { alert('El concepto es obligatorio'); return }
    if (!form.monto || form.monto <= 0) { alert('Ingresa un monto válido'); return }
    setGuardando(true)
    const { error } = await supabase.from('gastos').insert([{
      concepto: form.concepto,
      nombre_razon: form.nombre_razon,
      monto: parseFloat(form.monto),
      tipo_caja: form.tipo_caja,
      fecha: form.fecha
    }])
    if (error) { alert('Error: ' + error.message) }
    else {
      setForm({ concepto: '', nombre_razon: '', monto: '', tipo_caja: 'principal', fecha: new Date().toISOString().split('T')[0] })
      setMostrarForm(false)
      cargarGastos()
    }
    setGuardando(false)
  }

  const gastosFiltrados = filtro === 'todos' ? gastos : gastos.filter(g => g.tipo_caja === filtro)

  const totalPrincipal = gastos.filter(g => g.tipo_caja === 'principal').reduce((sum, g) => sum + (g.monto || 0), 0)
  const totalMenor = gastos.filter(g => g.tipo_caja === 'menor').reduce((sum, g) => sum + (g.monto || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>💸 Gastos</h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: '#0f3460', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
        >
          {mostrarForm ? '✕ Cancelar' : '+ Nuevo Gasto'}
        </button>
      </div>

      {/* RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>Caja Principal</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
            S/ {totalPrincipal.toFixed(2)}
          </p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #e67e22' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>Caja Menor</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#e67e22' }}>
            S/ {totalMenor.toFixed(2)}
          </p>
        </div>
      </div>

      {/* FORMULARIO */}
      {mostrarForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0f3460' }}>Nuevo Gasto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Campo label="Fecha">
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Caja">
              <select name="tipo_caja" value={form.tipo_caja} onChange={handleChange} style={input}>
                <option value="principal">Caja Principal</option>
                <option value="menor">Caja Menor</option>
              </select>
            </Campo>
            <Campo label="Nombre / Razón Social">
              <input name="nombre_razon" value={form.nombre_razon} onChange={handleChange} style={input} placeholder="Ej: Hidrandina, Juan Pérez" />
            </Campo>
            <Campo label="Concepto *">
              <input name="concepto" value={form.concepto} onChange={handleChange} style={input} placeholder="Ej: Pago de luz, Gasolina" />
            </Campo>
            <Campo label="Monto (S/) *">
              <input name="monto" type="number" value={form.monto} onChange={handleChange} style={input} placeholder="0.00" />
            </Campo>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button onClick={handleGuardar} disabled={guardando}
              style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['todos', 'Todos'], ['principal', 'Caja Principal'], ['menor', 'Caja Menor']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)}
            style={{
              padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px',
              background: filtro === val ? '#0f3460' : '#e0e0e0',
              color: filtro === val ? 'white' : '#555'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* TABLA */}
      {cargando ? <p>Cargando...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#0f3460', color: 'white' }}>
              <th style={th}>Fecha</th>
              <th style={th}>Nombre / Razón Social</th>
              <th style={th}>Concepto</th>
              <th style={th}>Caja</th>
              <th style={th}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {gastosFiltrados.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No hay gastos registrados</td></tr>
            ) : (
              gastosFiltrados.map((g, i) => (
                <tr key={g.id} style={{ background: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  <td style={td}>{new Date(g.fecha).toLocaleDateString('es-PE')}</td>
                  <td style={td}>{g.nombre_razon || '—'}</td>
                  <td style={td}>{g.concepto}</td>
                  <td style={td}>
                    <span style={{
                      background: g.tipo_caja === 'principal' ? '#e74c3c' : '#e67e22',
                      color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '12px'
                    }}>
                      {g.tipo_caja === 'principal' ? 'Principal' : 'Menor'}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#e74c3c' }}>
                    S/ {g.monto?.toFixed(2)}
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