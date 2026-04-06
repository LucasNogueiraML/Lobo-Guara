import type { CapacitorConfig } from "@capacitor/cli"

const remoteUrl = process.env.CAPACITOR_APP_URL?.trim() || "https://lobo-guara.onrender.com"

const config: CapacitorConfig = {
  appId: "com.loboguara.app",
  appName: "Lobo Guara",
  webDir: "capacitor-web",
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          cleartext: false,
          androidScheme: "https",
        },
      }
    : {}),
}

export default config
