const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const tipus = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

const server = http.createServer((req, res) => {
  const fitxer = req.url === "/" ? "index.html" : req.url.slice(1);
  const ext = path.extname(fitxer);

  // solo permitimos los tipos conocidos (html, js, css)
  if (!tipus[ext]) {
    res.writeHead(404);
    return res.end("No trobat");
  }

  fs.readFile(path.join(__dirname, path.basename(fitxer)), (err, dades) => {
    if (err) {
      res.writeHead(404);
      return res.end("No trobat");
    }
    res.writeHead(200, { "Content-Type": tipus[ext] });
    res.end(dades);
  });
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (dades) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(dades.toString());
      }
    });
  });
});

server.listen(3011, () => console.log("Obre http://localhost:3011"));