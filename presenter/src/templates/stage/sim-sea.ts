/*
 * Havsmasken för skala-p6.webp (haven, 10⁶ m): 160 × 90 celler, en bit per cell, rad för rad.
 * Gjord ur bilden (blått som dominerar och är mörkt nog; molnen räknas inte), så att båtarna bara
 * ligger där bilden visar hav. Bilden fyller 1600 × 900, så en cell är 10 × 10 bildpunkter i scenen.
 */
export const SEA_COLS = 160;
export const SEA_ROWS = 90;
const SEA = [
  "//5////////////////9//r/vv//n///////////////////8f+//+eD/////////////////P/z/////4f////////////////yf///////////////////",
  "/////////////////////////4n//////////////f/////////vAL////////3////5/////////+4AH/////////////H////////9yAB/////////////",
  "8/3///////zAAHP/////eH/////P/////////AAAAA/////4f//////////////EAAAAAH//z/z//////////////MAAAAAAB/5////////////////9QAAA",
  "AAAD/x3///////////////AAAAAAAACfN/z/////////////4AAAAAAAAD8////////////////YAAAAAAAADB///////////////jAAAAAAAAAMH///////",
  "///////+8AAAAAAAAAw///////3////////wAAAAAHAAHH///////////////8AAAAAA/gAO////////////////gAAAAAC/8A////////////////8AAAAA",
  "AG//////////7////////wAAAAAAef/////////////////+AAAAABBgf/////////////////4AAAAAADP/////////////////+AAAADgAG/+f////////",
  "///////wAAAAfgAd/+P//////////////+AAAAD+AAn/////////////////8AAAAPwABf35v///n//////////4AAAB/AAA/3D///+f/////////+AAAAD4",
  "AAB/OP//+P///v//////wAAAAPgAAD8b///h/J+P//////+AAAAB8AAAny/4Phj/GA///////4AAAAHgAAAAL7gf+P/+H//////4AAAAA8AAAAAseA/5//4/",
  "/////8gAAAAHwAAAAAB+8H//5///////gAAAAB8AAAAAAP8//3/n//////4AAAAAPwAAAABw/p/+HsP/////8AAAAAB/gAAAAD48//4+E//////wAAAAAH+A",
  "AAAAH73//34Pv////+AAAAAA/8AAACA//////h+/////gAAAAAD/wEAAAD//////P4T///+AAAAAAP/AAAAcP///H///x////4AAAAAA//AAAB7///GH///H",
  "////gAAAAAD/8AAAHn7/88P//+f////AAAAAAP/gAAH/RH//w///bP///4AAAAAA/+AB//8Wv//g///8////gAAAAAA/8AP/+8APh+B8/vj////AAAAAAB/8",
  "H//wz4AP4Dx9+P///4AAAAAAAn///9x/+AfgAAD8////wAAAAAAD//4Bwce8AGcAYHz////AAAAAyAf//ABAxv4wD4AAAP////gAAADAN//wAAh+z9gvwAAA",
  "////8AAAAMAPP8AADA4HyAfgBgD////AAAAAwA9/AAABjwP4B+AEAP///+AAMABAHv8EAPAIAZBEAAAA////wAB4AAA+/xwAeAYDgAAAAAD////gAPgAAH7/",
  "/wB8BoHBAAAAAA///+AB+AAAPP//ACECgYAAAAAAH///8Af4AAB9/w8AAQAAgAAGAAA////4D/wAAHn+DwABAAAAAAcAAH////wf/g8Acf4HAACAAAAAAABg",
  "f//////eDwBh/gcAAAAAAAAAIOAH/////48AAEv8AwAAAwAAAAAA4AP/////DwAA//wAAAAAAAAAAwAAA/////wPgAB//AAAAAAQAAADAAAD////+B/AAH/8",
  "AAAAAAAAAIBAAAP////4B8AA//4AAAAAAAAAjAAAB/////AP4AD//gAAAAAAAAGOAAAP////+AfwA///AAAAAAEAAAwAAB/////4JzAP//8AAAAAAAAAOAAA",
  "D/////gGMA///4AAAAAAAAAIAAAP////+AAwf///AAAAAAAAAAAAAAf////4ABn///8AAAAAAAAIAAAAA/////gAD////BgAAAAAAAAAAAAD////+AA////8",
  "GAAAAAAAAAAAAIH////8Fv///jgAAAAAAAAAAAAAgf////wd/P/4OAAAAAAAAAAAAAAA/////A/4v8A4AAAAAAAAAAAAAAD////+D3A/AAAAAAAAAAAAAAAA",
  "AH////wFwCAAAAAAAAAAAAAAAAAAf////gGAAAAAAAAAAAAAAAAAAAB////+AAAAAAAAAAAAAAAAAAAAAD////4AAAAAAAAAAAAAAAAAAAAAH///8AAAAAAA",
  "AAAAAAAAAAAAAAAD//AAAAAAAAAAAAAAAAAAAAAAAAP/8AAAAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAAAAH//AAAAAAAAAAAAAAAAAAAAAA",
].join("");

let bytes: Uint8Array | null = null;
function data(): Uint8Array {
  if (!bytes) {
    const raw = typeof atob === "function" ? atob(SEA) : Buffer.from(SEA, "base64").toString("binary");
    bytes = Uint8Array.from(raw, ch => ch.charCodeAt(0));
  }
  return bytes;
}

/** Om cellen (kolumn, rad) är hav. */
export function seaCell(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= SEA_COLS || row >= SEA_ROWS) return false;
  const i = row * SEA_COLS + col;
  return (data()[i >> 3] >> (7 - (i & 7)) & 1) === 1;
}

/** Om en punkt i scenen (1600 × 900) ligger på hav. */
export function isSea(x: number, y: number): boolean {
  return seaCell(Math.floor(x / 10), Math.floor(y / 10));
}
