const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

app.get("/", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: "Missing ?url param" });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-zygote",
                "--single-process",
                "--disable-gpu"
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0 Safari/537.36"
        );
        await page.setExtraHTTPHeaders({
            "Accept": "application/json"
        });

        await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

        // Wait for JSON response and parse it
        let body = await page.content();
        // Extract text from <pre> if present (for raw JSON APIs)
        let match = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
        let jsonText = match ? match[1] : body;

        // Clean HTML if not JSON
        if (jsonText.trim().startsWith("{") && jsonText.trim().endsWith("}")) {
            res.type("application/json").send(jsonText);
        } else {
            res.status(500).send("Target did not return JSON. HTML response:\n" + body.slice(0, 400));
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Cloudflare Bypass Proxy Running on " + PORT));
