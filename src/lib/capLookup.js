let comuniCache = null;

async function caricaComuni() {
  if (comuniCache) return comuniCache;
  const response = await fetch('https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json');
  if (!response.ok) return null;
  const comuni = await response.json();
  const mappa = {};
  for (const comune of comuni) {
    for (const cap of comune.cap || []) {
      if (!mappa[cap]) {
        mappa[cap] = { citta: comune.nome, provincia: comune.sigla };
      }
    }
  }
  comuniCache = mappa;
  return mappa;
}

export async function cercaCap(cap) {
  if (!/^\d{5}$/.test(cap)) return null;
  try {
    const mappa = await caricaComuni();
    return mappa?.[cap] || null;
  } catch (error) {
    return null;
  }
}