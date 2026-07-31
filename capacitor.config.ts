import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tanaw.app",
  appName: "TANAW",
  webDir: "out",
  android: {
    allowMixedContent: true,
  },
};

export default config;
