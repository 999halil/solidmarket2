import { getSolidDataset, getPublicAccess, getAgentAccess, hasAccessibleAcl, setPublicResourceAccess, getContainedResourceUrlAll, getFileWithAcl, hasResourceAcl, createAcl, getFile, getResourceAcl, saveAclFor, setAgentResourceAccess, overwriteFile, AclDataset, createAclFromFallbackAcl, getFallbackAcl, getUrl, getSolidDatasetWithAcl, getResourceInfo } from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";
import {
  createContainerAt,
  getSourceUrl,
  getThingAll,
} from "@inrupt/solid-client";

import {
  
   
  universalAccess as access,
} from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";


/**
 * Set Access Control for a file.
 * @param session - User session
 * @param fileUrl - URL of the file
 * @param permission - "private" | "public" | "shared"
 * @param agentWebId
 */
export const setFilePermissions = async (
    session: Session,
    fileUrl: string,
    permission: "private" | "shared" | "public",
    agentWebId: string = session.info.webId!
) => {
    try {
        console.log(`🔍 Checking ACL for: ${fileUrl}`);
        const resourceWithAcl = await getFileWithAcl(fileUrl, { fetch: session.fetch });

        console.log("✅ Has Resource ACL:", hasResourceAcl(resourceWithAcl));
        console.log("✅ Has Accessible ACL:", hasAccessibleAcl(resourceWithAcl));

        let aclDataset: AclDataset | null = null;

        // ⚡ Create or retrieve ACL
        if (hasResourceAcl(resourceWithAcl)) {
            aclDataset = getResourceAcl(resourceWithAcl) as AclDataset;
        } else if (hasAccessibleAcl(resourceWithAcl)) {
            console.warn("⚠️ No Resource ACL found. Checking fallback ACL...");
            const fallbackAcl = getFallbackAcl(resourceWithAcl);
            if (fallbackAcl) {
                aclDataset = createAclFromFallbackAcl(resourceWithAcl as any) as AclDataset;
            } else {
                throw new Error(`⚠️ No fallback ACL available for resource: ${fileUrl}`);
            }
        } else {
            throw new Error(`⚠️ Cannot access ACL or fallback ACL for resource: ${fileUrl}`);
        }

        if (!aclDataset) {
            console.error("❌ Failed to retrieve or create ACL dataset.");
            return;
        }

        // 📝 Set permissions
        aclDataset = setAgentResourceAccess(aclDataset, agentWebId, {
            read: permission !== "private",
            write: false,
            append: false,
            control: false,
        }) as AclDataset;

        // 💾 Save ACL
        await saveAclFor(resourceWithAcl as any, aclDataset, { fetch: session.fetch });
        console.log(`✨ Permissions updated for ${fileUrl}`);
    } catch (error) {
        console.error("❌ Error setting file permissions:", error);
    }
};
export async function prepareMarketplaceInbox(session: Session) {
    if (!session.info.webId) {
        throw new Error("User is not logged in.");
    }

    const podBase = session.info.webId.replace("/profile/card#me", "/");
    const inboxUrl = `${podBase}inbox/marketplace/`;

    await ensureContainerExists(session, inboxUrl);

    await access.setPublicAccess(
        inboxUrl,
        {
            read: false,
            append: true,
            write: false,
            controlRead: false,
            controlWrite: false,
        },
        { fetch: session.fetch }
    );

    return inboxUrl;
}
export async function sendPurchaseRequest(
    session: Session,
    sellerWebId: string,
    fileUrl: string,
    buyerWebId: string,
    saleId: string
) {
    const sellerPod = sellerWebId.replace("/profile/card#me", "/");
    const inboxUrl = `${sellerPod}inbox/marketplace/`;

    const timestamp = Date.now();

    const notification = {
        type: "PurchaseRequest",
        saleId,
        fileUrl,
        buyerWebId,
        timestamp
    };

    const response = await session.fetch(inboxUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Slug": `purchase-${timestamp}.json`
        },
        body: JSON.stringify(notification)
    });

    if (!response.ok) {
        throw new Error(`Failed to send purchase request: ${response.status}`);
    }

    return response.headers.get("Location");
}


export async function setAppFullAccess(session: Session, fileUrl: string) {
  const appOrigin = "http://localhost:3000"; // or your deployed domain

  try {
    await access.setAgentAccess(
      fileUrl,
      appOrigin,
      {
        read: true,
        write: true,
        append: true,
      },
      { fetch: session.fetch }
    );
    console.log(`✅ App granted full access to ${fileUrl}`);
  } catch (err) {
    console.error(`❌ Failed to grant app full access: ${err}`);
  }
}
export async function ensureContainerExists(session: Session, containerUrl: string) {
  try {
    // Try to load the folder — will throw if 404
    await getSolidDataset(containerUrl, { fetch: session.fetch });
    console.log(`[✔] Folder already exists: ${containerUrl}`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      try {
        await createContainerAt(containerUrl, { fetch: session.fetch });
        console.log(`[+] Created folder: ${containerUrl}`);
      } catch (createErr: any) {
        if (createErr.statusCode === 409) {
          // Folder was created by another request or just became visible — ignore
          console.warn(`[~] Folder was already created (409): ${containerUrl}`);
        } else {
          console.error(`[✘] Failed to create folder: ${containerUrl}`, createErr);
          throw createErr;
        }
      }
    } else {
      console.error(`[✘] Unexpected error checking folder: ${containerUrl}`, error);
      throw error;
    }
  }
}
/**
 * Logs the ACL information of a given file URL.
 * @param session - The authenticated Solid session.
 * @param fileUrl - The URL of the file to inspect.
 */
export const logFileAcl = async (session: Session, fileUrl: string) => {
    try {
        const fileWithAcl = await getFileWithAcl(fileUrl, { fetch: session.fetch });

        console.log(`Checking ACL for: ${fileUrl}`);
        console.log(`Has Resource ACL: ${hasResourceAcl(fileWithAcl)}`);
        console.log(`Has Accessible ACL: ${hasAccessibleAcl(fileWithAcl)}`);

        if (hasAccessibleAcl(fileWithAcl)) {
            const aclDataset = getResourceAcl(fileWithAcl);
            console.log("ACL Dataset:", aclDataset);
        } else {
            console.log("❌ No accessible ACL found for this file.");
        }
    } catch (error) {
        console.error("⚠️ Error fetching ACL:", error);
    }
};


export async function grantBuyerReadAccess(
  session: Session,
  fileUrl: string,
  buyerWebId: string
) {
  try {
    const result = await access.setAgentAccess(
      fileUrl,
      buyerWebId,
      { read: true }, // buyer gets read-only
      { fetch: session.fetch }
    );
    console.log("buyer webid is =", buyerWebId);    
    console.log("seller webid is =", session.info.webId);


    console.log(`🔐 Buyer read access granted for: ${fileUrl}`, result);
    return result;
  } catch (err) {
    console.error("❌ Failed to grant buyer read access:", err);
    throw err; 
  }
}

/*

export async function grantBuyerReadAccess(session:Session, fileUrl:string, buyerWebId:string) {
  try {
    console.log("Granting access for:", fileUrl);

    // 1) Fetch file metadata (NOT the file itself)
    const fileInfo = await getResourceInfo(fileUrl, { fetch: session.fetch });

    if (!fileInfo.internal_resourceInfo.aclUrl) {
      throw new Error("❌ This server does not expose ACL URL for the resource.");
    }

    const aclUrl = fileInfo.internal_resourceInfo.aclUrl;
    console.log("Found ACL URL:", aclUrl);

    // 2) Load the ACL document directly
    const datasetWithAcl = await getSolidDatasetWithAcl(fileUrl, {
      fetch: session.fetch,
    });

    let resourceAcl;

    if (hasResourceAcl(datasetWithAcl)) {
      resourceAcl = getResourceAcl(datasetWithAcl);

    } else if (hasAccessibleAcl(datasetWithAcl)) {
      const fallback = getFallbackAcl(datasetWithAcl);
      resourceAcl = fallback
        ? createAclFromFallbackAcl(datasetWithAcl as any)
        : createAcl(datasetWithAcl);

    } else {
      throw new Error("❌ Cannot access ACL for resource.");
    }

    // 3) Modify ACL
    resourceAcl = setAgentResourceAccess(
      resourceAcl,
      buyerWebId,
      { read: true, append: false, write: false, control: false }
    );

    // 4) Save ACL back
    await saveAclFor(datasetWithAcl, resourceAcl, { fetch: session.fetch });

    console.log(`✔ Successfully granted read access to ${buyerWebId}`);

  } catch (err) {
    console.error("❌ Error granting access:", err);
  }  try {
    const datasetWithAcl = await getSolidDatasetWithAcl(fileUrl, {
      fetch: session.fetch
    });

    let resourceAcl: AclDataset;

    if (hasResourceAcl(datasetWithAcl)) {
      // Has its own ACL
      resourceAcl = getResourceAcl(datasetWithAcl);

    } else if (hasAccessibleAcl(datasetWithAcl)) {
      const fallback = getFallbackAcl(datasetWithAcl);

      if (fallback) {
        // 🔥 Cast is required — typings are broken otherwise
        resourceAcl = createAclFromFallbackAcl(
          datasetWithAcl as any        );
      } else {
        // No fallback at all → create empty ACL
        resourceAcl = createAcl(datasetWithAcl as any);
      }

    } else {
      throw new Error("❌ Cannot read or create ACL for resource.");
    }

    // Add buyer permissions
    resourceAcl = setAgentResourceAccess(
      resourceAcl as any,
      buyerWebId,
      { read: true, append: false, write: false, control: false }
    );

    // Save back
    await saveAclFor(datasetWithAcl as any, resourceAcl as any, {
      fetch: session.fetch
    });

    console.log(`✔ Successfully granted read access to ${buyerWebId}`);

  } catch (err) {
    console.error("❌ Error granting access:", err);
  }
}
  */
export async function setFilePermissionsACP(session: Session, fileUrl: string) {
  try {
    const result = await access.setAgentAccess(fileUrl, session.info.webId!, {
      read: true,
      append: true,
      write: true,
      controlRead: true,
      controlWrite: true
    }, {
      fetch: session.fetch,
    });

    if (!result) {
      console.warn(`⚠️ No access info returned from setAgentAccess for ${fileUrl}`);
    } else {
      console.log(`✅ ACP permissions set for ${fileUrl}`, result);
    }
  } catch (err) {
    console.error(`❌ Failed to set ACP permissions on ${fileUrl}`, err);
  }
  try {
    const result = await access.setAgentAccess(fileUrl, "http://localhost:3000", {
      read: true,
      append: true,
      write: true,
      controlRead: true,
      controlWrite: true
    }, {
      fetch: session.fetch,
    });

    if (!result) {
      console.warn(`⚠️ No access info returned from setAgentAccess for ${fileUrl}`);
    } else {
      console.log(`✅ ACP permissions set for ${fileUrl}`, result);
    }

  } catch (err) {
    console.error(`❌ Failed to set ACP permissions on ${fileUrl}`, err);
  }/*
    try {
    const result = await access.setAgentAccess(fileUrl, "https://azer.solidcommunity.net/profile/card#me", {
      read: true,
      append: true,
      write: true,
      controlRead: true,
      controlWrite: true
    }, {
      fetch: session.fetch,
    });

    if (!result) {
      console.warn(`⚠️ No access info returned from setAgentAccess for ${fileUrl}`);
    } else {
      console.log(`✅ ACP permissions set for ${fileUrl}`, result);
    }

  } catch (err) {
    console.error(`❌ Failed to set ACP permissions on ${fileUrl}`, err);
  }*/

}



/**
 * Get the current access permissions of a file.
 * @param session - User session
 * @param fileUrl - URL of the file
 */
export const getFilePermissions = async (session: Session, fileUrl: string) => {
    if (!session.info.isLoggedIn) {
        throw new Error("User is not logged in.");
    }

    try {
        let resourceWithAcl = await getFileWithAcl(fileUrl, { fetch: session.fetch });

        if (!hasAccessibleAcl(resourceWithAcl)) {
            console.error("The resource does not have an accessible ACL.");
            return "No ACL found";
        }

        const publicAccess = await getPublicAccess(resourceWithAcl);
        const sharedUser = "https://solidcommunity.net/profile/card#me"; // Example WebID
        const sharedAccess = await getAgentAccess(resourceWithAcl, sharedUser);

        if (publicAccess?.read) {
            return "Public";
        } else if (sharedAccess?.read) {
            return "Shared";
        } else {
            return "Private";
        }
    } catch (error) {
        console.error("Error fetching file permissions:", error);
        return "Error";
    }
};



/**
 * Upload a file to the user's SoLiD Pod.
 */
export const uploadFileToPod = async (session: Session, file: File, podUrl: string) => {
    if (!session.info.isLoggedIn) {
        throw new Error("User is not logged in.");
    }

    const fileUrl = `${podUrl}resources/${file.name}`;

    try {
        await overwriteFile(fileUrl, file, {
            contentType: file.type,
            fetch: session.fetch
        });

        console.log(`File uploaded: ${fileUrl}`);
        return fileUrl;
    } catch (error) {
        console.error("Error uploading file:", error);
    }
};

/**
 * Fetch list of uploaded files.
 */
export const listFilesInPod = async (session: Session, podUrl: string) => {
    try {
        const dataset = await getSolidDataset(`${podUrl}resources/`, { fetch: session.fetch });
        return getContainedResourceUrlAll(dataset);
    } catch (error) {
        console.error("Error fetching files:", error);
        return [];
    }
};

/**
 * Download a file from the user's SoLiD Pod.
 */
export const downloadFileFromPod = async (session: Session, fileUrl: string) => {
    try {
        const file = await getFile(fileUrl, { fetch: session.fetch });
        return file;
    } catch (error) {
        console.error("Error downloading file:", error);
    }
};

export const computeSHA256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
};


export async function listInboxMessages(session: Session, inboxUrl: string) {
  try {
    if (!inboxUrl.endsWith("/")) inboxUrl += "/";

    console.log("📨 Listing inbox:", inboxUrl);

    // Load the container dataset
    const dataset = await getSolidDataset(inboxUrl, { fetch: session.fetch });

    // Get *all* contained resources (files + subfolders)
    const files = getContainedResourceUrlAll(dataset);

    return files;
  } catch (err) {
    console.error("❌ Failed to list inbox messages:", err);
    return [];
  }
}
export async function debugAccess(session: Session, fileUrl: string) {
  const acp = await access.getAgentAccess(fileUrl, session.info.webId!, { fetch: session.fetch });
  console.log("DEBUG: Seller's current ACP rights:", acp);
}


// Give full control to the file's owner (uploader)
export async function setFilePermissionsACL(session: Session, fileUrl: string) {
  try {
    console.log("🔧 Setting ACL permissions for:", fileUrl);

    // Fetch metadata + ACL pointers (not the PDF itself!)
    const datasetWithAcl = await getSolidDatasetWithAcl(fileUrl, {
      fetch: session.fetch
    });

    let resourceAcl: AclDataset;

    if (hasResourceAcl(datasetWithAcl)) {
      // File already has ACL
      resourceAcl = getResourceAcl(datasetWithAcl);

    } else if (hasAccessibleAcl(datasetWithAcl)) {
      // Inherit container ACL (if any)
      const fallback = getFallbackAcl(datasetWithAcl);

      // IMPORTANT: must pass fallback manually or TS breaks
      resourceAcl = fallback
        ? createAclFromFallbackAcl(datasetWithAcl as any)
        : createAcl(datasetWithAcl as any);

    } else {
      // No ACL anywhere → create a fresh ACL
      resourceAcl = createAcl(datasetWithAcl as any);
    }

    // Give full control to the uploader (seller)
    resourceAcl = setAgentResourceAccess(
      resourceAcl as any,
      session.info.webId!,
      {
        read: true,
        append: true,
        write: true,
        control: true
      }
    );

    // Save ACL back to POD
    await saveAclFor(datasetWithAcl as any, resourceAcl as any, {
      fetch: session.fetch
    });

    console.log("✅ ACL permissions applied successfully for:", fileUrl);
  } catch (err) {
    console.error("❌ Failed to apply ACL permissions:", err);
  }
}