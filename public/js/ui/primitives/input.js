export function Input({ label, id, placeholder = '', type = 'text', value = '', onInput, required = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-1';
  if (label) {
    const lab = document.createElement('label');
    lab.className = 'text-[10px] uppercase tracking-widest text-on-surface-variant font-medium block';
    lab.textContent = label;
    if (id) lab.htmlFor = id;
    wrap.appendChild(lab);
  }
  const inp = document.createElement('input');
  inp.type = type;
  inp.placeholder = placeholder;
  inp.value = value;
  if (id) inp.id = id;
  if (required) inp.required = true;
  inp.className = 'w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-300';
  if (onInput) inp.addEventListener('input', (e) => onInput(e.target.value));
  wrap.appendChild(inp);
  return wrap;
}
