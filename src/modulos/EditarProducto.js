import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { registrarAuditoria } from '../utils/auditoria'
import { useAuth } from '../context/AuthContext'

export default function EditarProducto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [categorias, setCategorias] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [form, setForm] = useState(null)
  const { usuario } = useAuth()

  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => setCategorias(data || []))
    supabase.from('productos').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setForm(data)
    })
  }, [id])

  function handleChange(e) {
    const { name, value } = e.target
    const nuevo = { ...form, [name]: value }
    if (['precio_compra', 'porcentaje_mayor', 'porcentaje_menor'].includes(name)) {
      const pc = parseFloat(name === 'precio_compra' ? value : nuevo.precio_compra) || 0
      const pctMayor = parseFloat(name === 'porcentaje_mayor' ? value : nuevo.porcentaje_mayor) || 0
      const pctMenor = parseFloat(name === 'porcentaje_menor' ? value : nuevo.porcentaje_menor) || 0
      if (pc > 0) {
        nuevo.precio_venta_mayor = (pc * (1 + pctMayor / 100)).toFixed(2)
        nuevo.precio_venta_menor = (pc * (1 + pctMenor / 100)).toFixed(2)
      }
    }
    setForm(nuevo)
  }

  async function handleImagen(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    setSubiendo(true)
    const extension = archivo.name.split('.').pop()
    const nombreArchivo = `${id}.${extension}`
    const { error } = await supabase.storage
      .from('productos')
      .upload(nombreArchivo, archivo, { upsert: true })
    if (error) { alert('Error subiendo imagen: ' + error.message); setSubiendo(false); return }
    const { data: urlData } = supabase.storage.from('productos').getPublicUrl(nombreArchivo)
    setForm({ ...form, imagen_url: urlData.publicUrl })
    setSubiendo(false)
  }

  async function handleGuardar() {
    if (!form.codigo || !form.nombre) { alert('Código y nombre son obligatorios'); return }
    setGuardando(true)
    const { error } = await supabase.from('productos').update({
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
      ubicacion: form.ubicacion,
      imagen_url: form.imagen_url || null,
    }).eq('id', id)
    if (error) { alert('Error: ' + error.message) }
    else {
      await registrarAuditoria({
        usuario,
        accion: 'EDITAR_PRODUCTO',
        modulo: 'productos',
        detalle: `Editó: ${form.nombre} (${form.codigo})`,
        referenciaId: id
      })
      navigate('/productos')
    }
    setGuardando(false)
  }

  if (!form) return <p>Cargando...</p>

  return (
    <div style={{ maxWidth: '650px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
        <button onClick={() => navigate('/productos')}
          style={{ background: 'none', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
          ← Volver
        </button>
        <h1 style={{ margin: 0 }}>Editar Producto</h1>
      </div>

      <div style={{ background: 'white', padding: '30px', borderRadius: '8px' }}>

        {/* IMAGEN */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          {form.imagen_url
            ? <img src={form.imagen_url} alt={form.nombre} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }} />
            : <div style={{ width: '80px', height: '80px', background: '#f0f0f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📦</div>
          }
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>Imagen del producto</label>
            <input type="file" accept="image/*" onChange={handleImagen} disabled={subiendo} />
            {subiendo && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>Subiendo imagen...</p>}
          </div>
        </div>

        <Seccion titulo="Identificación">
          <div style={grid2}>
            <Campo label="Código *"><input name="codigo" value={form.codigo || ''} onChange={handleChange} style={input} /></Campo>
            <Campo label="Código de barras (EAN)">
              <input name="codigo_barras" value={form.codigo_barras || ''} onChange={handleChange} style={input} placeholder="Escanea o escribe el EAN" />
            </Campo>
            <Campo label="Nombre *"><input name="nombre" value={form.nombre || ''} onChange={handleChange} style={input} /></Campo>
            <Campo label="Marca"><input name="marca" value={form.marca || ''} onChange={handleChange} style={input} /></Campo>
            <Campo label="Categoría">
              <select name="categoria_id" value={form.categoria_id || ''} onChange={handleChange} style={input}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Unidad de medida">
              <select name="unidad_medida" value={form.unidad_medida || ''} onChange={handleChange} style={input}>
                <option value="">Seleccionar...</option>
                <option value="unidad">Unidad</option>
                <option value="metro">Metro</option>
                <option value="kg">Kilogramo</option>
                <option value="litro">Litro</option>
                <option value="rollo">Rollo</option>
                <option value="bolsa">Bolsa</option>
                <option value="caja">Caja</option>
                <option value="par">Par</option>
                <option value="juego">Juego</option>
              </select>
            </Campo>
            <Campo label="Ubicación en almacén"><input name="ubicacion" value={form.ubicacion || ''} onChange={handleChange} style={input} placeholder="Ej: Pasillo 3, Estante B" /></Campo>
            <Campo label="Stock mínimo"><input name="stock_minimo" type="number" value={form.stock_minimo || 0} onChange={handleChange} style={input} /></Campo>
          </div>
        </Seccion>

        <Seccion titulo="Precios">
          <Campo label="Precio de compra (S/)">
            <input name="precio_compra" type="number" value={form.precio_compra || ''} onChange={handleChange} style={{ ...input, marginBottom: '16px' }} />
          </Campo>
          <div style={grid2}>
            <Campo label="% Rentabilidad Mayor"><input name="porcentaje_mayor" type="number" value={form.porcentaje_mayor || ''} onChange={handleChange} style={input} /></Campo>
            <Campo label="% Rentabilidad Menor"><input name="porcentaje_menor" type="number" value={form.porcentaje_menor || ''} onChange={handleChange} style={input} /></Campo>
            <Campo label="Precio venta mayor (S/)"><input name="precio_venta_mayor" type="number" value={form.precio_venta_mayor || ''} onChange={handleChange} style={{ ...input, background: '#f0f7ff' }} /></Campo>
            <Campo label="Precio venta menor (S/)"><input name="precio_venta_menor" type="number" value={form.precio_venta_menor || ''} onChange={handleChange} style={{ ...input, background: '#f0f7ff' }} /></Campo>
          </div>
        </Seccion>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={() => navigate('/productos')}
            style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', background: 'white' }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando}
            style={{ padding: '10px 24px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f3460', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>{titulo}</h3>
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