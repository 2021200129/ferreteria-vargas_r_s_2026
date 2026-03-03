import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Configuracion() {
  const [config, setConfig] = useState({})
  const [almacenes, setAlmacenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const { data: configData } = await supabase.from('configuracion').select('*')
    const { data: almacenesData } = await supabase.from('almacenes').select('*, locales(nombre)')

    const configObj = {}
    ;(configData || []).forEach(c => { configObj[c.clave] = c.valor })
    setConfig(configObj)
    setAlmacenes(almacenesData || [])
    setCargando(false)
  }

  function handleChange(clave, valor) {
    setConfig({ ...config, [clave]: valor })
  }

  async function handleGuardar() {
    setGuardando(true)
    for (const [clave, valor] of Object.entries(config)) {
      await supabase
        .from('configuracion')
        .update({ valor })
        .eq('clave', clave)
    }
    setMensaje('✓ Configuración guardada')
    setTimeout(() => setMensaje(''), 3000)
    setGuardando(false)
  }

  if (cargando) return <p>Cargando...</p>

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ margin: '0 0 24px 0' }}>⚙️ Configuración</h1>

      {/* EMPRESA */}
      <Seccion titulo="Datos de la Empresa">
        <Campo label="Nombre de la empresa">
          <input
            value={config.nombre_empresa || ''}
            onChange={e => handleChange('nombre_empresa', e.target.value)}
            style={input}
          />
        </Campo>
        <Campo label="RUC">
          <input
            value={config.ruc_empresa || ''}
            onChange={e => handleChange('ruc_empresa', e.target.value)}
            style={input}
          />
        </Campo>
        <Campo label="Dirección">
          <input
            value={config.direccion_empresa || ''}
            onChange={e => handleChange('direccion_empresa', e.target.value)}
            style={input}
          />
        </Campo>
      </Seccion>

      {/* OPERACIÓN */}
      <Seccion titulo="Operación">
        <Campo label="Almacén predeterminado">
          <select
            value={config.almacen_predeterminado || ''}
            onChange={e => handleChange('almacen_predeterminado', e.target.value)}
            style={input}
          >
            <option value="">Sin predeterminado</option>
            {almacenes.map(a => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({a.locales?.nombre})
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Moneda">
          <input
            value={config.moneda || 'S/'}
            onChange={e => handleChange('moneda', e.target.value)}
            style={input}
          />
        </Campo>
        <Campo label="IGV (%)">
          <input
            type="number"
            value={config.igv || '18'}
            onChange={e => handleChange('igv', e.target.value)}
            style={input}
          />
        </Campo>
      </Seccion>

      {/* BOTÓN */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end' }}>
        {mensaje && <span style={{ color: '#2ecc71', fontSize: '14px' }}>{mensaje}</span>}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f3460', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {titulo}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
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

const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }