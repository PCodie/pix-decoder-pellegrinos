export function parseTLV(payload) {
  const fields = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) throw new Error('Código Pix incompleto.');
    const id = payload.slice(i, i + 2);
    const lenText = payload.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenText)) {
      throw new Error('Estrutura EMV inválida.');
    }
    const length = Number(lenText);
    if (i + 4 + length > payload.length) throw new Error('Tamanho de campo inválido.');
    fields.push({ id, value: payload.slice(i + 4, i + 4 + length) });
    i += 4 + length;
  }
  return fields;
}

export function getField(fields, id) {
  return fields.find(field => field.id === id)?.value ?? '';
}

export function crc16Ccitt(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function decodePix(raw) {
  const payload = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!payload.startsWith('000201')) throw new Error('O conteúdo não começa com um payload EMV Pix esperado.');

  const fields = parseTLV(payload);
  const crcField = fields.find(field => field.id === '63');
  if (!crcField || !payload.endsWith(`6304${crcField.value}`)) {
    throw new Error('Campo CRC16 ausente ou malformado.');
  }
  const crcExpected = crc16Ccitt(payload.slice(0, -4));
  const crcValid = crcExpected === crcField.value.toUpperCase();

  const currencyCode = getField(fields, '53');
  const amountRaw = getField(fields, '54');
  const amount = amountRaw && /^\d+(\.\d{1,2})?$/.test(amountRaw) ? Number(amountRaw) : null;
  const accountFields = fields.filter(field => Number(field.id) >= 26 && Number(field.id) <= 51);

  let pixAccount = null;
  for (const account of accountFields) {
    try {
      const nested = parseTLV(account.value);
      if (getField(nested, '00').toLowerCase() === 'br.gov.bcb.pix') {
        pixAccount = nested;
        break;
      }
    } catch { /* campo adicional que não seja uma conta Pix */ }
  }

  const additional = getField(fields, '62') ? parseTLV(getField(fields, '62')) : [];
  const gui = pixAccount ? getField(pixAccount, '00') : '';
  const dynamicUrl = pixAccount ? getField(pixAccount, '25') : '';

  return {
    payload,
    receiver: getField(fields, '59') || 'Não informado no QR',
    city: getField(fields, '60') || 'Não informada',
    amount,
    currencyCode,
    currency: currencyCode === '986' ? 'BRL (Real)' : (currencyCode || 'Não informada'),
    txid: getField(additional, '05') || 'Não informado',
    pixAccountFound: Boolean(gui),
    type: dynamicUrl ? 'Pix dinâmico' : (gui ? 'Pix com chave / estático' : 'Pix EMV; modalidade não identificada'),
    crcValid,
    crcExpected,
    crcReceived: crcField.value
  };
}
