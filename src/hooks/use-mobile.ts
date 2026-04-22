import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)")

    const getIsMobileViewport = () => {
      const shortEdge = Math.min(window.innerWidth, window.innerHeight)
      const narrowViewport = window.innerWidth < MOBILE_BREAKPOINT
      const handsetLandscape = coarsePointerQuery.matches && shortEdge < MOBILE_BREAKPOINT
      return narrowViewport || handsetLandscape
    }

    const onChange = () => {
      setIsMobile(getIsMobileViewport())
    }

    mql.addEventListener("change", onChange)
    coarsePointerQuery.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)
    setIsMobile(getIsMobileViewport())

    return () => {
      mql.removeEventListener("change", onChange)
      coarsePointerQuery.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
    }
  }, [])

  return !!isMobile
}
