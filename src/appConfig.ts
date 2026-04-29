export type AppEnvironment = string
export type DomainKey = string
export type CountryCode = string

export interface DomainConfig {
  key: DomainKey
  baseURL: string
}

export interface AppConfig {
  country: CountryCode
  environment: AppEnvironment
  domains: DomainConfig[]
  activeDomain: DomainKey
}
