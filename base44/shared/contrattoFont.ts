let regularFontBase64 = null;
let boldFontBase64 = null;

async function fetchFontAsBase64(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error('Font fetch failed: ' + url + ' -> ' + resp.status);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function registerContrattoFont(doc) {
  if (!regularFontBase64) {
    regularFontBase64 = await fetchFontAsBase64('https://cdn.jsdelivr.net/gh/openmaptiles/fonts@master/roboto/Roboto-Regular.ttf');
  }
  if (!boldFontBase64) {
    boldFontBase64 = await fetchFontAsBase64('https://cdn.jsdelivr.net/gh/openmaptiles/fonts@master/roboto/Roboto-Bold.ttf');
  }
  doc.addFileToVFS('Roboto-Regular.ttf', regularFontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', boldFontBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto');
  doc.setFont('Roboto', 'normal');
}