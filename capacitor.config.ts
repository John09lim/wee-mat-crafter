import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "online.weelmatgenerator.app",
  appName: "WeeLMat Generator",
  webDir: "dist",
  server: {
    url: "https://weelmatgenerator.com",
    cleartext: false,
    allowNavigation: ["weelmatgenerator.com", "*.supabase.co"],
  },
  android: {
    backgroundColor: "#f6f0e7",
    allowMixedContent: false,
  },
};

export default config;
