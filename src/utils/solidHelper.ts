import { getSolidDataset, getPublicAccess, getAgentAccess, hasAccessibleAcl, setPublicResourceAccess, getContainedResourceUrlAll, getFileWithAcl, hasResourceAcl, createAcl, getFile, getResourceAcl, saveAclFor, setAgentResourceAccess, overwriteFile, AclDataset, createAclFromFallbackAcl, getFallbackAcl } from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";
import {
  createContainerAt,
  getSourceUrl,
  getThingAll,
} from "@inrupt/solid-client";

import {
  
   
  universalAccess as access,
} from "@inrupt/solid-client";


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

    console.log(`🔐 Buyer read access granted for: ${fileUrl}`, result);
    return result;
  } catch (err) {
    console.error("❌ Failed to grant buyer read access:", err);
    throw err;
  }
}
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
  }
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
