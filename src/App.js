import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useState } from 'react'

import Dashboard from './modulos/Dashboard'
import Productos from './modulos/Productos'
import NuevoProducto from './modulos/NuevoProducto'
import EditarProducto from './modulos/EditarProducto'
import Ventas from './modulos/Ventas'
import NuevaVenta from './modulos/NuevaVenta'
import Compras from './modulos/Compras'
import NuevaCompra from './modulos/NuevaCompra'
import Cotizaciones from './modulos/Cotizaciones'
import NuevaCotizacion from './modulos/NuevaCotizacion'
import VerCotizacion from './modulos/VerCotizacion'
import Clientes from './modulos/Clientes'
import Proveedores from './modulos/Proveedores'
import Gastos from './modulos/Gastos'
import Reportes from './modulos/Reportes'
import Kardex from './modulos/Kardex'
import Transferencias from './modulos/Transferencias'
import CuentasPorCobrar from './modulos/CuentasPorCobrar'
import CuentasPorPagar from './modulos/CuentasPorPagar'
import Configuracion from './modulos/Configuracion'
import Usuarios from './modulos/Usuarios'
import Login from './modulos/Login'
import Exportacion from './modulos/Exportacion'
import Caja from './modulos/Caja'
import { usePermiso } from './context/AuthContext'
import RutaProtegida from './componentes/RutaProtegida'

import Auditoria from './modulos/Auditoria'
import NotaCredito from './modulos/NotaCredito'
import Vencimientos from './modulos/Vencimientos'

const MODULOS = [
  {
    seccion: 'OPERACIONES',
    items: [
      { id: 'dashboard',     label: '🏠 Inicio',           ruta: '/' },
      { id: 'ventas',        label: '🛒 Ventas',            ruta: '/ventas' },
      { id: 'notas-credito', label: '↩️ Devoluciones',     ruta: '/notas-credito' },
      { id: 'cotizaciones',  label: '📋 Cotizaciones',      ruta: '/cotizaciones' },
      { id: 'compras',       label: '📥 Compras',           ruta: '/compras' },
      { id: 'caja',          label: '🏧 Caja',              ruta: '/caja' },
      { id: 'gastos',        label: '💸 Gastos',            ruta: '/gastos' },
    ]
  },
  {
    seccion: 'CLIENTES Y PROVEEDORES',
    items: [
      { id: 'clientes',       label: '👥 Clientes',         ruta: '/clientes' },
      { id: 'cuentas-cobrar', label: '💰 Por Cobrar',       ruta: '/cuentas-por-cobrar' },
      { id: 'proveedores',    label: '🏭 Proveedores',      ruta: '/proveedores' },
      { id: 'cuentas-pagar',  label: '🧾 Por Pagar',        ruta: '/cuentas-por-pagar' },
    ]
  },
  {
    seccion: 'INVENTARIO',
    items: [
      { id: 'productos',      label: '📦 Productos',        ruta: '/productos' },
      { id: 'transferencias', label: '🔄 Transferencias',   ruta: '/transferencias' },
      { id: 'kardex',         label: '📋 Kardex',           ruta: '/kardex' },
      { id: 'vencimientos',   label: '📅 Vencimientos',     ruta: '/vencimientos' },
    ]
  },
  {
    seccion: 'REPORTES',
    items: [
      { id: 'reportes',    label: '📊 Reportes',            ruta: '/reportes' },
      { id: 'exportacion', label: '📤 Exportar Contador',   ruta: '/exportacion' },
      { id: 'auditoria',   label: '🔍 Auditoría',           ruta: '/auditoria' },
    ]
  },
  {
    seccion: 'ADMINISTRACIÓN',
    items: [
      { id: 'configuracion', label: '⚙️ Configuración',    ruta: '/configuracion' },
      { id: 'usuarios',      label: '👤 Usuarios',          ruta: '/usuarios' },
    ]
  },
]

function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { modulosPermitidos } = usePermiso()

  // Todas las secciones abiertas por defecto
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(
    () => Object.fromEntries(MODULOS.map(g => [g.seccion, true]))
  )

  function toggleSeccion(seccion) {
    setSeccionesAbiertas(prev => ({ ...prev, [seccion]: !prev[seccion] }))
  }

  function estaActivo(ruta) {
    if (ruta === '/') return location.pathname === '/'
    return location.pathname.startsWith(ruta)
  }

  if (!usuario) return <Login />

  const permitidos = modulosPermitidos()

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{
        width: '220px',
        background: '#1a1a2e',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>🏗️ Vargas DCP</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.6 }}>
            {usuario.nombre} · {usuario.rol}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {MODULOS.map((grupo) => {
            // Filtrar items según permisos
            const itemsVisibles = grupo.items.filter(m =>
              permitidos === null || permitidos.includes(m.id)
            )
            if (itemsVisibles.length === 0) return null

            const abierto = seccionesAbiertas[grupo.seccion]

            return (
              <div key={grupo.seccion}>
                {/* Cabecera de sección clickeable */}
                <button
                  onClick={() => toggleSeccion(grupo.seccion)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px 4px 20px',
                    color: 'rgba(255,255,255,0.45)',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{
                    fontSize: '10px',
                    letterSpacing: '1.5px',
                    fontWeight: 'bold',
                  }}>
                    {grupo.seccion}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    transition: 'transform 0.2s',
                    transform: abierto ? 'rotate(0deg)' : 'rotate(-90deg)',
                    display: 'inline-block',
                  }}>
                    ▾
                  </span>
                </button>

                {/* Items colapsables */}
                <div style={{
                  overflow: 'hidden',
                  maxHeight: abierto ? `${itemsVisibles.length * 44}px` : '0px',
                  transition: 'max-height 0.25s ease',
                }}>
                  {itemsVisibles.map(m => (
                    <button
                      key={m.id}
                      onClick={() => navigate(m.ruta)}
                      style={{
                        width: '100%',
                        background: estaActivo(m.ruta) ? '#16213e' : 'transparent',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        borderLeft: estaActivo(m.ruta) ? '3px solid #4a90d9' : '3px solid transparent',
                        boxSizing: 'border-box',
                        display: 'block',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #333' }}>
          <button
            onClick={() => { logout(); navigate('/') }}
            style={{
              width: '100%',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, padding: '30px', background: '#f5f5f5', overflow: 'auto' }}>
        <Routes>
          <Route path="/"                       element={<Dashboard />} />
          <Route path="/dashboard"              element={<Dashboard />} />
          <Route path="/productos"              element={<Productos />} />
          <Route path="/productos/nuevo"        element={<NuevoProducto />} />
          <Route path="/productos/editar/:id"   element={<EditarProducto />} />
          <Route path="/ventas"                 element={<Ventas />} />
          <Route path="/ventas/nueva"           element={<NuevaVenta />} />
          <Route path="/compras"                element={<Compras />} />
          <Route path="/compras/nueva"          element={<NuevaCompra />} />
          <Route path="/cotizaciones"           element={<Cotizaciones />} />
          <Route path="/cotizaciones/nueva"     element={<NuevaCotizacion />} />
          <Route path="/cotizaciones/:id"       element={<VerCotizacion />} />
          <Route path="/clientes"               element={<Clientes />} />
          <Route path="/proveedores"            element={<Proveedores />} />
          <Route path="/gastos"                 element={<Gastos />} />
          {/* <Route path="/transferencias"         element={<Transferencias />} />
          <Route path="/kardex"                 element={<Kardex />} />
          <Route path="/reportes"               element={<Reportes />} /> */}
          {/* <Route path="/configuracion"          element={<Configuracion />} />
          <Route path="/usuarios"               element={<Usuarios />} />
          <Route path="/exportacion"            element={<Exportacion />} /> */}
          <Route path="/caja"                   element={<Caja />} />

          <Route path="/reportes" element={
            <RutaProtegida modulo="reportes"><Reportes /></RutaProtegida>
          } />
          <Route path="/exportacion" element={
            <RutaProtegida modulo="exportacion"><Exportacion /></RutaProtegida>
          } />
          <Route path="/usuarios" element={
            <RutaProtegida modulo="usuarios"><Usuarios /></RutaProtegida>
          } />
          <Route path="/configuracion" element={
            <RutaProtegida modulo="configuracion"><Configuracion /></RutaProtegida>
          } />
          <Route path="/cuentas-por-cobrar" element={
            <RutaProtegida modulo="cuentas-cobrar"><CuentasPorCobrar /></RutaProtegida>
          } />
          <Route path="/cuentas-por-pagar" element={
            <RutaProtegida modulo="cuentas-pagar"><CuentasPorPagar /></RutaProtegida>
          } />
          <Route path="/kardex" element={
            <RutaProtegida modulo="kardex"><Kardex /></RutaProtegida>
          } />
          <Route path="/transferencias" element={
            <RutaProtegida modulo="transferencias"><Transferencias /></RutaProtegida>
          } />
          <Route path="/auditoria" element={
            <RutaProtegida modulo="auditoria"><Auditoria /></RutaProtegida>
          } />
          <Route path="/notas-credito" element={
            <RutaProtegida modulo="notas-credito"><NotaCredito /></RutaProtegida>
          } />
          <Route path="/vencimientos" element={
            <RutaProtegida modulo="vencimientos"><Vencimientos /></RutaProtegida>
          } />
        </Routes>
      </div>

    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  )
}