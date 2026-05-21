import { createSign, createVerify } from 'node:crypto';

const ED25519_PUBLIC_KEY = Buffer.from(
  '302a300506032b6570032100cbf2db8706ef08b34ebb75c62c45a374e0fc47cf36d4ce203102596af1d84e6b',
  'hex'
);

export function signChallenge(challenge) {
  const privateKeyPem = process.env.ED25519_PRIVATE_KEY;
  if (!privateKeyPem) throw new Error('ED25519_PRIVATE_KEY not configured');

  const sign = createSign('ed25519');
  sign.update(Buffer.from(challenge, 'utf-8'));
  sign.end();

  const privateKey = Buffer.from(privateKeyPem, 'hex');
  const signature = sign.sign({ key: privateKey, format: 'der', type: 'pkcs8' });
  return signature.toString('hex');
}

export function verifyChallenge(challenge, signatureHex) {
  const verify = createVerify('ed25519');
  verify.update(Buffer.from(challenge, 'utf-8'));
  verify.end();
  return verify.verify(
    { key: ED25519_PUBLIC_KEY, format: 'der', type: 'spki' },
    Buffer.from(signatureHex, 'hex')
  );
}
