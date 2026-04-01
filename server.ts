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

  // Vite middleware for frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
      root: path.resolve(__dirname, 'frontend')
    });
    app.use(vite.middlewares);

    // Fallback for SPA routing in dev mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs = await import('fs');
        const templatePath = path.resolve(__dirname, 'frontend/index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        
        template = await vite.transformIndexHtml(url, template);
        
        // Inject environment variables into the template AFTER Vite transformation
        const envScript = `
          <script>
            window.process = window.process || {};
            window.process.env = window.process.env || {};
            window.process.env.API_KEY = ${JSON.stringify(process.env.API_KEY || '')};
            window.process.env.GEMINI_API_KEY = ${JSON.stringify(process.env.GEMINI_API_KEY || '')};
            window.__GEMINI_API_KEY__ = ${JSON.stringify(process.env.GEMINI_API_KEY || process.env.API_KEY || '')};
          </script>
        `;
        template = template.replace('</head>', `${envScript}</head>`);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
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
          window.process = window.process || {};
          window.process.env = window.process.env || {};
          window.process.env.API_KEY = ${JSON.stringify(process.env.API_KEY || '')};
          window.process.env.GEMINI_API_KEY = ${JSON.stringify(process.env.GEMINI_API_KEY || '')};
          window.__GEMINI_API_KEY__ = ${JSON.stringify(process.env.GEMINI_API_KEY || process.env.API_KEY || '')};
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
