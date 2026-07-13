import { cors as CORS } from "hono/cors"

export type CorsOptions = {
  wildcardDomain: string
  fallbackHost: string
}

export const cors = ({ wildcardDomain, fallbackHost }: CorsOptions) => {
  const escapedDomain = wildcardDomain.replace(/\./g, "\\.")
  const allowedDomainRegex = new RegExp(
    `^https?:\\/\\/([^\\/]+\\.)?${escapedDomain}$`,
    "i"
  )

  return CORS({
    credentials: true,
    origin: (origin: string) => {
      return allowedDomainRegex.test(origin)
        ? origin
        : origin === fallbackHost
          ? origin
          : undefined
    }
  })
}
