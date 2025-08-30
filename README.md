# Realtime WebRTC (Next.js + OpenAI)

A minimal Next.js app that streams your microphone to OpenAI Realtime and plays back the assistant’s voice over WebRTC — no client secrets exposed.

## Features
- WebRTC mic input + remote audio playback
- Server‑minted ephemeral keys (short‑lived `ek_…`) via Next.js API
- Works with `gpt-4o-realtime-preview` and selectable voice (default: `verse`)

## Quick Start

Prereqs
- Node.js 22.12+ (or 20.19+). This repo includes an `.nvmrc` — use `nvm use`.

Install
- `npm install`

Configure
- Copy `.env.local.example` to `.env.local`
- Set `OPENAI_API_KEY=sk-...` (your server key). Do NOT expose this in client code.

Run
- `npm run dev`
- Open http://localhost:3000
- Allow microphone access and click “Connect”

Build (production)
- `npm run build && npm start`

## How It Works
- Client: `app/page.tsx` creates an `RTCPeerConnection`, gathers ICE, and POSTs the SDP `offer` to the Realtime endpoint with `Accept: application/sdp` and `OpenAI-Beta: realtime=v1`. The returned SDP `answer` is applied as the remote description, enabling bi‑directional audio.
- Server: `pages/api/realtime/ephemeral.ts` mints a short‑lived ephemeral key by calling `POST https://api.openai.com/v1/realtime/sessions` with your `OPENAI_API_KEY` and returns `{ ephemeralKey: ek_... }` to the client.

## Configuration
- Model: `gpt-4o-realtime-preview`
- Voice: `verse`
- You can change these in `pages/api/realtime/ephemeral.ts` (when minting) or adjust the client request in `app/page.tsx`.

## Troubleshooting
- SDP parse error (Expect line: `v=`): The server likely returned JSON (an error) instead of SDP.
  - Ensure your server key is valid and present in `.env.local`.
  - Ephemeral keys expire quickly — click Connect soon after the page loads.
  - Check DevTools → Network for the request to `https://api.openai.com/v1/realtime?...`; if response is JSON, copy it to diagnose.
  - Ensure your account/org has access to the model and Realtime beta.
- Mic permissions: Use http://localhost or HTTPS; allow microphone access.
- Port conflict: Next defaults to 3000. Use `npm run dev -- -p 3001` if needed.
- Corporate proxies/VPNs may block WebRTC STUN/TURN.

## Security Notes
- Never commit `sk-...` server keys. `.gitignore` already ignores `.env.local`.
- Ephemeral `ek-...` keys are short‑lived and safe to send to the browser; always fetch a fresh one from the server.

## Project Layout
- `app/` — Next.js App Router UI (client WebRTC)
- `pages/api/realtime/ephemeral.ts` — API route to mint ephemeral keys
- `.env.local.example` — env template

---

If this helps, a star is appreciated! 🚀

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sudhamabhatia/realtime-webrtc&env=OPENAI_API_KEY&envDescription=Your%20OpenAI%20API%20Key%20(sk-...)&project-name=realtime-webrtc&repository-name=realtime-webrtc)

- Click the button to clone and deploy from this repo in your Vercel account.
- During deployment, set `OPENAI_API_KEY` in Project → Settings → Environment Variables.
- Vercel auto-detects Next.js (`next build`/`next start`). `.nvmrc` and `engines` request Node 22 for consistency.
