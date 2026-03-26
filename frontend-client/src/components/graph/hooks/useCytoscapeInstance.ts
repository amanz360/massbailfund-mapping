import { useRef, useEffect } from 'react'
import type { Core, Layouts } from 'cytoscape'

/**
 * Manages Cytoscape instance lifecycle — provides refs for the cy core,
 * container element, and active layout. Handles cleanup on unmount.
 * The actual cy instance is created by useGraphNavigation.
 */
export function useCytoscapeInstance() {
  const cyRef = useRef<Core | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const layoutRef = useRef<Layouts | null>(null)

  useEffect(() => {
    return () => {
      layoutRef.current?.stop()
      layoutRef.current = null
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [])

  return { cyRef, containerRef, layoutRef }
}
