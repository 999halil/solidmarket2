import React, { useState } from "react";
import { getFile, overwriteFile } from "@inrupt/solid-client";
import { useAuth } from "../context/AuthContext";

const ACPTestBasic = () => {
  const { session } = useAuth();
  const [fileUrl, setFileUrl] = useState("");
  const [result, setResult] = useState("");

  // -------------------------
  // 1) Test READ permission 
  // -------------------------
  const testRead = async () => {
    try {
      const file = await getFile(fileUrl, { fetch: session.fetch });
      setResult("✔ READ OK — Your app (User A) can read this file.");
    } catch (e) {
      console.error(e);
      setResult("❌ READ FAILED — Your app cannot read this file.");
    }
  };

  // -------------------------
  // 2) Test WRITE permission (append an 'A')
  // -------------------------
  const testWrite = async () => {
    try {
      // Fetch current content
      const file = await getFile(fileUrl, { fetch: session.fetch });
      const text = await file.text();

      // Append "A"
      const modified = text + "A";
      const blob = new Blob([modified], { type: file.type || "text/plain" });

      // Overwrite file
      await overwriteFile(fileUrl, blob, {
        fetch: session.fetch,
        contentType: file.type || "text/plain",
      });

      setResult("✔ WRITE OK — Successfully appended 'A' to the file!");
    } catch (e) {
      console.error(e);
      setResult("❌ WRITE FAILED — Your app could NOT modify this file.");
    }
  };

  return (
    <div style={{ padding: 20, border: "1px solid #ccc", marginTop: 20 }}>
      <h3>🔐 Basic Solid Permission Test (READ + WRITE)</h3>

      <input
        style={{ width: "100%", marginBottom: 10 }}
        placeholder="Enter a file URL from User A's Pod"
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
      />

      <button onClick={testRead} style={{ marginRight: 10 }}>Test READ</button>
      <button onClick={testWrite}>Test WRITE (append 'A')</button>

      <p style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>{result}</p>
    </div>
  );
};

export default ACPTestBasic;