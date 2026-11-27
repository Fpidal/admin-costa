'use client'

// Permisos del usuario logueado, para que cada pantalla muestre solo lo habilitado
import { createContext, useContext } from 'react'
import type { Acceso } from './permisos'

export const AccesoContext = createContext<Acceso>({ esAdmin: false, permisos: [] })
export const useAcceso = () => useContext(AccesoContext)
