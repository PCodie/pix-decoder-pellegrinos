import { BrowserMultiFormatReader } from '@zxing/browser';
import { decodePix } from './pix.js';
import './style.css';

const HISTORY_KEY = 'pellegrinos-pix-decoder-history-v1';
const MAX_HISTORY = 30;
const reader = new BrowserMultiFormatReader();
let cameraControls = null;
let currentPayload = '';

document.querySelector('#app').innerHTML = `
  <header class="hero">
    <div class="brandmark">▦</div>
    <div class="eyebrow">PIZZARIA PELLEGRINOS</div>
    <h1>Pix Decoder</h1>
    <p>Leia, confira e copie códigos Pix.</p>
  </header>
  <main>
    <section class="actions">
      <button id="pick-image" class="secondary">▧ <span>Enviar imagem</span></button>
      <button id="start-camera" class="secondary">▣ <span>Abrir câmera</span></button>
      <input id="image-file" type="file" accept="image/*" hidden>
    </section>
    <section id="camera-panel" class="panel" hidden>
      <video id="camera-video" muted playsinline></video>
      <button id="stop-camera" class="secondary full">Fechar câmera</button>
    </section>
    <section class="panel">
      <h2>Colar código Pix</h2>
      <textarea id="manual-code" rows="3" placeholder="Cole aqui o Pix Copia e Cola"></textarea>
      <button id="decode-manual" class="primary full">Decodificar código</button>
    </section>
    <p id="status" class="status" role="status">Escolha uma imagem, use a câmera ou cole um código Pix.</p>
    <section id="result" class="panel" hidden>
      <div class="result-heading"><h2>Dados identificados</h2><span id="crc-pill" class="pill">—</span></div>
      <dl class="details">
        <div><dt>Recebedor informado no QR</dt><dd id="receiver">—</dd></div>
        <div class="two">
          <div><dt>Valor</dt><dd id="amount">—</dd></div>
          <div><dt>Moeda</dt><dd id="currency">—</dd></div>
        </div>
        <div><dt>Cidade</dt><dd id="city">—</dd></div>
        <div><dt>TXID</dt><dd id="txid">—</dd></div>
        <div><dt>Modalidade identificada</dt><dd id="type">—</dd></div>
      </dl>
      <h3>Pix Copia e Cola</h3>
      <pre id="payload" class="payload"></pre>
      <button id="copy-code" class="primary full">Copiar código Pix</button>
      <p id="copy-status" class="small status"></p>
    </section>
    <section class="panel">
      <div class="history-heading">
        <div><h2>Histórico local</h2><p class="small muted">Últimas 30 leituras neste dispositivo</p></div>
        <strong id="history-count">0/30</strong>
      </div>
      <div id="history-list" class="history-list"><p class="muted small">Nenhuma leitura salva.</p></div>
      <button id="clear-history" class="secondary full">Limpar histórico</button>
    </section>
    <p class="disclaimer">🔒 Os dados ficam neste dispositivo. A leitura de um QR Code não confirma que o pagamento foi realizado. Confira sempre o extrato ou a confirmação bancária.</p>
  </main>
  <footer>Pix Decoder • Versão 0.2</footer>
`;

const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message; };

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
    renderHistory();
  } catch {
    status('Não foi possível salvar o histórico. Verifique o espaço disponível no aparelho.');
  }
}
function money(amount) {
  return amount === null ? 'Valor não informado' : amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function showDecoded(payload, save = true) {
  const data = decodePix(payload);
  currentPayload = data.payload;
  $('receiver').textContent = data.receiver;
  $('amount').textContent = money(data.amount);
  $('currency').textContent = data.currency;
  $('city').textContent = data.city;
  $('txid').textContent = data.txid;
  $('type').textContent = data.type;
  $('payload').textContent = data.payload;
  $('crc-pill').textContent = data.crcValid ? 'CRC válido' : 'CRC divergente';
  $('crc-pill').className = `pill ${data.crcValid ? 'ok' : 'warning'}`;
  $('result').hidden = false;
  $('copy-status').textContent = '';
  status(data.crcValid
    ? 'QR decodificado. A estrutura CRC16 confere.'
    : 'QR decodificado, mas o CRC16 não confere. Confira o código antes de utilizá-lo.');
  if (save) {
    const history = loadHistory();
    history.unshift({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      date: new Date().toLocaleString('pt-BR'),
      receiver: data.receiver,
      amount: data.amount,
      txid: data.txid,
      type: data.type,
      crcValid: data.crcValid,
      payload: data.payload
    });
    saveHistory(history);
  }
  stopCamera();
}
function renderHistory() {
  const history = loadHistory();
  $('history-count').textContent = `${history.length}/${MAX_HISTORY}`;
  const list = $('history-list');
  list.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'muted small';
    empty.textContent = 'Nenhuma leitura salva.';
    list.append(empty);
    return;
  }
  history.forEach(item => {
    const card = document.createElement('article');
    card.className = 'history-item';
    const heading = document.createElement('div');
    heading.className = 'history-top';
    const title = document.createElement('strong');
    title.textContent = item.receiver;
    const amount = document.createElement('span');
    amount.textContent = money(item.amount);
    heading.append(title, amount);
    const date = document.createElement('p');
    date.className = 'small muted';
    date.textContent = `${item.date} • ${item.crcValid ? 'CRC válido' : 'CRC divergente'}`;
    const buttons = document.createElement('div');
    buttons.className = 'history-buttons';
    const view = document.createElement('button');
    view.className = 'tiny-button';
    view.textContent = 'Abrir';
    view.addEventListener('click', () => {
      try { showDecoded(item.payload, false); window.scrollTo({ top: $('result').offsetTop, behavior: 'smooth' }); }
      catch (error) { status(error.message); }
    });
    const copy = document.createElement('button');
    copy.className = 'tiny-button';
    copy.textContent = 'Copiar';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(item.payload); status('Código do histórico copiado.'); }
      catch { status('Não foi possível copiar. Abra o item e selecione o código.'); }
    });
    const remove = document.createElement('button');
    remove.className = 'tiny-button danger';
    remove.textContent = 'Excluir';
    remove.addEventListener('click', () => saveHistory(loadHistory().filter(row => row.id !== item.id)));
    buttons.append(view, copy, remove);
    card.append(heading, date, buttons);
    list.append(card);
  });
}
function stopCamera() {
  if (cameraControls) { cameraControls.stop(); cameraControls = null; }
  $('camera-panel').hidden = true;
}
async function scanImage(file) {
  if (!file) return;
  try {
    const url = URL.createObjectURL(file);
    try {
      const result = await reader.decodeFromImageUrl(url);
      showDecoded(result.getText());
    } finally { URL.revokeObjectURL(url); }
  } catch (error) {
    status(`Não foi possível ler a imagem: ${error.message || 'tente uma imagem mais nítida.'}`);
  }
}

$('pick-image').addEventListener('click', () => $('image-file').click());
$('image-file').addEventListener('change', event => scanImage(event.target.files?.[0]));
$('decode-manual').addEventListener('click', () => {
  try { showDecoded($('manual-code').value); }
  catch (error) { status(error.message); }
});
$('start-camera').addEventListener('click', async () => {
  try {
    $('camera-panel').hidden = false;
    cameraControls = await reader.decodeFromVideoDevice(
      undefined,
      $('camera-video'),
      (result, error, controls) => {
        if (result) {
          try { showDecoded(result.getText()); }
          catch (decodeError) { status(decodeError.message); }
        }
      }
    );
  } catch (error) {
    stopCamera();
    status(`Não foi possível abrir a câmera. Verifique a permissão e tente em HTTPS: ${error.message || ''}`);
  }
});
$('stop-camera').addEventListener('click', stopCamera);
$('copy-code').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(currentPayload); $('copy-status').textContent = 'Código copiado!'; }
  catch { $('copy-status').textContent = 'Cópia automática indisponível neste navegador.'; }
});
$('clear-history').addEventListener('click', () => {
  if (loadHistory().length && confirm('Apagar todas as leituras salvas neste dispositivo?')) saveHistory([]);
});
renderHistory();
