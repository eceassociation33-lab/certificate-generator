import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import { google } from "googleapis";
import session from "express-session";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Session for OAuth
  app.use(session({
    secret: "kairo-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: 'lax' }
  }));

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/google/callback`
  );

  // Google Drive Auth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent"
    });
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);
      (req.session as any).tokens = tokens;
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send("Auth failed");
    }
  });

  app.get("/api/drive/status", (req, res) => {
    const tokens = (req.session as any).tokens;
    res.json({ connected: !!tokens });
  });

  app.post("/api/drive/upload", async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) return res.status(401).json({ error: "Not connected to Drive" });

    const { name, content, kairoId } = req.body;
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    try {
      // Check if folder exists or create one
      let folderId = (req.session as any).folderId;
      if (!folderId) {
        const folderResponse = await drive.files.create({
          requestBody: {
            name: "Kairo Certificates",
            mimeType: "application/vnd.google-apps.folder",
          },
          fields: "id",
        });
        folderId = folderResponse.data.id;
        (req.session as any).folderId = folderId;
      }

      const buffer = Buffer.from(content.split(",")[1], "base64");
      const fileMetadata = {
        name: `${kairoId}_Certificate.png`,
        parents: [folderId],
      };
      const media = {
        mimeType: "image/png",
        body: Readable.from(buffer),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, webContentLink",
      });

      // Make file readable by anyone with link (for the download feature)
      await drive.permissions.create({
        fileId: file.data.id!,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      res.json({ success: true, fileId: file.data.id, viewLink: file.data.webViewLink });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public download route
  app.get("/download/:kairoId", async (req, res) => {
    const { kairoId } = req.params;
    const tokens = (req.session as any).tokens;
    if (!tokens) return res.status(500).send("Drive not configured by admin");

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    try {
      const response = await drive.files.list({
        q: `name = '${kairoId}_Certificate.png' and trashed = false`,
        fields: "files(id, webContentLink)",
      });

      if (response.data.files && response.data.files.length > 0) {
        res.redirect(response.data.files[0].webContentLink!);
      } else {
        res.status(404).send("Certificate not found for this ID");
      }
    } catch (error) {
      res.status(500).send("Error searching for certificate");
    }
  });

  // API routes
  app.post("/api/send-email", async (req, res) => {
    const { 
      to, 
      subject, 
      body, 
      attachment, 
      senderEmail, 
      senderPassword, 
      senderHost, 
      senderPort, 
      senderSecure 
    } = req.body;

    if (!to || !attachment || !senderEmail || !senderPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: senderHost || "smtp.gmail.com",
        port: senderPort || 465,
        secure: senderSecure !== undefined ? senderSecure : true,
        auth: {
          user: senderEmail,
          pass: senderPassword,
        },
      });

      // Send mail
      const info = await transporter.sendMail({
        from: `"Kairo E-Certificate Studio" <${senderEmail}>`,
        to,
        subject: subject || "Your E-Certificate",
        text: body || "Please find your e-certificate attached.",
        attachments: [
          {
            filename: 'certificate.png',
            content: attachment.split("base64,")[1],
            encoding: 'base64'
          }
        ]
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Email sending error:", error);
      let errorMessage = error.message || "Failed to send email";
      
      if (errorMessage.includes("535") || errorMessage.includes("Invalid login")) {
        errorMessage = "Authentication failed. If using Gmail, you MUST use an 'App Password', not your regular password. Ensure 2-Step Verification is enabled.";
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
