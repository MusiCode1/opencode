import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import type { ServerConnection } from "@/context/server"

export function createSdkForServer({
  server,
  ...config
}: Omit<NonNullable<Parameters<typeof createOpencodeClient>[0]>, "baseUrl"> & {
  server: ServerConnection.HttpBase
}) {
  const auth = (() => {
    if (!server.password) return
    return {
      Authorization: `Basic ${btoa(`${server.username ?? "opencode"}:${server.password}`)}`,
    }
  })()

  const isCrossOrigin = (() => {
    try {
      return new URL(server.url).origin !== location.origin
    } catch {
      return false
    }
  })()

  const wrappedFetch: typeof fetch | undefined = isCrossOrigin
    ? (input, init) => fetch(input, { ...init, credentials: "include" })
    : undefined

  return createOpencodeClient({
    ...config,
    ...(wrappedFetch ? { fetch: wrappedFetch } : {}),
    headers: { ...config.headers, ...auth },
    baseUrl: server.url,
  })
}
