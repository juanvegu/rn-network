export type DomainKey = string
export type CountryCode = string

export interface DomainConfig {
  key: DomainKey
  baseURL: string
}

/**
 * Static description of the available domains and environment for the RN flow.
 * Mirrors `AppConfig` in `rn-network-contracts`. Immutable; `activeDomain` is
 * tracked separately on the Registry (native) and on the React context (JS)
 * so switching domains never requires rebuilding the whole config.
 */
export interface AppConfig {
  country: CountryCode
  environment: string
  domains: DomainConfig[]
}

/**
 * Validates a raw payload received from the native bridge and narrows it to AppConfig.
 * Returns null if any required field is missing or has the wrong shape.
 */
export function parseAppConfig(raw: unknown): AppConfig | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>

  if (typeof r.country !== 'string') return null
  if (typeof r.environment !== 'string') return null
  if (!Array.isArray(r.domains)) return null

  const domains: DomainConfig[] = []
  for (const d of r.domains) {
    if (typeof d !== 'object' || d === null) return null
    const dr = d as Record<string, unknown>
    if (typeof dr.key !== 'string' || typeof dr.baseURL !== 'string') return null
    domains.push({ key: dr.key, baseURL: dr.baseURL })
  }

  return { country: r.country, environment: r.environment, domains }
}
