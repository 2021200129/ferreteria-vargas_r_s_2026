import { usePermiso } from '../context/AuthContext'

export default function RutaProtegida({ modulo, children }) {
  const { puede } = usePermiso()

  if (!puede(modulo)) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px' }}>🔒</p>
        <h2 style={{ color: '#555' }}>Acceso restringido</h2>
        <p style={{ color: '#888' }}>No tienes permisos para ver este módulo.</p>
      </div>
    )
  }

  return children
}