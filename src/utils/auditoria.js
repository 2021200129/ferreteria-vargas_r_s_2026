import { supabase } from '../supabase'

export async function registrarAuditoria({ usuario, accion, modulo, detalle, referenciaId }) {
  await supabase.from('auditoria').insert([{
    usuario_id: usuario?.id || null,
    usuario_nombre: usuario?.nombre || 'Sistema',
    accion,
    modulo,
    detalle: detalle || null,
    referencia_id: referenciaId || null,
  }])
}