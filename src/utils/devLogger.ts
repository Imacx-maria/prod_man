// Minimal dev-only logger. No-ops in production builds.
export const debugLog = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export const debugWarn = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(...args)
  }
}

export const debugTrace = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.trace(...args)
  }
}
