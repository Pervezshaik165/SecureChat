import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);
let viteReady = false;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// If Vite isn't ready in development, show a small holding page for non-API GET requests
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && !viteReady && req.method === 'GET' && !req.path.startsWith('/api')) {
    res.status(503).send(`
      <!doctype html>
      <html>
        <head><meta charset="utf-8"><title>Starting dev server</title></head>
        <body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#333;display:flex;align-items:center;justify-content:center;height:100vh;">
          <div style="text-align:center">
            <h2>Dev server is starting — please wait...</h2>
            <p style="color:#666">Vite is initializing. This should only take a few seconds.</p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  next();
});

(async () => {
  try {
    console.log('➡️ registerRoutes starting...');
    await registerRoutes(httpServer, app);
    console.log('✅ registerRoutes finished');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error('Express error middleware caught error:', err);
      // do not rethrow here to avoid crashing the whole process
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      console.log('➡️ running in production - serving static files');
      serveStatic(app);
      viteReady = true;
    } else {
      console.log('➡️ running in development - scheduling Vite setup (non-blocking)');
      // start Vite setup asynchronously so it doesn't block server.listen
      (async () => {
        try {
          const { setupVite } = await import("./vite");
          await setupVite(httpServer, app);
          viteReady = true;
          console.log('✅ Vite setup finished');
        } catch (e) {
          console.error('✗ Vite setup failed:', e instanceof Error ? e.message : e);
        }
      })();
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    const port = parseInt(process.env.PORT || "5000", 10);
    console.log(`➡️ about to listen on 0.0.0.0:${port}`);

    // Remove reusePort for cross-platform safety on Windows
    httpServer.on('error', (err) => {
      console.error('HTTP server error:', err);
    });

    httpServer.listen(port, '0.0.0.0', () => {
      log(`serving on port ${port}`);
    });
  } catch (err) {
    console.error('Fatal error during server startup:', err instanceof Error ? err.stack || err.message : err);
    process.exitCode = 1;
  }
})();

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err instanceof Error ? err.stack || err.message : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
