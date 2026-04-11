import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const fs = await import('fs');
  const envCheck = `
GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}
API_KEY present: ${!!process.env.API_KEY}
NODE_ENV: ${process.env.NODE_ENV}
  `;
  fs.writeFileSync('env-check.txt', envCheck);

  console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
  console.log('API_KEY present:', !!process.env.API_KEY);

  // API routes
  app.get('/api/auth/callback', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Autentiserar SafeQMS...</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f7f6; color: #333; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #0066ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
            p { margin: 0; color: #666; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>Slutför inloggning</h2>
            <p>Vi skickar tillbaka dig till SafeQMS i Gemini Studio...</p>
          </div>
          <script>
            // Parse tokens from URL hash (#access_token=...&refresh_token=...)
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && window.opener) {
              console.log('Tokens found, sending to main window');
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS',
                session: {
                  access_token: accessToken,
                  refresh_token: refreshToken
                }
              }, '*');
              
              // Fallback via BroadcastChannel
              try {
                const bc = new BroadcastChannel('supabase-auth');
                bc.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS',
                  session: {
                    access_token: accessToken,
                    refresh_token: refreshToken
                  }
                });
              } catch (e) {}

              // Close after a short delay to ensure message is sent
              setTimeout(() => window.close(), 1000);
            } else if (!window.opener) {
              // If opened directly, redirect to home
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  // Vite middleware for frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, 'frontend')
    });

    app.use(vite.middlewares);
    
    // Fallback to index.html for SPA routing
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(__dirname, 'frontend/index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        
        template = await vite.transformIndexHtml(url, template);
        
        const envScript = `
          <script>
            window.__GEMINI_API_KEY__ = ${JSON.stringify(process.env.GEMINI_API_KEY || process.env.API_KEY || '')};
            console.log('AI API Key injected');
          </script>
        `;
        template = template.replace('</head>', `${envScript}</head>`);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'frontend/dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res) => {
      const fs = await import('fs');
      const templatePath = path.join(distPath, 'index.html');
      let template = fs.readFileSync(templatePath, 'utf-8');
      
      const envScript = `
        <script>
          window.__GEMINI_API_KEY__ = ${JSON.stringify(process.env.GEMINI_API_KEY || process.env.API_KEY || '')};
          console.log('AI API Key injected into window.__GEMINI_API_KEY__ (prod)');
        </script>
      `;
      template = template.replace('</head>', `${envScript}</head>`);
      res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
