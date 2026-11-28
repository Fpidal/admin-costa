// Mapa esquemático de "Cómo llegar" para la web pública.
// Sigue las rutas reales: Ruta 2 → Dolores → 63 → Esquina de Crotto → 11 →
// Gral. Conesa → 56 → Gral. Madariaga → 74 → Pinamar → 11 al norte.
// Alternativa: Ruta 36 y 11 hasta Esquina de Crotto. No está a escala.

const VERDE = '#103b37'
const PRINCIPAL = '#1c5550' // por Ruta 2
const ALTERNATIVA = '#c9a86a' // por Ruta 36 y 11
const DESTINO = '#1f7a4d'
const SERIF = 'var(--font-fraunces), Georgia, serif'

// Cartel de ruta: el ancho sale del largo del texto
function Cartel({ x, y, txt, color }: { x: number; y: number; txt: string; color: string }) {
  const w = 14 + txt.length * 6.6
  return (
    <g>
      <rect x={x - w / 2} y={y - 10} width={w} height={20} rx={4} fill={color} stroke="#fff" strokeWidth={1.5} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} letterSpacing=".06em" fill="#fff">{txt}</text>
    </g>
  )
}

function Ciudad({ x, y, lineas, anchor = 'start', dx = 10, dy = 4 }: {
  x: number; y: number; lineas: string[]; anchor?: 'start' | 'end'; dx?: number; dy?: number
}) {
  const tx = anchor === 'start' ? x + dx : x - dx
  const y0 = y + dy - (lineas.length - 1) * 7.5
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={VERDE} stroke="#fff" strokeWidth={2} />
      <text textAnchor={anchor} fontSize={12.5} fontWeight={600} fill={VERDE}>
        {lineas.map((l, i) => <tspan key={l} x={tx} y={y0 + i * 15}>{l}</tspan>)}
      </text>
    </g>
  )
}

export default function MapaComoLlegar({ en = false }: { en?: boolean }) {
  const ruta = en ? 'ROUTE' : 'RUTA'
  const costa = 'M560 0 C530 100 505 200 480 260 C460 310 450 345 444 380 C436 430 418 470 410 510 C405 535 400 550 396 560'
  return (
    <svg viewBox="0 0 600 560" role="img" aria-label={en ? 'Map: how to get to Costa Esmeralda from Buenos Aires' : 'Mapa: cómo llegar a Costa Esmeralda desde Buenos Aires'} style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
      {/* tierra y mar */}
      <rect width="600" height="560" fill="#f6f1e8" />
      <path d={`${costa} L600 560 L600 0 Z`} fill="#dbe7e6" />
      <path d={costa} fill="none" stroke="#b9cfcd" strokeWidth={2} />
      <path d={costa} fill="none" stroke="#e9e0cf" strokeWidth={8} opacity={.6} transform="translate(-7 0)" />
      <text x="548" y="150" textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={19} fill="#5f8784">{en ? 'Atlantic' : 'Mar'}</text>
      <text x="548" y="173" textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={19} fill="#5f8784">{en ? 'Ocean' : 'Argentino'}</text>
      <g fill="none" stroke="#a9c4c1" strokeWidth={1.5} strokeLinecap="round">
        <path d="M515 205 q10 -6 20 0 t20 0 t20 0" />
        <path d="M530 222 q10 -6 20 0 t20 0" />
      </g>

      {/* alternativa: Ruta 36 y 11 */}
      <path d="M90 70 C150 110 190 170 205 220 C215 255 220 280 220 300" fill="none" stroke={ALTERNATIVA} strokeWidth={4} strokeLinecap="round" />

      {/* principal: Ruta 2 → 63 → 11 → 56 → 74 → 11 */}
      <g fill="none" stroke={PRINCIPAL} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M90 70 C70 140 115 220 110 300" />
        <path d="M110 300 C150 310 180 300 220 300" />
        <path d="M220 300 C235 330 260 345 290 350" />
        <path d="M290 350 C280 400 245 420 250 470" />
        <path d="M250 470 C310 480 350 500 400 490" />
        <path d="M400 490 C412 440 420 400 428 368" />
      </g>
      <path d="M421 380 L430 360 L436 383" fill="none" stroke={PRINCIPAL} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />

      {/* carteles de ruta */}
      <Cartel x={94} y={190} txt={`${ruta} 2`} color={PRINCIPAL} />
      <Cartel x={162} y={128} txt={`${ruta} 36`} color={ALTERNATIVA} />
      <Cartel x={211} y={244} txt={`${ruta} 11`} color={ALTERNATIVA} />
      <Cartel x={165} y={304} txt={`${ruta} 63`} color={PRINCIPAL} />
      <Cartel x={252} y={334} txt={`${ruta} 11`} color={PRINCIPAL} />
      <Cartel x={262} y={412} txt={`${ruta} 56`} color={PRINCIPAL} />
      <Cartel x={326} y={488} txt={`${ruta} 74`} color={PRINCIPAL} />
      <Cartel x={414} y={432} txt={`${ruta} 11`} color={PRINCIPAL} />

      {/* ciudades */}
      <circle cx={90} cy={70} r={8} fill={VERDE} stroke="#fff" strokeWidth={2.5} />
      <text x={106} y={66} fontFamily={SERIF} fontSize={19} fill={VERDE}>Buenos Aires</text>
      <Ciudad x={110} y={300} lineas={['Dolores']} anchor="end" />
      <Ciudad x={220} y={300} lineas={['Esquina de', 'Crotto']} dx={12} dy={-14} />
      <Ciudad x={290} y={350} lineas={['General', 'Conesa']} dx={12} />
      <Ciudad x={250} y={470} lineas={['General', 'Madariaga']} anchor="end" dx={12} />
      <Ciudad x={400} y={490} lineas={['Pinamar']} anchor="end" dx={12} dy={20} />

      {/* destino */}
      <circle cx={430} cy={352} r={18} fill={DESTINO} opacity={.16} />
      <path d="M430 356 c-11 -13 -16 -21 -16 -29 a16 16 0 0 1 32 0 c0 8 -5 16 -16 29z" fill={DESTINO} stroke="#fff" strokeWidth={2} />
      <circle cx={430} cy={327} r={5.5} fill="#fff" />
      <rect x={456} y={312} width={132} height={52} rx={6} fill="#fff" stroke={DESTINO} strokeWidth={1.5} />
      <text x={522} y={334} textAnchor="middle" fontFamily={SERIF} fontSize={17} fill={VERDE}>Costa</text>
      <text x={522} y={354} textAnchor="middle" fontFamily={SERIF} fontSize={17} fill={VERDE}>Esmeralda</text>

      {/* referencias */}
      <g fontSize={12} fill={VERDE}>
        <line x1={24} y1={484} x2={56} y2={484} stroke={PRINCIPAL} strokeWidth={5} strokeLinecap="round" />
        <text x={66} y={488}>{en ? 'Via Route 2' : 'Por Ruta 2'}</text>
        <line x1={24} y1={506} x2={56} y2={506} stroke={ALTERNATIVA} strokeWidth={4} strokeLinecap="round" />
        <text x={66} y={510}>{en ? 'Via Routes 36 & 11' : 'Por Ruta 36 y 11'}</text>
        <text x={24} y={538} fontSize={11} fontStyle="italic" fill="#8b9490">{en ? 'Sketch · not to scale' : 'Esquema orientativo · no está a escala'}</text>
      </g>
    </svg>
  )
}
