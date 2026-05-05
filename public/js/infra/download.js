function extrairNomeArquivo(contentDisposition, fallback) {
  const header = String(contentDisposition ?? '');
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''));
  const simples = header.match(/filename="?([^";]+)"?/i);
  return simples?.[1]?.trim() || fallback;
}

export async function baixarArquivo(url, { fetch = globalThis.fetch, document = globalThis.document } = {}) {
  const resposta = await fetch(url);
  if (!resposta.ok) {
    let mensagem = resposta.statusText || 'Falha ao baixar arquivo.';
    try {
      const body = await resposta.json();
      mensagem = body.erro ?? mensagem;
    } catch (_) {}
    throw new Error(mensagem);
  }

  const blob = await resposta.blob();
  const contentDisposition = resposta.headers?.get?.('Content-Disposition');
  const fallback = url.split('/').at(-1)?.split('?')[0] || 'relatorio';
  const nome = extrairNomeArquivo(contentDisposition, fallback);
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = nome;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { nome };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
