import { useRef, useEffect, MutableRefObject } from 'react'

/**
 * Hook to access and store references to drawer content elements.
 * 
 * @returns An object with functions to get and set drawer content refs
 */
export function useDrawerContentRef() {
  // Maintain a map of drawer IDs to their content element refs
  const drawerRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Function to set a drawer content ref
  const setDrawerRef = (drawerId: string, ref: HTMLDivElement | null) => {
    drawerRefs.current[drawerId] = ref
  }

  // Function to get a drawer content ref
  const getDrawerRef = (drawerId: string): HTMLDivElement | null => {
    return drawerRefs.current[drawerId] || null
  }

  return {
    drawerRefs: drawerRefs.current,
    setDrawerRef,
    getDrawerRef
  }
} 