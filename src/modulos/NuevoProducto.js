import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function NuevoProducto() {
  const navigate = useNavigate()
  const [categorias, setCategorias] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    marca: '',
    categoria_id: '',
    unidad_medida: 'unidad',
    stock_minimo: 5,
    precio_compra: '',
    porcentaje_mayor: 20,
    porcentaje_menor: 35,
    precio_venta_mayor: '',
    precio_venta_menor: '',
    ubicacion: ''
  })

  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data)
    })
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    const nuevo = { ...form, [name]: value }

    // Recalcular precios si cambia precio_compra o porcentajes
    if (['precio_compra', 'porcentaje_mayor', 'porcentaje_menor'].includes(name)) {
      const pc = parseFloat(name === 'precio_compra' ? value : nuevo.precio_compra) || 0
      const pctMayor = parseFloat(name === 'porcentaje_mayor' ? value : nuevo.porcentaje_mayor) || 0
      const pctMenor = parseFloat(name === 'porcentaje_menor' ? value : nuevo.porcentaje_menor) || 0
      nuevo.precio_venta_mayor = pc > 0 ? (pc * (1 + pctMayor / 100)).toFixed(2) : ''
      nuevo.precio_venta_menor = pc > 0 ? (pc * (1 + pctMenor / 100)).toFixed(2) : ''
    }

    setForm(nuevo)
  }

  async function handleGuardar() {
    if (!form.codigo || !form.nombre) {
      alert('Código y nombre son obligatorios')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('productos').insert([{
      codigo: form.codigo,
      nombre: form.nombre,
      marca: form.marca,
      categoria_id: form.categoria_id || null,
      unidad_medida: form.unidad_medida,
      stock_minimo: parseFloat(form.stock_minimo) || 0,
      precio_compra: parseFloat(form.precio_compra) || 0,
      porcentaje_mayor: parseFloat(form.porcentaje_mayor) || 0,
      porcentaje_menor: parseFloat(form.porcentaje_menor) || 0,
      precio_venta_mayor: parseFloat(form.precio_venta_mayor) || 0,
      precio_venta_menor: parseFloat(form.precio_venta_menor) || 0,
      ubicacion: form.ubicacion
    }])
    if (error) {
      alert('Error: ' + error.message)
    } else {
      navigate('/productos')
    }
    setGuardando(false)
  }

  return (
    <div style={{ maxWidth: '650px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/productos')}
          style={{ background: 'none', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Volver
        </button>
        <h1 style={{ margin: 0 }}>Nuevo Producto</h1>
      </div>

      <div style={{ background: 'white', padding: '30px', borderRadius: '8px' }}>

        {/* IDENTIFICACIÓN */}
        <Seccion titulo="Identificación">
          <div style={grid2}>
            <Campo label="Código *">
              <input name="codigo" value={form.codigo} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Nombre *">
              <input name="nombre" value={form.nombre} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Marca">
              <input name="marca" value={form.marca} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="Categoría">
              <select name="categoria_id" value={form.categoria_id} onChange={handleChange} style={input}>
                <option value="">Sin categoría</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Unidad de medida">
              <select name="unidad_medida" value={form.unidad_medida} onChange={handleChange} style={input}>
                <option value="unidad">Unidad</option>
                <option value="metro">Metro</option>
                <option value="kg">Kilogramo</option>
                <option value="litro">Litro</option>
                <option value="rollo">Rollo</option>
                <option value="bolsa">Bolsa</option>
                <option value="caja">Caja</option>
              </select>
            </Campo>
            <Campo label="Ubicación en almacén">
              <input name="ubicacion" value={form.ubicacion} onChange={handleChange} style={input} placeholder="Ej: Pasillo 3, Estante B" />
            </Campo>
            <Campo label="Stock mínimo">
              <input name="stock_minimo" type="number" value={form.stock_minimo} onChange={handleChange} style={input} />
            </Campo>
          </div>
        </Seccion>

        {/* PRECIOS */}
        <Seccion titulo="Precios">
          <Campo label="Precio de compra (S/)">
            <input
              name="precio_compra"
              type="number"
              value={form.precio_compra}
              onChange={handleChange}
              style={{ ...input, marginBottom: '16px' }}
              placeholder="0.00"
            />
          </Campo>

          <div style={grid2}>
            <Campo label="% Rentabilidad Mayor">
              <input name="porcentaje_mayor" type="number" value={form.porcentaje_mayor} onChange={handleChange} style={input} />
            </Campo>
            <Campo label="% Rentabilidad Menor">
              <input name="porcentaje_menor" type="number" value={form.porcentaje_menor} onChange={handleChange} style={input} />
            </Campo>

            <Campo label="Precio venta mayor (S/)">
              <input
                name="precio_venta_mayor"
                type="number"
                value={form.precio_venta_mayor}
                onChange={handleChange}
                style={{ ...input, background: '#f0f7ff' }}
                placeholder="Calculado automático"
              />
            </Campo>
            <Campo label="Precio venta menor (S/)">
              <input
                name="precio_venta_menor"
                type="number"
                value={form.precio_venta_menor}
                onChange={handleChange}
                style={{ ...input, background: '#f0f7ff' }}
                placeholder="Calculado automático"
              />
            </Campo>
          </div>

          {form.precio_compra > 0 && (
            <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
              💡 Los precios azules se calculan automáticamente pero puedes editarlos.
            </p>
          )}
        </Seccion>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/productos')}
            style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {guardando ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </div>

      </div>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f3460', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {titulo}
      </h3>
      {children}
      <hr style={{ border: 'none', borderTop: '1px solid #eee', marginTop: '16px' }} />
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

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }
const input = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }