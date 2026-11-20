/**
 * Semàfor circular dividit en parts iguals (una per mòdul), en sentit horari des de dalt, com a imatge PNG.
 * El PNG s'escriu a mà (paleta + blocs «stored» de zlib): funciona igual al navegador i a Node, sense dependències.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1, b = 0;
  for (const v of bytes) { a = (a + v) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

function chunk(type: string, data: Uint8Array): number[] {
  const body = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i);
  body.set(data, 4);
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}

function zlibStored(raw: Uint8Array): Uint8Array {
  const blocks: number[] = [0x78, 0x01];
  for (let i = 0; i < raw.length || i === 0; i += 65535) {
    const part = raw.subarray(i, Math.min(i + 65535, raw.length)), last = i + 65535 >= raw.length;
    blocks.push(last ? 1 : 0, part.length & 255, part.length >>> 8, ~part.length & 255, (~part.length >>> 8) & 255);
    for (const v of part) blocks.push(v);
    if (last) break;
  }
  blocks.push(...u32(adler32(raw)));
  return Uint8Array.from(blocks);
}

/** `colors`: hexadecimals RRGGBB, un per sector. Fons transparent i línies de separació blanques entre sectors. */
export function trafficPiePng(colors: string[], size = 180): Uint8Array {
  const palette: [number, number, number][] = [[255, 255, 255], [255, 255, 255], ...colors.map(c => [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)] as [number, number, number])];
  const n = Math.max(colors.length, 1), radius = size / 2 - 3, center = size / 2, step = (2 * Math.PI) / n, gap = n > 1 ? 0.045 : 0;
  const raw = new Uint8Array(size * (size + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0; // filtre «None»
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center, dy = y + 0.5 - center, r = Math.hypot(dx, dy);
      let index = 0; // 0 = transparent
      if (r <= radius) {
        const angle = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI); // 0 a dalt, creix en sentit horari
        const inSector = angle % step, edge = Math.min(inSector, step - inSector);
        index = r > 1 && edge < gap ? 1 : 2 + Math.min(Math.floor(angle / step), n - 1);
      } else if (r <= radius + 1.5) {
        index = 1; // vora fina blanca: suavitza visualment el contorn
      }
      raw[y * (size + 1) + 1 + x] = index;
    }
  }
  const plte = new Uint8Array(palette.length * 3);
  palette.forEach((c, i) => plte.set(c, i * 3));
  const trns = new Uint8Array(palette.length).fill(255); trns[0] = 0;
  const ihdr = Uint8Array.from([...u32(size), ...u32(size), 8, 3, 0, 0, 0]);
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    ...chunk("IHDR", ihdr), ...chunk("PLTE", plte), ...chunk("tRNS", trns), ...chunk("IDAT", zlibStored(raw)), ...chunk("IEND", new Uint8Array(0))
  ]);
}
