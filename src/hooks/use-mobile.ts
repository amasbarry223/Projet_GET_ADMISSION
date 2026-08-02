import * as React from "react"

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function subscribeIsMobile(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  const onChange = () => onStoreChange()
  mql.addEventListener("change", onChange)
  window.addEventListener("resize", onChange)
  return () => {
    mql.removeEventListener("change", onChange)
    window.removeEventListener("resize", onChange)
  }
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribeIsMobile, getIsMobile, () => false)
}
