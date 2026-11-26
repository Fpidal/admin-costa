// Historial de versiones del panel. Con cada cambio que se sube se agrega una
// línea en la versión de arriba (o una versión nueva si es un cambio grande).
// La más nueva va primero; la página Versiones y el menú leen de acá.

export interface Version {
  version: string
  fecha: string // DD/MM/AAAA
  titulo: string
  cambios: string[]
}

export const VERSIONES: Version[] = [
  {
    version: '2.3', fecha: '26/11/2026', titulo: 'Huéspedes y resultado por año',
    cambios: [
      'Resumen pasa a llamarse Informes y va en el menú principal; el resultado del año se mudó de Temporada a Informes',
      'Informes: evolución por temporada con precio de lista, cobrado por noche, ocupación y total, y la variación contra la temporada anterior',
      'Informes: noches sin confirmar aparte (y la ocupación contándolas), temporada "en curso" con variación parcial, y precio cobrado mes por mes (dic, ene, feb)',
      'Balance del año: lo que entró en el año menos los gastos, desde 2026, con saldo inicial (lo que viene del año anterior) y saldo al 31/12',
      'Balance: siempre se puede ver el año que viene (arranca con el saldo de este) y lo que falta cobrar de las reservas confirmadas de cada año',
      'Informes: bloque Fuera de temporada por año, con cada reserva y el fin de semana largo en el que cayó',
      'Link para que el huésped cargue nombre, apellido, edad y DNI de sus acompañantes, y la lista para mandar al barrio',
      'Detalle de la reserva con noches × precio por noche y cada servicio (limpieza final, lavadero)',
      'Resultado por año calendario en Temporada, con columna de acumulado de todos los años',
      'Huéspedes: el historial de reservas de cada huésped ya no se rompe',
      'Sección Versiones para ver los cambios que se van haciendo',
      'Web pública: ahora sabe qué fechas están ocupadas (antes decía "Libre" siempre)',
      'Los acompañantes que carga el huésped por el link también se suman a su ficha de Huéspedes, para la próxima reserva',
    ],
  },
  {
    version: '2.2', fecha: '26/11/2026', titulo: 'Página pública nueva',
    cambios: [
      'Página pública con estilo revista: portada y propiedades en una pantalla, buscador de fechas, ficha completa, barrio, cómo llegar y cómo reservar',
      'La web, las ofertas de Temporada y Nueva reserva usan los precios de Precios alquileres',
      'Resultado del año en Temporada (cobrado menos gastos) con dólar del día',
      'PDFs (reserva, contrato, recibo, reporte) en verde esmeralda',
    ],
  },
  {
    version: '2.1', fecha: '26/11/2026', titulo: 'Precios alquileres y calendarios',
    cambios: [
      'Precios alquileres: calendario mensual por casa, tramos editables, fines de semana largos y precios por temporada',
      'Feriados con selector de año; Semana Santa y Carnaval como fines de semana largos',
      'Reservas: calendario de 3 meses (azul Golf, bordó Deportiva) y resumen en cuadro',
      'Reporte PDF que pregunta el período, con calendario y precio por noche',
      'Link propio por casa para compartir por WhatsApp con foto; compartir piezas gráficas',
      'Pagos: alquiler y depósito con conceptos propios',
    ],
  },
  {
    version: '2.0', fecha: '25/11/2026', titulo: 'Panel con estilo nuevo',
    cambios: [
      'Estilo nuevo: menú esmeralda, fondo arena y letra Manrope',
      'Temporada como inicio: ocupación, cobranza con avisos y ofertas de fechas libres',
      'Reservas en dos columnas (lista por fecha y detalle) con etapas y WhatsApp',
      'Resumen como tablero de estadísticas; calendario del mes con todas las casas',
      'Reporte PDF de reservas con cobrado y pendiente',
    ],
  },
  {
    version: '1.4', fecha: '01/10/2026', titulo: 'Info útil',
    cambios: ['Info útil con la paleta Costa y detalle de incidentes', 'PDF de incidentes'],
  },
  {
    version: '1.3', fecha: '24/09/2026', titulo: 'Contrato',
    cambios: [
      'Contrato con reserva del 50 %, depósito y electricidad incluida (150 kWh cada 7 días)',
      'Mis datos: datos del locador para el contrato',
      'Cotización en PDF para reservas pendientes; servicios separados del precio',
    ],
  },
  {
    version: '1.2', fecha: '04/09/2026', titulo: 'Cobros y contrato en una hoja',
    cambios: [
      'Cobros en dos bloques: alquiler y servicios, y depósito en garantía',
      'Contrato en una sola hoja A4',
      'Titular desde la misma reserva y aviso de incidentes',
      'Arreglo: las fechas se leían un día antes',
    ],
  },
  {
    version: '1.1', fecha: '25/08/2026', titulo: 'Piezas gráficas',
    cambios: ['Piezas gráficas con 70 % de fotos, íconos de amenities y ficha A4 de venta en PDF', 'Hasta 10 fotos por propiedad'],
  },
  {
    version: '1.0', fecha: '02/02/2026', titulo: 'Primera versión',
    cambios: ['Propiedades, reservas, huéspedes, gastos, cobros, info útil y página pública'],
  },
]

export const VERSION_ACTUAL = VERSIONES[0].version
