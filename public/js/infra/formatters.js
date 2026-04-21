export function formatarData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}
export function formatarHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
export function formatarNumero(n) {
  return (Number(n) || 0).toLocaleString('pt-BR');
}
const ROTULOS_SYNC = { ONLINE: 'Online', OFFLINE: 'Offline', RECOVERY: 'Recuperando' };
export function rotuloSync(estado) { return ROTULOS_SYNC[estado] ?? estado; }
