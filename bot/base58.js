import { createHash } from 'node:crypto';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = 58n;

export function addressToHex(base58Address) {
  const decoded = decode58(base58Address);
  if (decoded.length < 4) throw new Error('Invalid address');
  const payload = decoded.subarray(0, -4);
  const checksum = decoded.subarray(-4);
  const hash = createHash('sha256').update(createHash('sha256').update(payload).digest()).digest();
  if (!checksum.equals(hash.subarray(0, 4))) throw new Error('Checksum mismatch');
  return payload.toString('hex').toLowerCase();
}

function decode58(str) {
  if (str.length === 0) return Buffer.alloc(0);
  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const idx = ALPHABET.indexOf(str[i]);
    if (idx === -1) throw new Error(`Invalid char: ${str[i]}`);
    num = num * BASE + BigInt(idx);
  }
  const hex = num.toString(16).padStart(1, '0');
  const buf = Buffer.from(hex.length % 2 ? `0${hex}` : hex, 'hex');
  let leading = 0;
  while (leading < str.length && str[leading] === '1') leading++;
  return Buffer.concat([Buffer.alloc(leading), buf]);
}
