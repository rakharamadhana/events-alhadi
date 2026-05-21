// =============================================================================
// server.js — Custom Node.js Entry Point for cPanel / Phusion Passenger
// =============================================================================
// cPanel shared hosting uses Phusion Passenger to manage Node.js apps.
// Passenger expects a root-level `server.js` (or `app.js`) that creates an
// HTTP server and binds to the port exposed by the `PORT` environment variable.
//
// This file boots Next.js programmatically instead of using `next start`,
// ensuring compatibility with Passenger's reverse-proxy model.
// =============================================================================

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

// Passenger sets PORT; fall back to 3000 for local development.
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }).listen(port, hostname, () => {
    console.log(
      `> Events Al-Hadi server ready on http://${hostname}:${port} [${dev ? "development" : "production"}]`
    );
  });
});
