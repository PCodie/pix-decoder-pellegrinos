import test from 'node:test';
import assert from 'node:assert/strict';
import { crc16Ccitt, decodePix, parseTLV } from '../src/pix.js';

const field = (id, value) => id + String(value.length).padStart(2, '0') + value;
function makePayload({ dynamic = false } = {}) {
  const merchant = field('00', 'br.gov.bcb.pix') + field(dynamic ? '25' : '01', dynamic ? 'https://pix.example/cob/123' : 'chave-pix-exemplo');
  const additional = field('05', 'TX123');
  const body = field('00', '01') + field('01', dynamic ? '12' : '11') + field('26', merchant) +
    field('52', '0000') + field('53', '986') + field('54', '12.34') + field('58', 'BR') +
    field('59', 'PELLEGRINOS') + field('60', 'RIBEIRAO') + field('62', additional) + '6304';
  return body + crc16Ccitt(body);
}

test('CRC16/CCITT-FALSE padrão', () => {
  assert.equal(crc16Ccitt('123456789'), '29B1');
});

test('decodifica QR Pix estático e extrai campos', () => {
  const result = decodePix(makePayload());
  assert.equal(result.crcValid, true);
  assert.equal(result.receiver, 'PELLEGRINOS');
  assert.equal(result.city, 'RIBEIRAO');
  assert.equal(result.amount, 12.34);
  assert.equal(result.txid, 'TX123');
  assert.equal(result.type, 'Pix com chave / estático');
});

test('identifica Pix dinâmico pelo campo URL', () => {
  const result = decodePix(makePayload({ dynamic: true }));
  assert.equal(result.crcValid, true);
  assert.equal(result.type, 'Pix dinâmico');
});

test('marca CRC divergente sem ocultar os dados decodificados', () => {
  const valid = makePayload();
  const last = valid.at(-1);
  const corrupted = valid.slice(0, -1) + (last === '0' ? '1' : '0');
  const result = decodePix(corrupted);
  assert.equal(result.crcValid, false);
});

test('rejeita payload que não seja EMV Pix', () => {
  assert.throws(() => decodePix('texto qualquer'), /não começa com/);
});

test('rejeita estrutura TLV truncada', () => {
  assert.throws(() => parseTLV('0005abc'), /Tamanho de campo/);
});
