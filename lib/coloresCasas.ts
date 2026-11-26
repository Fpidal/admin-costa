// Color de cada casa en calendarios y reportes: tonos apagados, azul para Golf
// y bordó para Deportiva; otras casas toman los siguientes de la paleta.
const PALETA = ['#6c8bb8', '#a8656d', '#6f9479', '#b0905a']

export function colorCasa(nombre: string, indice: number): string {
  const n = nombre.toLowerCase()
  if (n.includes('golf')) return PALETA[0]
  if (n.includes('deportiva')) return PALETA[1]
  return PALETA[(indice + 2) % PALETA.length]
}
