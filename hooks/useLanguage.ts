'use client'

import { useState, useEffect, useCallback } from 'react'
import { translations, Language, TranslationKey } from '@/lib/translations'

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>('es')
  const [isLoaded, setIsLoaded] = useState(false)

  // Cargar idioma del localStorage al iniciar
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguageState(savedLang)
    } else {
      // Detectar idioma del navegador
      const browserLang = navigator.language.slice(0, 2)
      if (browserLang === 'en') {
        setLanguageState('en')
      }
    }
    setIsLoaded(true)
  }, [])

  // Cambiar idioma y guardar en localStorage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  // Función para obtener traducción
  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || key
  }, [language])

  // Toggle entre idiomas
  const toggleLanguage = useCallback(() => {
    const newLang = language === 'es' ? 'en' : 'es'
    setLanguage(newLang)
  }, [language, setLanguage])

  return {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isLoaded,
  }
}
