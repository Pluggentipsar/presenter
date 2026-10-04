/** Skapa Windows-genvägar till Presenter med appens egen ikon. */
import { app, nativeImage, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const presenterDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const main = path.join(presenterDir, "electron", "main.mjs");
const icon = path.join(presenterDir, "electron", "icon.ico");

// Windows-genvägar behöver ICO. Behåll den befintliga PNG-ikonens utseende
// och lägg in flera storlekar för skrivbord, Start-meny och skärmskalning.
function createWindowsIcon() {
  const source = nativeImage.createFromPath(path.join(presenterDir, "electron", "icon.png"));
  if (source.isEmpty()) throw new Error("Presenter-ikonen kunde inte läsas.");
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = sizes.map((size) => source.resize({ width: size, height: size, quality: "best" }).toPNG());
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  for (let i = 0; i < sizes.length; i++) {
    const entry = 6 + 16 * i;
    header[entry] = sizes[i] === 256 ? 0 : sizes[i];
    header[entry + 1] = header[entry];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[i].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[i].length;
  }
  fs.writeFileSync(icon, Buffer.concat([header, ...images]));
}

async function install() {
  if (process.platform !== "win32") throw new Error("Genvägarna är avsedda för Windows.");
  await app.whenReady();
  if (!fs.existsSync(main)) throw new Error("Hittar inte Presenter-appens startfil.");
  createWindowsIcon();
  const shortcuts = [
    path.join(app.getPath("desktop"), "Presenter.lnk"),
    path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "Presenter.lnk"),
  ];
  const details = {
    target: process.execPath,
    args: `"${main}"`,
    cwd: presenterDir,
    description: "Öppna Presenter och föreläsningsbiblioteket",
    icon,
    iconIndex: 0,
    appUserModelId: JSON.parse(fs.readFileSync(path.join(presenterDir, "electron", "identitet.json"), "utf8")).id,
  };

  // Kontrollera båda namnen innan något skrivs; ersätt aldrig en annan app.
  for (const shortcut of shortcuts) {
    if (!fs.existsSync(shortcut)) continue;
    const existing = shell.readShortcutLink(shortcut);
    if (existing.target.toLowerCase() !== details.target.toLowerCase() || existing.args !== details.args) {
      throw new Error(`En annan genväg finns redan: ${shortcut}`);
    }
  }
  if (process.argv.includes("--prepare-only")) {
    console.log(JSON.stringify({ shortcuts, ...details }, null, 2));
    return;
  }
  for (const shortcut of shortcuts) {
    fs.mkdirSync(path.dirname(shortcut), { recursive: true });
    if (!shell.writeShortcutLink(shortcut, fs.existsSync(shortcut) ? "update" : "create", details)) {
      throw new Error(`Kunde inte skapa genvägen: ${shortcut}`);
    }
    const saved = shell.readShortcutLink(shortcut);
    for (const key of ["target", "args", "cwd", "icon", "appUserModelId"]) {
      if (saved[key] !== details[key]) throw new Error(`Genvägens ${key} stämmer inte: ${shortcut}`);
    }
    console.log(`Klar: ${shortcut}`);
  }
}

install().then(() => app.quit()).catch((error) => {
  console.error(error.message);
  app.exit(1);
});
