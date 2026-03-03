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