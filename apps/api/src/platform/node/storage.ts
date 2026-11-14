import { type Storage, s3Storage } from "@openmers/core"
import { type Env, EnvError } from "../env"
import { type LocalStorage, localStorage } from "./localStorage"

/**
 * Picks the storage driver at startup (12-medya): `local` disk by default, `s3` for AWS S3 and
 * S3-compatible services (R2 over its S3 API, MinIO, Spaces, Backblaze). The local driver is
 * returned separately so the app can serve its signed links.
 */
export function storageFromEnv(env: Env): { storage: Storage; local?: LocalStorage } {
  if (env.OPENMERS_STORAGE === "local") {
    const local = localStorage({
      dir: env.OPENMERS_STORAGE_DIR,
      baseUrl: env.OPENMERS_MEDIA_URL ?? `http://localhost:${env.PORT}`,
      secret: env.OPENMERS_AUTH_SECRET,
    })
    return { storage: local, local }
  }
  const need = (name: keyof Env) => {
    const value = env[name]
    if (typeof value !== "string" || value === "") {
      throw new EnvError(`${name} is required when OPENMERS_STORAGE=s3`)
    }
    return value
  }
  return {
    storage: s3Storage({
      endpoint: need("OPENMERS_S3_ENDPOINT"),
      region: env.OPENMERS_S3_REGION,
      bucket: need("OPENMERS_S3_BUCKET"),
      accessKeyId: need("OPENMERS_S3_ACCESS_KEY_ID"),
      secretAccessKey: need("OPENMERS_S3_SECRET_ACCESS_KEY"),
      pathStyle: env.OPENMERS_S3_PATH_STYLE === "true",
      publicBaseUrl: need("OPENMERS_MEDIA_URL"),
    }),
  }
}
