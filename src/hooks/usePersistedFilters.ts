"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface UsePersistedFiltersOptions<T> {
  key: string
  defaultFilters: T
}

export function usePersistedFilters<T extends Record<string, any>>({ key, defaultFilters }: UsePersistedFiltersOptions<T>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initializedRef = useRef(false)
  
  // Initialize state from URL first, then localStorage, then defaults
  const [filters, setFilters] = useState<T>(() => {
    // 1. Check if URL has any of our filter keys
    const hasUrlParams = Object.keys(defaultFilters).some(k => searchParams.has(k))
    
    if (hasUrlParams) {
      // Build filters from URL
      const urlFilters: any = {}
      Object.keys(defaultFilters).forEach(k => {
        const paramVal = searchParams.get(k)
        if (paramVal !== null) {
          // Rudimentary type conversion
          if (typeof defaultFilters[k] === 'boolean') {
            urlFilters[k] = paramVal === 'true'
          } else {
            urlFilters[k] = paramVal
          }
        } else {
          urlFilters[k] = defaultFilters[k]
        }
      })
      return urlFilters as T
    }

    // 2. Check LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(key)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (e) {
        console.error('Failed to parse stored filters', e)
      }
    }

    // 3. Fallback to defaults
    return defaultFilters
  })

  // Sync state to LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(filters))
    }
  }, [key, filters])

  // Sync state to URL (on mount and changes)
  const updateUrl = (newFilters: T) => {
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== false) {
        params.set(k, String(v))
      }
    })
    router.replace(`?${params.toString()}`)
  }

  // Initial URL sync if we loaded from storage but URL was empty
  useEffect(() => {
    if (!initializedRef.current) {
      const hasUrlParams = Object.keys(defaultFilters).some(k => searchParams.has(k))
      if (!hasUrlParams) {
        updateUrl(filters)
      }
      initializedRef.current = true
    }
  }, []) // Run once on mount

  const setFilter = (key: keyof T, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    updateUrl(newFilters)
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    updateUrl(defaultFilters)
  }

  return {
    filters,
    setFilter,
    resetFilters
  }
}
