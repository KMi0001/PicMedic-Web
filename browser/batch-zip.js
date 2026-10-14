/* Small, uncompressed ZIP writer. JPEG/PNG/WebP are already compressed.
 * Keep original Blobs as parts rather than concatenate the entire archive.
 * UTF-8 names, CRC32 and classic ZIP headers; callers cap output below 4 GiB. */
(function () {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  async function crc32(blob, cancelled) {
    let crc = 0xffffffff;
    for (let offset = 0; offset < blob.size; offset += 1024 * 1024) {
      if (cancelled()) throw new Error('cancelled');
      const bytes = new Uint8Array(await blob.slice(offset, offset + 1024 * 1024).arrayBuffer());
      for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  window.createPhotoZip = async function (entries, cancelled = () => false) {
    const parts = [], central = [];
    let offset = 0, centralSize = 0;
    for (const entry of entries) {
      if (cancelled()) throw new Error('cancelled');
      const name = new TextEncoder().encode(entry.name);
      const crc = await crc32(entry.blob, cancelled);
      const local = new Uint8Array(30 + name.length);
      const l = new DataView(local.buffer);
      l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true);
      l.setUint16(6, 0x800, true); l.setUint16(12, 33, true); // 1980-01-01
      l.setUint32(14, crc, true); l.setUint32(18, entry.blob.size, true);
      l.setUint32(22, entry.blob.size, true); l.setUint16(26, name.length, true);
      local.set(name, 30);
      const directory = new Uint8Array(46 + name.length);
      const d = new DataView(directory.buffer);
      d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true);
      d.setUint16(6, 20, true); d.setUint16(8, 0x800, true);
      d.setUint16(14, 33, true); d.setUint32(16, crc, true);
      d.setUint32(20, entry.blob.size, true); d.setUint32(24, entry.blob.size, true);
      d.setUint16(28, name.length, true); d.setUint32(42, offset, true);
      directory.set(name, 46);
      parts.push(local, entry.blob); central.push(directory);
      offset += local.length + entry.blob.size; centralSize += directory.length;
    }
    if (cancelled()) throw new Error('cancelled');
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true);
    e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true);
    e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  };
})();
