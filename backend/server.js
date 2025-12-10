import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Session } from "@inrupt/solid-client-authn-node";
import { access } from "@inrupt/solid-client";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Store refresh tokens in memory for now (later use a DB)
const sellerStore = {};  // { sellerWebId: refreshToken }

// ----------------------------
// 1️⃣ Save seller refresh token
// ----------------------------
app.post("/register-seller", async (req, res) => {
  const { sellerWebId, refreshToken } = req.body;

  if (!sellerWebId || !refreshToken) {
    return res.status(400).json({ error: "Missing sellerWebId or refreshToken" });
  }

  sellerStore[sellerWebId] = refreshToken;

  console.log(`Stored refresh token for: ${sellerWebId}`);
  res.json({ ok: true });
});

// ----------------------------
// 2️⃣ Grant buyer access
// ----------------------------
app.post("/grant-access", async (req, res) => {
  const { sellerWebId, buyerWebId, fileUrl } = req.body;

  const refreshToken = sellerStore[sellerWebId];
  if (!refreshToken) {
    return res.status(400).json({ error: "Seller is not registered" });
  }

  // Login as seller using refresh token
  const session = new Session();
  await session.login({
    refreshToken,
    clientId: process.env.CLIENT_ID,
    oidcIssuer: process.env.OIDC_ISSUER,

    
  });

  try {
    await access.setAgentAccess(
      fileUrl,
      buyerWebId,
      { read: true },
      { fetch: session.fetch }
    );

    console.log(
      `Granted READ access to ${buyerWebId} for file: ${fileUrl} (as ${sellerWebId})`
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Grant access failed:", err);
    res.status(500).json({ error: "Failed to set access rights" });
  }
});

// ----------------------------
app.listen(4000, () => console.log("🚀 Backend running at http://localhost:4000"));
