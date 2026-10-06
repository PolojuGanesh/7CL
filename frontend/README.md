# 7CL frontend

Responsive React application built with Vite. The development server proxies API
and Socket.IO traffic to the Express backend at `http://localhost:4000`.

## Run locally

1. Install backend dependencies and configure MongoDB using
   [`../backend/.env.example`](../backend/.env.example). Set `MONGODB_URI` and a
   random `JWT_SECRET` with at least 32 characters.
2. Start MongoDB, then run `npm run dev` from `../backend`.
3. In this directory, run `npm install` and `npm run dev`.
4. Open the URL printed by Vite, normally `http://localhost:5173`.

Add player records at `/admin`; all player fields are entered in that form.
The page requires no sign-in, so anyone who can reach the app can submit
players. Do not expose it publicly unless that is intended.

The first account can create a room; another account must join before its host
can start the auction. Bids and auction settlements are broadcast through
Socket.IO. Password recovery is available only in development and uses a
one-time token; no email service is used.

For separate frontend and API origins, set `VITE_API_BASE_URL` and
`VITE_API_PROXY_TARGET` as appropriate and configure `CLIENT_ORIGIN` on the
backend.

## Checks

```sh
npm run lint
npm run build
```
