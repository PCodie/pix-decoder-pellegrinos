# Pix Decoder • Pizzaria Pellegrinos

Projeto multiplataforma inicial: PWA para navegador e base Android via Capacitor. A leitura e o histórico foram pensados para uso local no dispositivo.

## Testar no navegador / desenvolver

- Node.js 20 ou superior
- npm

```bash
npm install
npm run dev
npm test
```

A câmera exige contexto seguro (HTTPS ou localhost). O build web/PWA:

```bash
npm run build
npm run preview
```

## Gerar APK pelo GitHub Actions (alternativa sem computador)

Este projeto contém `.github/workflows/build-android.yml`, que compila um APK debug na nuvem do GitHub Actions.

1. Crie um repositório no GitHub usando o navegador do Android (privado é uma opção).
2. Descompacte o arquivo do projeto no celular.
3. Envie para a raiz do repositório todos os arquivos e pastas do projeto, inclusive a pasta oculta `.github/workflows` e seus arquivos. Não envie apenas o ZIP.
4. Abra a aba **Actions** no repositório. Se a execução automática após push não iniciar, selecione **Build Pix Decoder APK** e use **Run workflow**.
5. Aguarde a execução terminar. Se estiver verde/success, abra a execução e baixe o artefato **pix-decoder-apk-debug**.
6. Descompacte o artefato e instale `app-debug.apk`. Se necessário, autorize a instalação pelo navegador/gerenciador de arquivos nas configurações do Android.

O fluxo instala dependências, executa testes, gera o build web, cria a plataforma Android, sincroniza Capacitor e monta APK debug. O primeiro build pode falhar se uma dependência, configuração ou compatibilidade precisar de ajuste. APK debug é para teste, não é assinado para publicação na Play Store.

## Recursos e limitações

- Leitura por câmera e imagem via ZXing Browser.
- Parsing EMV Pix: recebedor, cidade, valor, TXID e CRC16/CCITT-FALSE, conforme campos presentes.
- Histórico de até 30 leituras em `localStorage`, somente no dispositivo/browser; não sincroniza entre aparelhos. Limpar dados do app/browser pode apagar o histórico.
- A leitura do QR não comprova liquidação de pagamento.
- CRC válido confirma integridade estrutural do payload, não autenticidade do recebedor nem pagamento realizado.
- QR Pix dinâmico pode requerer consulta ao provedor; esta versão identifica o padrão de URL, mas não consulta o servidor.
- Testes automatizados usam payloads sintéticos. Teste QRs reais de diferentes bancos e carteiras antes de uso operacional.
- Ainda não há APK pré-compilado nem build PWA confirmado.
