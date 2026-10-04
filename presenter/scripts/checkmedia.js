// HEAD-kollar varje lokal mediareferens i decket mot dev-servern.
const fs = require("fs");
const base = process.argv[3] || "http://localhost:53744";
const raw = fs.readFileSync(process.argv[2], "utf8");

const refs = new Set();
for (const m of raw.matchAll(/(?:src|background|image|video|imageA|imageB|videoSrc|audioSrc|podcastSrc|songSrc|gameSrc|sourceImage|infographicImage|bookSrc|personImage|bookImage)=["'](\/[^"']+)["']/g)) {
  refs.add(m[1]);
}
// Media inuti listrader: "- ... · /path/fil.mp4 · ..."
for (const m of raw.matchAll(/[·\s](\/[\w\-./]+\.(?:mp4|webm|mov|mp3|m4a|wav|png|jpg|jpeg|webp|gif|svg))/g)) {
  refs.add(m[1]);
}

(async () => {
  const bad = [];
  for (const r of [...refs].sort()) {
    try {
      const res = await fetch(base + encodeURI(r), { method: "HEAD" });
      if (!res.ok) bad.push(`${res.status}  ${r}`);
    } catch (e) {
      bad.push(`ERR   ${r}  ${e.message}`);
    }
  }
  console.log(`Kollade ${refs.size} lokala mediareferenser.`);
  if (bad.length) {
    console.log("TRASIGA:");
    bad.forEach((b) => console.log("  " + b));
  } else {
    console.log("Alla svarar 200.");
  }
})();
