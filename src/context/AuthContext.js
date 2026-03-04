import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    const guardado = localStorage.getItem('usuario_vargas')
    if (guardado) setUsuario(JSON.parse(guardado))
  }, [])

  function login(user) {
    setUsuario(user)
    localStorage.setItem('usuario_vargas', JSON.stringify(user))
  }

  function logout() {
    setUsuario(null)
    localStorage.removeItem('usuario_vargas')
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function usePermiso() {
  const { usuario } = useContext(AuthContext)
  const rol = usuario?.rol || ''

  const permisos = {
    admin:      ['*'],
    vendedor:   ['dashboard', 'ventas', 'compras', 'cotizaciones', 'clientes', 'productos', 'caja'],
    almacenero: ['dashboard', 'productos', 'transferencias', 'kardex'],
    contador:   ['dashboard', 'reportes', 'exportacion', 'cuentas-cobrar', 'cuentas-pagar'],
  }

  function puede(modulo) {
    const lista = permisos[rol] || []
    return lista.includes('*') || lista.includes(modulo)
  }

  function modulosPermitidos() {
    const lista = permisos[rol] || []
    if (lista.includes('*')) return null
    return lista
  }

  return { puede, modulosPermitidos, rol }
}