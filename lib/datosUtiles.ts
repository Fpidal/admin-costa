// Datos útiles para huéspedes en la web pública. Fuentes: "Info Útil" de
// Costa Esmeralda (libreta oficial, edición 2024) y pinamar.tur.ar/datos-utiles.
// Revisar antes de cada temporada: los teléfonos cambian.

export interface Telefono { nombre: string; nota?: string; numero: string; tel: string }
export interface GrupoTelefonos { titulo: string; items: Telefono[] }

// Conmutador del barrio: el interno se marca solo después de la coma (pausa)
const CONMUTADOR = '+541132217101'

const telefonos = (en: boolean): GrupoTelefonos[] => [
  {
    titulo: en ? 'Emergencies' : 'Emergencias',
    items: [
      { nombre: en ? 'Community guard' : 'Guardia del barrio', nota: en ? '24 h · switchboard, ext. 1104' : '24 h · conmutador, int. 1104', numero: '011 3221-7101', tel: `${CONMUTADOR},1104` },
      { nombre: en ? 'Security emergency' : 'Emergencia de seguridad', nota: en ? '24 h · switchboard, ext. 1911' : '24 h · conmutador, int. 1911', numero: '011 3221-7101', tel: `${CONMUTADOR},1911` },
      { nombre: en ? 'Ambulance (EMP)' : 'Ambulancia (EMP)', nota: en ? '24 h inside the community · or ext. 9999' : '24 h dentro del barrio · o int. 9999', numero: '(02246) 52-9000', tel: '+542246529000' },
      { nombre: en ? 'Police' : 'Policía', numero: '911', tel: '911' },
      { nombre: en ? 'Gas leak' : 'Escape de gas', nota: '24 h', numero: '0800 222 6782', tel: '08002226782' },
    ],
  },
  {
    titulo: en ? 'Health' : 'Salud',
    items: [
      { nombre: en ? 'Costa Salud doctor’s office' : 'Consultorio Costa Salud', nota: en ? 'Inside the community' : 'Dentro del barrio', numero: '2267 40-5577', tel: '+5492267405577' },
      { nombre: en ? 'Pinamar Municipal Hospital' : 'Hospital Municipal de Pinamar', nota: 'Av. Shaw 255', numero: '(02254) 49-1670', tel: '+542254491670' },
      { nombre: en ? 'Pharmacies on duty' : 'Farmacias de turno', nota: 'Pinamar', numero: '*128', tel: '*128' },
    ],
  },
  {
    titulo: en ? 'In the community' : 'En el barrio',
    items: [
      { nombre: en ? 'Grocery store' : 'Proveeduría', numero: '2267 46-9157', tel: '+5492267469157' },
      { nombre: 'Club House Golf', numero: '2254 59-3051', tel: '+5492254593051' },
      { nombre: en ? 'Sports office' : 'Secretaría deportiva', nota: en ? 'Tennis, paddle · ext. 1110' : 'Tenis, pádel · int. 1110', numero: '011 3221-7101', tel: `${CONMUTADOR},1110` },
      { nombre: 'Palma Bistro', numero: '2254 45-7854', tel: '+5492254457854' },
    ],
  },
  {
    titulo: en ? 'Beach and Pinamar' : 'Playa y Pinamar',
    items: [
      { nombre: en ? 'Punta Norte beach club' : 'Parador Punta Norte', numero: '2267 43-3361', tel: '+5492267433361' },
      { nombre: en ? 'Cabo Suelto beach club' : 'Parador Cabo Suelto', numero: '2254 59-3061', tel: '+5492254593061' },
      { nombre: en ? 'Amarras beach club' : 'Parador Amarras', numero: '2254 59-8357', tel: '+5492254598357' },
      { nombre: en ? 'Pinamar tourist info' : 'Turismo Pinamar', nota: 'WhatsApp', numero: '2254 59-0372', tel: '+5492254590372' },
    ],
  },
]

const consejos = (en: boolean): [string, string][] => en ? [
  ['Entry', 'Everyone must be authorized to enter. Before arriving, send us the full name and ID number of each guest.'],
  ['Rubbish', 'Organic waste in black bags (collected daily from 7:30). Recyclables in green bags. Always inside the bin.'],
  ['Noise', 'Music must not be heard outside the house. Parties only Friday, Saturday and the night before holidays, until 3 am.'],
  ['Fire', 'Barbecues only on the grill. Fireworks are forbidden throughout the community.'],
  ['Pets', 'Always on a leash, with vaccination record. Breeds considered dangerous are not allowed in (Law 14,107).'],
  ['Emergencies', 'The Costa Esmeralda app has an emergency button, and there are security totems at Golf, Sports and Cabo Suelto. Lifeguards from November to April.'],
] : [
  ['Ingreso', 'Todos los que entran tienen que estar autorizados. Antes de llegar, mandanos nombre, apellido y DNI de cada persona.'],
  ['Basura', 'Húmedos en bolsa negra (se retira todos los días desde las 7:30). Reciclables en bolsa verde. Siempre dentro del cesto.'],
  ['Ruidos', 'La música no se tiene que escuchar fuera de la casa. Fiestas solo viernes, sábados y vísperas de feriado, hasta las 3.'],
  ['Fuego', 'Asados solo en la parrilla. La pirotecnia está prohibida en todo el barrio.'],
  ['Mascotas', 'Siempre con correa y libreta de vacunas. No pueden ingresar razas consideradas peligrosas (Ley 14.107).'],
  ['Emergencias', 'La App de Costa Esmeralda tiene botón de emergencias, y hay tótems de seguridad en Golf, Deportiva y Cabo Suelto. Guardavidas de noviembre a abril.'],
]

export const datosUtiles = (en: boolean) => ({
  over: en ? 'Useful info' : 'Datos útiles',
  titulo: en ? 'Phones to keep at hand' : 'Teléfonos para tener a mano',
  sub: en ? 'Tap a number to call. For extensions, the phone dials the switchboard and then the extension.' : 'Tocá un número para llamar. En los internos, el teléfono marca el conmutador y después el interno.',
  telefonos: telefonos(en),
  consejosTit: en ? 'Good to know' : 'Para tener en cuenta',
  consejos: consejos(en),
  fuente: en ? 'Source: Costa Esmeralda “Info Útil” booklet and Pinamar Tourism. Numbers may change.' : 'Fuente: libreta "Info Útil" de Costa Esmeralda y Turismo Pinamar. Los teléfonos pueden cambiar.',
})
