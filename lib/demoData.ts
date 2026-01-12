// Datos ficticios para modo demo

export const demoPropiedades = [
  {
    id: 'demo-prop-1',
    nombre: 'Casa Playa Norte',
    direccion: 'Av. Costanera 1234, Costa del Este',
    referencia: 'A 200m de la playa',
    telefono_contacto: '541155551234',
    tipo: 'casa',
    capacidad: 6,
    habitaciones: 3,
    banos: 2,
    camas: 4,
    plantas: 2,
    cochera: true,
    precio_alquiler: 150000,
    estado: 'disponible',
    descripcion: 'Hermosa casa con vista al mar',
    imagen_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    imagenes: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
    pileta: true,
    pileta_climatizada: false,
    parrilla: true,
    grupo_electrogeno: true,
    toilette: true,
    lavadero: true,
    lavavajillas: false,
    aire_acondicionado: true,
    calefaccion: true,
    fogonero: true,
    wifi: true,
    metros_cubiertos: 180,
    metros_semicubiertos: 40,
    metros_lote: 600,
  },
  {
    id: 'demo-prop-2',
    nombre: 'Depto Centro',
    direccion: 'Calle Principal 567, Costa del Este',
    referencia: 'Frente a la plaza central',
    telefono_contacto: '541155555678',
    tipo: 'departamento',
    capacidad: 4,
    habitaciones: 2,
    banos: 1,
    camas: 3,
    plantas: 1,
    cochera: true,
    precio_alquiler: 90000,
    estado: 'disponible',
    descripcion: 'Departamento moderno y céntrico',
    imagen_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    imagenes: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
    pileta: false,
    pileta_climatizada: false,
    parrilla: true,
    grupo_electrogeno: false,
    toilette: false,
    lavadero: true,
    lavavajillas: true,
    aire_acondicionado: true,
    calefaccion: false,
    fogonero: false,
    wifi: true,
    metros_cubiertos: 85,
    metros_semicubiertos: 15,
    metros_lote: 0,
  },
  {
    id: 'demo-prop-3',
    nombre: 'Cabaña del Bosque',
    direccion: 'Camino Forestal 890, Costa del Este',
    referencia: 'Dentro del barrio cerrado',
    telefono_contacto: '541155559012',
    tipo: 'casa',
    capacidad: 8,
    habitaciones: 4,
    banos: 3,
    camas: 6,
    plantas: 2,
    cochera: true,
    precio_alquiler: 200000,
    estado: 'disponible',
    descripcion: 'Cabaña rústica con todas las comodidades',
    imagen_url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800',
    imagenes: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'],
    pileta: true,
    pileta_climatizada: true,
    parrilla: true,
    grupo_electrogeno: true,
    toilette: true,
    lavadero: true,
    lavavajillas: true,
    aire_acondicionado: true,
    calefaccion: true,
    fogonero: true,
    wifi: true,
    metros_cubiertos: 250,
    metros_semicubiertos: 80,
    metros_lote: 1200,
  },
]

export const demoInquilinos = [
  { id: 'demo-inq-1', nombre: 'María García', documento: '28456789', telefono: '11-5555-1234', email: 'maria@email.com', domicilio: 'Av. Corrientes 1234, CABA', acompanantes: [] },
  { id: 'demo-inq-2', nombre: 'Juan Pérez', documento: '32123456', telefono: '11-5555-5678', email: 'juan@email.com', domicilio: 'Calle Florida 567, CABA', acompanantes: [] },
  { id: 'demo-inq-3', nombre: 'Ana Rodríguez', documento: '35789012', telefono: '11-5555-9012', email: 'ana@email.com', domicilio: 'Av. Santa Fe 890, CABA', acompanantes: [] },
  { id: 'demo-inq-4', nombre: 'Carlos López', documento: '29345678', telefono: '11-5555-3456', email: 'carlos@email.com', domicilio: 'Calle Lavalle 123, CABA', acompanantes: [] },
]

const hoy = new Date()
const formatDate = (date: Date) => date.toISOString().split('T')[0]

// Fechas relativas a hoy
const hace7dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000)
const hace3dias = new Date(hoy.getTime() - 3 * 24 * 60 * 60 * 1000)
const en2dias = new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000)
const en5dias = new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000)
const en10dias = new Date(hoy.getTime() + 10 * 24 * 60 * 60 * 1000)
const en15dias = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000)
const en20dias = new Date(hoy.getTime() + 20 * 24 * 60 * 60 * 1000)
const en25dias = new Date(hoy.getTime() + 25 * 24 * 60 * 60 * 1000)

export const demoReservas = [
  {
    id: 'demo-res-1',
    propiedad_id: 'demo-prop-1',
    inquilino_id: 'demo-inq-1',
    fecha_inicio: formatDate(hace7dias),
    fecha_fin: formatDate(en2dias),
    horario_ingreso: '14:00',
    horario_salida: '10:00',
    cantidad_personas: 4,
    precio_noche: 150,
    monto_usd: 150,
    moneda: 'USD',
    deposito: 300,
    deposito_pesos: 300,
    sena: 450,
    forma_pago: 'transferencia',
    ropa_blanca: true,
    estado: 'confirmada',
    limpieza_final: 25000,
    monto_lavadero: 8000,
    kw_inicial: 1200,
    notas: 'Reserva de prueba',
    acompanantes: [],
    propiedades: demoPropiedades[0],
    inquilinos: demoInquilinos[0],
  },
  {
    id: 'demo-res-2',
    propiedad_id: 'demo-prop-2',
    inquilino_id: 'demo-inq-2',
    fecha_inicio: formatDate(en2dias),
    fecha_fin: formatDate(en10dias),
    horario_ingreso: '15:00',
    horario_salida: '10:00',
    cantidad_personas: 2,
    precio_noche: 120,
    monto_usd: 120,
    moneda: 'USD',
    deposito: 250,
    deposito_pesos: 250,
    sena: 480,
    forma_pago: 'efectivo',
    ropa_blanca: true,
    estado: 'confirmada',
    limpieza_final: 20000,
    monto_lavadero: 5000,
    kw_inicial: 850,
    notas: '',
    acompanantes: [],
    propiedades: demoPropiedades[1],
    inquilinos: demoInquilinos[1],
  },
  {
    id: 'demo-res-3',
    propiedad_id: 'demo-prop-3',
    inquilino_id: 'demo-inq-3',
    fecha_inicio: formatDate(en5dias),
    fecha_fin: formatDate(en15dias),
    horario_ingreso: '14:00',
    horario_salida: '10:00',
    cantidad_personas: 6,
    precio_noche: 200,
    monto_usd: 200,
    moneda: 'USD',
    deposito: 400,
    deposito_pesos: 400,
    sena: 0,
    forma_pago: 'transferencia',
    ropa_blanca: false,
    estado: 'pendiente',
    limpieza_final: 35000,
    monto_lavadero: 12000,
    kw_inicial: 2100,
    notas: 'Pendiente de confirmar seña',
    acompanantes: [],
    propiedades: demoPropiedades[2],
    inquilinos: demoInquilinos[2],
  },
  {
    id: 'demo-res-4',
    propiedad_id: 'demo-prop-1',
    inquilino_id: 'demo-inq-4',
    fecha_inicio: formatDate(en15dias),
    fecha_fin: formatDate(en25dias),
    horario_ingreso: '14:00',
    horario_salida: '10:00',
    cantidad_personas: 5,
    precio_noche: 150,
    monto_usd: 150,
    moneda: 'USD',
    deposito: 300,
    deposito_pesos: 300,
    sena: 0,
    forma_pago: 'mercadopago',
    ropa_blanca: true,
    estado: 'pendiente',
    limpieza_final: 25000,
    monto_lavadero: 8000,
    kw_inicial: 0,
    notas: '',
    acompanantes: [],
    propiedades: demoPropiedades[0],
    inquilinos: demoInquilinos[3],
  },
]

export const demoCobros = [
  {
    id: 'demo-cobro-1',
    reserva_id: 'demo-res-1',
    fecha: formatDate(hace7dias),
    aplicar_a: 'alquiler',
    concepto: 'seña',
    monto: 450,
    moneda: 'USD',
    medio_pago: 'transferencia',
    recibo_generado: true,
  },
  {
    id: 'demo-cobro-2',
    reserva_id: 'demo-res-1',
    fecha: formatDate(hace3dias),
    aplicar_a: 'alquiler',
    concepto: 'anticipo',
    monto: 600,
    moneda: 'USD',
    medio_pago: 'efectivo',
    recibo_generado: false,
  },
  {
    id: 'demo-cobro-3',
    reserva_id: 'demo-res-1',
    fecha: formatDate(hace3dias),
    aplicar_a: 'deposito',
    concepto: 'seña',
    monto: 300,
    moneda: 'USD',
    medio_pago: 'efectivo',
    recibo_generado: false,
  },
  {
    id: 'demo-cobro-4',
    reserva_id: 'demo-res-2',
    fecha: formatDate(hoy),
    aplicar_a: 'alquiler',
    concepto: 'seña',
    monto: 480,
    moneda: 'USD',
    medio_pago: 'transferencia',
    recibo_generado: true,
  },
]

export const demoGastos = [
  {
    id: 'demo-gasto-1',
    concepto: 'Expensa',
    descripcion: 'Expensa mensual Enero',
    monto: 85000,
    fecha: formatDate(hoy),
    fecha_vencimiento: formatDate(en5dias),
    pagado: false,
    tipo: 'expensa',
    propiedad_id: 'demo-prop-1',
    propiedades: demoPropiedades[0],
  },
  {
    id: 'demo-gasto-2',
    concepto: 'Expensa',
    descripcion: 'Expensa mensual Enero',
    monto: 62000,
    fecha: formatDate(hoy),
    fecha_vencimiento: formatDate(en5dias),
    pagado: false,
    tipo: 'expensa',
    propiedad_id: 'demo-prop-2',
    propiedades: demoPropiedades[1],
  },
  {
    id: 'demo-gasto-3',
    concepto: 'Mantenimiento',
    descripcion: 'Reparación aire acondicionado',
    monto: 45000,
    fecha: formatDate(hace7dias),
    fecha_vencimiento: formatDate(hace3dias),
    pagado: true,
    tipo: 'mantenimiento',
    propiedad_id: 'demo-prop-1',
    propiedades: demoPropiedades[0],
  },
  {
    id: 'demo-gasto-4',
    concepto: 'Servicio',
    descripcion: 'Servicio de limpieza profunda',
    monto: 35000,
    fecha: formatDate(hace3dias),
    fecha_vencimiento: formatDate(hoy),
    pagado: true,
    tipo: 'servicio',
    propiedad_id: 'demo-prop-3',
    propiedades: demoPropiedades[2],
  },
  {
    id: 'demo-gasto-5',
    concepto: 'Arreglos',
    descripcion: 'Cambio de canilla cocina',
    monto: 18000,
    fecha: formatDate(hoy),
    fecha_vencimiento: formatDate(en10dias),
    pagado: false,
    tipo: 'arreglo',
    propiedad_id: 'demo-prop-2',
    propiedades: demoPropiedades[1],
  },
]

export const demoLiquidaciones = [
  {
    id: 'demo-liq-1',
    reserva_id: 'demo-res-1',
    deposito_recibido: 300,
    kw_final: 1350,
    costo_kw: 150,
    consumo_energia: 0,
    roturas: 0,
    otros_descuentos: 0,
    cotizacion_dolar: 1200,
    notas: null,
    monto_devolver: 300,
    fecha_liquidacion: formatDate(hoy),
  },
]

// Estadísticas calculadas para el dashboard demo
export const getDemoStats = () => {
  const reservasActivas = demoReservas.filter(r => r.estado === 'confirmada' || r.estado === 'pendiente')
  const totalInquilinos = reservasActivas.reduce((acc, r) => acc + r.cantidad_personas, 0)
  const reservasPendientes = demoReservas.filter(r => r.estado === 'pendiente').length

  const gastosPagados = demoGastos.filter(g => g.pagado).reduce((acc, g) => acc + g.monto, 0)
  const gastosPendientes = demoGastos.filter(g => !g.pagado).reduce((acc, g) => acc + g.monto, 0)
  const expensasPendientes = demoGastos.filter(g => g.tipo === 'expensa' && !g.pagado).reduce((acc, g) => acc + g.monto, 0)

  const ingresosAlquiler = demoCobros.filter(c => c.aplicar_a === 'alquiler').reduce((acc, c) => acc + c.monto, 0)

  return {
    totalInquilinos,
    reservasPendientes,
    gastosPagados,
    gastosPendientes,
    expensasPendientes,
    ingresosAlquiler,
  }
}

// Helper para obtener reserva con relaciones
export const getDemoReservaById = (id: string) => {
  return demoReservas.find(r => r.id === id) || null
}

// Helper para obtener cobros de una reserva
export const getDemoCobrosByReservaId = (reservaId: string) => {
  return demoCobros.filter(c => c.reserva_id === reservaId)
}

// Helper para obtener liquidación de una reserva
export const getDemoLiquidacionByReservaId = (reservaId: string) => {
  return demoLiquidaciones.find(l => l.reserva_id === reservaId) || null
}
