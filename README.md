# Lobo Guara

Dashboard com tarefas, financeiro, simulação e previsão.

## Rodar local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## PWA

O projeto já está preparado como PWA:

- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Ícones: `public/icons/*`
- Página offline: `app/offline/page.tsx`

Em produção (Render + HTTPS), o navegador já permite instalar o app.

## Android APK (Capacitor)

### 1. Configure a URL do app hospedado

Use seu domínio do Render:

```bash
# PowerShell
$env:CAPACITOR_APP_URL="https://seu-app.onrender.com"
```

Você pode usar `.env.example` como referência.
Se você não definir essa variável, o padrão atual é `https://lobo-guara.onrender.com`.

### 2. Sincronize com Android

```bash
npm run cap:sync
```

### 3. Abra no Android Studio

```bash
npm run cap:open:android
```

No Android Studio, gere o APK em:
`Build > Build Bundle(s) / APK(s) > Build APK(s)`

## Scripts úteis

- `npm run lint`
- `npm run build`
- `npm run cap:add:android`
- `npm run cap:sync`
- `npm run cap:copy`
- `npm run cap:open:android`
