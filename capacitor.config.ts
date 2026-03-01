import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = { appId: "com.scriptureunlocked.app", appName: "Scripture Unlocked", webDir: "out", server: { androidScheme: "https" }, plugins: { SplashScreen: { launchShowDuration: 2000, backgroundColor: "#14142E", showSpinner: false }, StatusBar: { style: "DARK", backgroundColor: "#14142E" } } };
export default config;
