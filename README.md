# SoLiD Marketplace

This repository contains the source code for the thesis project **“Blockchain and Solid: two peas in a pod, or sworn enemies?”**.

The project is a proof-of-concept decentralized marketplace where users can upload files to their own Solid Pod, publish file listings on a local Ethereum blockchain, and let buyers request access. The actual file remains stored in the seller's Solid Pod. The blockchain is used for marketplace coordination, file hash verification, price storage, payment locking, and sale status tracking. Solid is used for identity, storage, inbox notifications, and access control.

> This is a local development prototype for thesis evaluation. It is not intended as a production-ready marketplace and should not be used with real funds.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Main Features](#main-features)
4. [Prerequisites](#prerequisites)
5. [Accounts Needed Before Running](#accounts-needed-before-running)
6. [Installation](#installation)
7. [Running the Project Step by Step](#running-the-project-step-by-step)
8. [Terminal Setup: What Output Goes Where](#terminal-setup-what-output-goes-where)
9. [MetaMask Setup](#metamask-setup)
10. [Using the Application](#using-the-application)
11. [Typical Buyer and Seller Test Flow](#typical-buyer-and-seller-test-flow)
12. [Repository Structure](#repository-structure)
13. [Smart Contract Overview](#smart-contract-overview)
14. [Solid Pod and Inbox Overview](#solid-pod-and-inbox-overview)
15. [Troubleshooting](#troubleshooting)
16. [Known Limitations](#known-limitations)

---

## Project Overview

The application demonstrates how Solid and blockchain can be combined in a decentralized marketplace.

The core idea is:

1. A seller logs in with a Solid WebID.
2. The seller uploads a file to their own Solid Pod.
3. The seller creates a listing by storing the file URL, file hash, price, wallet address, and WebID on the blockchain.
4. A buyer logs in with their own Solid WebID.
5. The buyer purchases access through the smart contract.
6. The buyer's payment is locked in the smart contract while the sale is pending.
7. A purchase request is sent to the seller's Solid inbox.
8. The seller approves or rejects the sale.
9. If approved, the buyer receives read access to the Solid file and the seller receives the payment.
10. If rejected, the buyer is refunded.

This separates responsibilities clearly:

- **Solid** stores the actual file and enforces access rights.
- **Blockchain** stores verifiable listing metadata and handles payment state.
- **React frontend** connects the user interface, Solid session, MetaMask wallet, and smart contract calls.

---

## Architecture

The system consists of three main layers.

### 1. Frontend Layer

The frontend is built with **React** and **TypeScript**. It provides pages for:

- Solid login and logout.
- User profile display.
- File upload to a Solid Pod.
- Listing creation.
- Marketplace browsing.
- Buying access.
- Seller inbox approval.
- Blockchain listing inspection.
- File hash verification.

The frontend runs locally at:

```text
http://localhost:3000
```

### 2. Solid Layer

Solid is used for:

- Authentication through a WebID.
- Storing uploaded files in the user's Pod.
- Creating or reading the `resources/` container.
- Creating or reading the `inbox/marketplace/` container.
- Sending purchase request messages to the seller's inbox.
- Granting buyer read access after seller approval.

The project assumes a Solid Community Pod by default, using:

```text
https://solidcommunity.net
```

### 3. Blockchain Layer

The blockchain part uses:

- **Solidity** for the smart contract.
- **Hardhat** for the local blockchain and deployment.
- **ethers.js** for frontend contract interaction.
- **MetaMask** for signing transactions.

The smart contract stores marketplace listings and manages the sale lifecycle.

---

## Main Features

### Seller Features

- Log in with Solid.
- Upload a file to the seller's own Solid Pod.
- Automatically create a `resources/` folder if needed.
- Compute a SHA-256 hash of the uploaded file.
- Create a blockchain listing with:
  - file URL,
  - file hash,
  - price,
  - seller WebID,
  - seller wallet address.
- View active own listings.
- Delete listings from the marketplace.
- Receive purchase requests through the Solid inbox.
- Approve a sale by granting Solid read access and releasing payment.
- Reject a sale and refund the buyer.

### Buyer Features

- Log in with Solid.
- Browse marketplace listings from other users.
- Buy access through MetaMask.
- Send a purchase request to the seller's Solid inbox.
- Wait for seller approval before access is granted.

### Blockchain Explorer Features

- Load all blockchain listings.
- Check the stored price of a file.
- Verify whether a file hash matches the hash stored on-chain.

---

## Prerequisites

Before running the project, install the following:

### Required Software

1. **Git**
   - Needed to clone the repository.

2. **Node.js and npm**
   - Node.js 18 or newer is recommended.
   - npm is included with Node.js.

3. **MetaMask browser extension**
   - Needed to sign blockchain transactions.
   - The project uses a local Hardhat blockchain, so no real ETH is required.

4. **A modern browser**
   - Chrome, Edge, or Firefox are recommended.

5. **VS Code or another code editor**
   - Not strictly required, but useful when updating the deployed contract address.

### Check Installation

Run these commands in a terminal:

```bash
node -v
npm -v
git --version
```

If these commands return version numbers, the basic development tools are installed correctly.

---

## Accounts Needed Before Running

### 1. Solid Community Account

You need at least one Solid account before using the app.

Create an account at:

```text
https://solidcommunity.net
```

After registration, you will have a Solid WebID that looks similar to:

```text
https://yourname.solidcommunity.net/profile/card#me
```

For a complete buyer and seller test, it is recommended to create **two Solid accounts**:

- one account for the seller,
- one account for the buyer.

Using two separate browser profiles makes testing easier, because each browser profile can stay logged in with a different Solid account and a different MetaMask account.

### 2. MetaMask Account

MetaMask is needed to sign blockchain transactions. For local testing, you should import one or more Hardhat test accounts into MetaMask. These accounts are printed in the terminal when starting the local Hardhat blockchain.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/999halil/solidmarket2.git
cd solidmarket2
```

Install all dependencies:

```bash
npm install
```

Compile the smart contract:

```bash
npx hardhat compile
```

The project is now installed locally.

---

## Running the Project Step by Step

The project requires three terminals:

- **Terminal 1:** local Hardhat blockchain.
- **Terminal 2:** smart contract deployment.
- **Terminal 3:** React frontend.

Keep Terminal 1 and Terminal 3 open while using the application.

---

### Step 1: Start the Local Hardhat Blockchain

Open **Terminal 1** in the project folder and run:

```bash
npx hardhat node
```

This starts a local Ethereum blockchain at:

```text
http://127.0.0.1:8545
```

Hardhat will print several test accounts and private keys. You will need at least one of these private keys to import a funded local account into MetaMask.

Do **not** close this terminal. If you close it, the local blockchain stops. If you restart it, previous local transactions and deployed contracts are reset.

---

### Step 2: Deploy the Smart Contract

Open **Terminal 2** in the same project folder and run:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

The terminal should print output similar to:

```text
Marketplace deployed to: 0x1234567890abcdef1234567890abcdef12345678
```

Copy only the deployed contract address, for example:

```text
0x1234567890abcdef1234567890abcdef12345678
```

Then open:

```text
src/utils/blockchainHelper.ts
```

Find this line:

```ts
const CONTRACT_ADDRESS = "PASTE_DEPLOYED_ADDRESS_HERE";
```

or the existing hardcoded address:

```ts
const CONTRACT_ADDRESS = "0x...";
```

Replace it with the address printed by the deployment command:

```ts
const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
```

Save the file.

This step is important: the frontend can only communicate with the smart contract if `CONTRACT_ADDRESS` matches the address printed by the deploy script.

---

### Step 3: Start the React Frontend

Open **Terminal 3** in the project folder and run:

```bash
npm start
```

The application should open automatically in the browser. If it does not, open:

```text
http://localhost:3000
```

The React development server reloads automatically when code changes are saved.

---

## Terminal Setup: What Output Goes Where

This part is important because the project uses several terminals at the same time.

### Terminal 1: Hardhat Node

Command:

```bash
npx hardhat node
```

Purpose:

- Runs the local Ethereum blockchain.
- Prints local test accounts.
- Prints local private keys.
- Shows transaction logs when the app interacts with the blockchain.

Use this terminal output for:

- Importing a Hardhat account into MetaMask.
- Checking whether blockchain transactions are being received.

Keep this terminal open.

---

### Terminal 2: Contract Deployment

Command:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Purpose:

- Deploys `MarketplaceTwo` to the local Hardhat blockchain.
- Prints the deployed contract address.

Use this terminal output for:

- Copying the line after `Marketplace deployed to:`.
- Pasting that address into `src/utils/blockchainHelper.ts` as `CONTRACT_ADDRESS`.

After deployment, this terminal can be closed. You only need it again when redeploying the contract.

---

### Terminal 3: React Frontend

Command:

```bash
npm start
```

Purpose:

- Runs the React app at `http://localhost:3000`.
- Shows frontend build errors.
- Shows TypeScript or React warnings.

Use this terminal output for:

- Checking whether the frontend compiled successfully.
- Seeing frontend build errors.

Keep this terminal open while using the app.

---

### Browser Console

The browser console is also useful. Open it with:

```text
F12 → Console
```

Use it for:

- Solid authentication errors.
- Pod permission errors.
- MetaMask connection errors.
- Failed fetch requests.
- Debug messages from Solid access-control functions.

---

## MetaMask Setup

### Step 1: Add the Local Hardhat Network

Open MetaMask and add a custom network:

```text
Network name: Hardhat Localhost
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency symbol: ETH
```

Select this network before using the app.

### Step 2: Import a Hardhat Test Account

In Terminal 1, Hardhat prints accounts and private keys. Copy one private key and import it into MetaMask:

```text
MetaMask → Account menu → Import account → Paste private key
```

The imported account should have local test ETH. This is fake ETH from the local Hardhat network, not real cryptocurrency.

For testing with a buyer and seller, import two different Hardhat accounts and use one for each role.

---

## Using the Application

### Home Page

The home page is available at:

```text
http://localhost:3000
```

From here, the user can:

- log in with Solid,
- view profile information,
- upload files,
- create listings,
- view own active listings,
- navigate to marketplace listings,
- navigate to the inbox,
- navigate to blockchain data.

When logging in, use the Solid identity provider:

```text
https://solidcommunity.net
```

### Blockchain Explorer

The blockchain explorer is available through the app navigation and is used to:

- load blockchain listings,
- check stored prices,
- verify file hashes.

### Marketplace Listings

The marketplace listings page shows listings created by other users. A buyer can use this page to buy access to a file.

### Inbox

The inbox page shows sale requests received by the seller. The seller can approve or reject each request.

---

## Typical Buyer and Seller Test Flow

The easiest way to test the full application is with two Solid accounts and two MetaMask accounts.

---

### Seller Flow

1. Open the app at:

   ```text
   http://localhost:3000
   ```

2. Connect MetaMask to the local Hardhat network.

3. Select the seller wallet in MetaMask.

4. Log in with the seller's Solid account.

5. Upload a file.

6. Enter a price in ETH.

7. Click **Create Listing**.

8. Confirm the blockchain transaction in MetaMask.

9. The app computes the file hash and stores the listing metadata on-chain.

10. The seller's marketplace inbox is prepared at:

   ```text
   https://sellername.solidcommunity.net/inbox/marketplace/
   ```

---

### Buyer Flow

1. Open the app in another browser profile or after logging out from the seller account.

2. Select the buyer wallet in MetaMask.

3. Log in with the buyer's Solid account.

4. Open the marketplace listings page.

5. Select a listing from another user.

6. Click **Buy Access**.

7. Confirm the transaction in MetaMask.

8. The payment is locked in the smart contract.

9. A purchase request is sent to the seller's Solid inbox.

At this point, the buyer has paid locally, but does not yet have file access. Access is only granted after seller approval.

---

### Seller Approval Flow

1. Log in again as the seller.

2. Open the inbox page.

3. Review the pending sale request.

4. Click **Approve Sale**.

5. The application grants the buyer read access to the Solid file.

6. The smart contract releases the locked payment to the seller.

Alternatively, the seller can reject the sale. In that case, the buyer is refunded through the smart contract.

---

## Repository Structure

The main files and folders are:

```text
solidmarket2/
├── contracts/
│   └── MatketplaceTwo.sol
├── scripts/
│   └── deploy.js
├── src/
│   ├── components/
│   │   ├── FileManager.tsx
│   │   ├── Inbox.tsx
│   │   ├── LoginButton.tsx
│   │   ├── LogoutButton.tsx
│   │   └── Profile.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── BlockchainView.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── Listings.tsx
│   ├── utils/
│   │   ├── blockchainHelper.ts
│   │   └── solidHelper.ts
│   ├── App.tsx
│   └── index.tsx
├── hardhat.config.js
├── package.json
└── README.md
```

### Important Files

#### `contracts/MatketplaceTwo.sol`

The Solidity smart contract. It stores file listings, handles purchases, tracks sale status, and manages approval, rejection, and refund logic.

> Note: the file name in the repository is currently `MatketplaceTwo.sol`.

#### `scripts/deploy.js`

Deploys the smart contract to the selected Hardhat network and prints the deployed contract address.

#### `src/utils/blockchainHelper.ts`

Contains all frontend blockchain helper functions, including:

- contract connection,
- listing creation,
- listing deletion,
- price retrieval,
- purchase transaction,
- sale approval,
- sale rejection,
- refund after timeout,
- hash verification,
- loading listings from blockchain events.

This file also contains the hardcoded `CONTRACT_ADDRESS`. Update it every time the contract is redeployed.

#### `src/utils/solidHelper.ts`

Contains Solid helper functions, including:

- file upload,
- file listing from a Pod,
- SHA-256 hash computation,
- container creation,
- marketplace inbox preparation,
- purchase request sending,
- inbox message loading,
- access control updates,
- buyer read-access granting.

#### `src/components/FileManager.tsx`

Handles seller-side file upload and listing creation.

#### `src/pages/Listings.tsx`

Shows marketplace listings from other users and allows buyers to buy access.

#### `src/components/Inbox.tsx`

Shows seller purchase requests and allows the seller to approve or reject them.

#### `src/context/AuthContext.tsx`

Manages Solid login, logout, and session state.

---

## Smart Contract Overview

The smart contract is named:

```solidity
MarketplaceTwo
```

It stores listing data such as:

- seller wallet,
- seller WebID,
- file URL,
- file hash,
- price,
- listing status,
- listing timestamp.

It also stores sale data such as:

- sale ID,
- file URL,
- buyer wallet,
- seller wallet,
- buyer WebID,
- payment amount,
- sale status,
- creation timestamp.

The sale status can be:

```text
Pending
Approved
Rejected
Refunded
```

Main contract actions:

- `storeFileHashWithPrice(...)`: creates a file listing.
- `deleteListing(...)`: deactivates a listing.
- `getFilePrice(...)`: reads the price of a file.
- `purchaseFile(...)`: creates a pending sale and locks the buyer's payment.
- `approveSale(...)`: releases payment to the seller.
- `rejectSale(...)`: refunds the buyer.
- `refundAfterTimeout(...)`: lets the buyer request a refund after the timeout.
- `verifyFileHash(...)`: compares a given hash with the stored hash.

---

## Solid Pod and Inbox Overview

The application uses the user's Solid Pod as the storage and access-control layer.

### File Storage

Uploaded files are stored in:

```text
https://username.solidcommunity.net/resources/
```

The actual file is not stored on the blockchain. Only metadata and a hash are stored on-chain.

### Marketplace Inbox

Purchase requests are sent to:

```text
https://username.solidcommunity.net/inbox/marketplace/
```

A purchase request contains data such as:

```json
{
  "type": "PurchaseRequest",
  "saleId": "1",
  "fileUrl": "https://seller.solidcommunity.net/resources/example.pdf",
  "buyerWebId": "https://buyer.solidcommunity.net/profile/card#me",
  "timestamp": 1710000000000
}
```

The inbox allows the seller to know which buyer requested access to which file. The seller can then approve or reject the sale.

### Access Granting

When the seller approves a request, the app grants the buyer read access to the file in the seller's Solid Pod. The smart contract itself cannot modify Solid permissions directly. That is why the frontend performs the Solid access update after the seller clicks approve.

---

## Troubleshooting

### `Ethereum wallet required`

MetaMask is not available or not connected.

Fix:

- Install MetaMask.
- Connect MetaMask to the app.
- Select the Hardhat local network.

---

### MetaMask Does Not Show the Local Network

Add the Hardhat network manually:

```text
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency symbol: ETH
```

---

### Transaction Fails Immediately

Possible causes:

- Hardhat node is not running.
- MetaMask is connected to the wrong network.
- The contract address in `blockchainHelper.ts` is outdated.
- The contract was redeployed but the frontend still uses the old address.

Fix:

1. Make sure Terminal 1 is running:

   ```bash
   npx hardhat node
   ```

2. Redeploy the contract:

   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. Copy the new address into:

   ```text
   src/utils/blockchainHelper.ts
   ```

4. Save the file and refresh the app.

---

### Listings Do Not Appear

Possible causes:

- The contract address is wrong.
- The local blockchain was restarted.
- The listing transaction was not confirmed in MetaMask.
- The app is looking at a fresh Hardhat chain with no previous events.

Fix:

- Check the address in `blockchainHelper.ts`.
- Create a new listing after restarting Hardhat.
- Click **Refresh Listings** in the app.

---

### Solid Login Does Not Work

Check that the Solid issuer is:

```text
https://solidcommunity.net
```

Also make sure the frontend is running at:

```text
http://localhost:3000
```

The current redirect URL in the app is configured for local development at `http://localhost:3000/`.

---

### 403 Forbidden When Sending Purchase Request

This usually means the buyer is not allowed to append a message to the seller's marketplace inbox.

Possible causes:

- The seller has not created or prepared the marketplace inbox yet.
- The seller did not create a listing through the app.
- The inbox permissions were not set correctly.
- The Solid provider rejected the write or append request.

Fix:

1. Log in as the seller.
2. Create a listing through the app.
3. Make sure the seller's marketplace inbox exists:

   ```text
   https://sellername.solidcommunity.net/inbox/marketplace/
   ```

4. Try the buyer purchase again.

---

### Buyer Paid But Has No Access Yet

This is expected behavior.

The buyer only receives access after the seller approves the sale in the inbox. Until then, the payment remains pending in the smart contract.

---

### Hardhat Cache or Compile Errors

Try clearing Hardhat artifacts and compiling again.

On macOS/Linux:

```bash
rm -rf cache artifacts
npx hardhat compile
```

On Windows Command Prompt:

```cmd
rmdir /s /q cache
rmdir /s /q artifacts
npx hardhat compile
```

---

## Known Limitations

This project is a proof of concept. Some limitations are expected:

- The blockchain runs locally through Hardhat.
- The contract address is hardcoded in the frontend and must be updated after redeployment.
- The ABI is manually defined in `blockchainHelper.ts`.
- The project does not use a production backend.
- The application depends on Solid Pod permissions and provider behavior.
- The smart contract cannot directly modify Solid access rights.
- The seller must approve access manually.
- Marketplace listings are reconstructed from blockchain events.
- Restarting the local Hardhat node resets the local blockchain state.
- No real cryptocurrency should be used.

---

## Thesis Context

This repository belongs to the thesis project:

```text
Blockchain and Solid: two peas in a pod, or sworn enemies?
```

The code demonstrates the technical prototype developed for the thesis. The prototype explores how Solid Pods and blockchain smart contracts can be combined to support a decentralized marketplace in which users keep control over their own files while blockchain provides transparent listing, verification, and payment coordination.
