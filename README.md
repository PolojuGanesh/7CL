# 7CL Cricket Auction

Responsive React/Vite client with a Node.js, Express, MongoDB, and Socket.IO
backend. Auction bids are validated and persisted by the API; connected room
members receive auction state and timer updates in real time.

## Local setup (Windows PowerShell)

1. Install Node.js 20 or newer and start a MongoDB server, or create an Atlas
   database.
2. In `backend`, copy `.env.example` to `.env`. Set `MONGODB_URI` and generate
   a unique JWT secret with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

3. Install and start the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

4. In a second terminal, install and start the client:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Vite runs at `http://localhost:5173` and proxies `/api` and `/socket.io` to
   `http://localhost:4000`.

5. To run the standalone player admin app, use a third terminal:

   ```powershell
   cd admin
   npm install
   npm run dev -- --port 5174
   ```

   Open `http://localhost:5174`. The admin app proxies `/api` to
   `http://localhost:4000` by default. Set `VITE_API_PROXY_TARGET` when the API
   runs at a different address, or set `VITE_API_BASE_URL` to the API origin
   when deploying the admin app separately.

Register two accounts, create a room from the dashboard, join using its invite
code, then start the auction as the host. Password recovery is available only
in development and returns a one-time token; no email service is used.
Production requires a strong JWT secret.

## Render deployment

Deploy the backend, frontend, and admin as separate Render services using:

- Backend: `https://sevencl-backend.onrender.com`
- Frontend: `https://sevencl-frontend.onrender.com`
- Admin: `https://sevencl-admin.onrender.com`

The frontend and admin default to the deployed backend URL. Set
`VITE_API_BASE_URL=https://sevencl-backend.onrender.com` in either service's
build environment to override that default. On the backend, set `CLIENT_ORIGIN`
to `https://sevencl-frontend.onrender.com,https://sevencl-admin.onrender.com`
to allow both deployed apps through CORS. Also configure the backend's
`MONGODB_URI`, a unique `JWT_SECRET`, and `NODE_ENV=production`.

Add auction players from the standalone admin app. It submits the complete
player profile, role, country code, base price, career statistics, and auction
availability to the API. The admin endpoint does not require sign-in; anyone
who can reach the admin app can add players. Do not expose it publicly unless
that is intended.

## Checks

```powershell
cd backend
npm test
npm audit

cd ..\frontend
npm run lint
npm run build
npm audit

cd ..\admin
npm run lint
npm run build
```
