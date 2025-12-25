Socket server deployment and Vercel setup

Summary
- The project runs a separate socket.io server (defined in `server.js`) on port 3001 by default.
- When deploying the frontend to Vercel, you must host the socket server separately and set `NEXT_PUBLIC_SOCKET_URL` in Vercel to point to it (wss/https recommended).

Steps to deploy the socket server (recommended: Render / Railway / Fly.io):
1. Push your repo to GitHub.
2. Create a new service on Render or Railway and connect your GitHub repo.
   - Build command: `npm ci && npm run build` (if you have a build step) or just `npm ci`.
   - Start command: `node server.js`.
   - Set environment variables on the host if needed (e.g., `ALLOWED_ORIGIN=https://your-frontend.vercel.app`).
3. After the service is live, copy its public URL (e.g., `https://my-socket.example`).
4. In your Vercel project settings, set the Environment Variable `NEXT_PUBLIC_SOCKET_URL` to that URL (include protocol). Redeploy the frontend.

Quick local test using ngrok (for debugging a deployed frontend connecting to your local socket server):
1. Run your local server: `node server.js` (it runs Next and socket.io locally).
2. Expose port 3001 via ngrok: `ngrok http 3001` and copy the https URL.
3. In Vercel (or your deployed frontend) set `NEXT_PUBLIC_SOCKET_URL` to the ngrok URL (e.g., `https://abcd1234.ngrok.io`) and redeploy.

CORS note
- `server.js` reads `ALLOWED_ORIGIN` (if set) and uses it for socket.io CORS. Set it to your Vercel app origin (e.g., `https://your-app.vercel.app`).

If you want, I can:
- Help prepare a Render/Railway deployment (generate service settings and env var suggestions).
- Add a small GitHub Actions workflow to build and deploy a Docker image to Docker Hub (optional).
