import { useRef, useEffect } from 'react'
import type { Core, Layouts } from 'cytoscape'

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
