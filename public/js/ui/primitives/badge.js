import { rotuloSync } from '../../infra/formatters.js';

const CORES = {
  ONLINE: 'bg-emerald-100 text-emerald-800',
  OFFLINE: 'bg-amber-100 text-amber-800',
  RECOVERY: 'bg-sky-100 text-sky-800',
  DESCONHECIDO: 'bg-slate-100 text-slate-500',
};

export function SyncBadge(estado) {
  const el = document.createElement('span');
  el.className = `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${CORES[estado] ?? CORES.DESCONHECIDO}`;
  const dot = document.createElement('span');
  dot.className = 'w-1.5 h-1.5 rounded-full bg-current';
  el.appendChild(dot);
  el.appendChild(document.createTextNode(rotuloSync(estado)));
  return el;
}
