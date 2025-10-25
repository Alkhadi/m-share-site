#!/usr/bin/env node
/**
 * One-shot Paraphrasing Setup Script for M Share
 * Author: A.M. Koroma
 * ----------------------------------------------
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const serverDir = path.join(root, "server");
const publicDir = path.join(root, "public");

console.log(`🚀 Setting up paraphrasing system in ${root}`);
fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

// === server/proxy file ===
const proxy = `import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 8080;

if (!OPENAI_KEY) console.warn("⚠️  Missing OPENAI_API_KEY in .env");

app.post("/api/paraphrase", async (req, res) => {
  const { text, region = "UK" } = req.body || {};
  if (!text) return res.status(400).json({ error: "Missing text" });
  const prompt = \`Paraphrase this text into fluent, natural \${region==="UK"?"British":"American"} English while preserving meaning:\\n\\n\${text}\`;

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${OPENAI_KEY}\`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        messages: [
          { role: "system", content: "You are a professional paraphrasing assistant producing original UK/US English rewrites." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await apiRes.json();
    res.json({ paraphrase: data?.choices?.[0]?.message?.content?.trim() || "" });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Server error contacting ChatGPT API" });
  }
});

app.listen(PORT, () => console.log("✅ Proxy running on http://localhost:" + PORT));`;
fs.writeFileSync(path.join(serverDir, "paraphrase-proxy.js"), proxy);

// === .env files ===
fs.writeFileSync(path.join(serverDir, ".env.example"), "OPENAI_API_KEY=sk-your-key-here\nPORT=8080\n");
if (!fs.existsSync(path.join(serverDir, ".env")))
  fs.writeFileSync(path.join(serverDir, ".env"), "OPENAI_API_KEY=\nPORT=8080\n");

// === frontend JS ===
const fe = `(() => {
  const $ = (s,c=document)=>c.querySelector(s);
  const el = {i:$("#rwInput"),b:$("#btnParaphrase"),c:$("#btnClear"),o:$("#outParaphrase")};
  async function go(){
    const t = el.i.value.trim();
    if(!t){el.o.textContent="Enter text.";return;}
    el.o.textContent="Processing…";
    try{
      const r=await fetch("/api/paraphrase",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t,region:"UK"})});
      const d=await r.json();
      el.o.textContent=d.paraphrase||d.error||"No result.";
    }catch(e){console.error(e);el.o.textContent="Error contacting server.";}
  }
  el.b?.addEventListener("click",go);
  el.c?.addEventListener("click",()=>{el.i.value="";el.o.textContent="";});
})();`;
fs.writeFileSync(path.join(publicDir, "rewrite-assistant-chatgpt.js"), fe);

// === demo HTML ===
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>M Share Paraphraser</title>
<style>body{font-family:system-ui;padding:2rem;max-width:720px;margin:auto;background:#fafafa}
textarea{width:100%;height:160px;font-size:1rem;padding:.5rem}
button{margin:.3rem;padding:.4rem .8rem;font-size:1rem}
pre{background:#fff;border:1px solid #ddd;padding:.5rem;min-height:100px;white-space:pre-wrap}</style>
</head><body>
<h2>M Share Paraphraser</h2>
<textarea id="rwInput" placeholder="Type or paste text…"></textarea><br/>
<button id="btnParaphrase">Paraphrase</button><button id="btnClear">Clear</button>
<pre id="outParaphrase"></pre>
<script src="rewrite-assistant-chatgpt.js" defer></script>
</body></html>`;
fs.writeFileSync(path.join(publicDir, "index.html"), html);

// === package.json ===
if (!fs.existsSync(path.join(root, "package.json"))) {
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "mshare-paraphraser",
    type: "module",
    scripts: { start: "node server/paraphrase-proxy.js" }
  }, null, 2));
}

// === install dependencies ===
console.log("📦 Installing dependencies...");
execSync("npm install express cors dotenv node-fetch", { stdio: "inherit" });

console.log("\\n✅ Setup complete!");
console.log("Next steps:");
console.log("1. Edit server/.env and add your OpenAI API key");
console.log("2. Run: cd server && node paraphrase-proxy.js");
console.log("3. Open http://localhost:8080\n");

