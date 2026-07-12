import { rmSync } from "node:fs";
import { resolve } from "node:path";

// The website serves the APK from public/downloads. Exclude that binary from
// Capacitor's bundled web assets so an Android build never embeds an older APK.
rmSync(resolve("dist", "downloads", "weelmat-generator.apk"), { force: true });
