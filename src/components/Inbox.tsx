import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { debugAccess, ensureContainerExists, listFilesInPod, listInboxMessages } from "../utils/solidHelper";
import { grantBuyerReadAccess } from "../utils/solidHelper";

interface PurchaseRequestMessage {
  url: string;
  fileUrl: string;
  buyerWebId: string;
  timestamp: number;
  type: string;
}

const Inbox = () => {
  const { session } = useAuth();

  const [messages, setMessages] = useState<PurchaseRequestMessage[]>([]);

  const podBase = session.info.webId?.replace("/profile/card#me", "/");
  const inboxUrl = `${podBase}inbox/marketplace/`;

  const loadMessages = async () => {
const files = await listInboxMessages(session, inboxUrl);
    const msgs: PurchaseRequestMessage[] = [];
    await ensureContainerExists(session,inboxUrl);

    for (const f of files) {
      const res = await session.fetch(f);
      const json = await res.json();

      msgs.push({
        url: f,
        fileUrl: json.fileUrl,
        buyerWebId: json.buyerWebId,
        timestamp: json.timestamp,
        type: json.type
      });
    }

    setMessages(msgs);
  };

  const approve = async (msg: PurchaseRequestMessage) => {
    await debugAccess(session, msg.fileUrl);

    await grantBuyerReadAccess(session, msg.fileUrl, msg.buyerWebId);
    alert("Access granted!");
  };

  useEffect(() => {
    loadMessages();
  }, []);

  return (
    <div>
      <h2>📨 Sale Requests</h2>

      {messages.length === 0 && <p>No pending requests.</p>}

      {messages.map((m, i) => (
        <div key={i} style={{ border: "1px solid #aaa", padding: 10, margin: 10 }}>
          <p><b>File:</b> {m.fileUrl}</p>
          <p><b>Buyer:</b> {m.buyerWebId}</p>
          <button onClick={() => approve(m)}>Approve Sale</button>
        </div>
      ))}
    </div>
  );
};

export default Inbox;
