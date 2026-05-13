const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("MarketplaceTwo", function () {
  let marketplace;
  let deployer;
  let seller;
  let buyer;
  let otherUser;

  const fileUrl = "https://seller.solidcommunity.net/resources/test-file.txt";
  const fileHash = "abc123hash";
  const wrongHash = "wronghash";
  const sellerWebId = "https://seller.solidcommunity.net/profile/card#me";
  const buyerWebId = "https://buyer.solidcommunity.net/profile/card#me";
  const price = ethers.parseEther("1");

  beforeEach(async function () {
    [deployer, seller, buyer, otherUser] = await ethers.getSigners();

    const MarketplaceTwo = await ethers.getContractFactory("MarketplaceTwo");
    marketplace = await MarketplaceTwo.deploy();
    await marketplace.waitForDeployment();
  });

  async function createListing() {
    return marketplace
      .connect(seller)
      .storeFileHashWithPrice(fileUrl, fileHash, price, sellerWebId);
  }

  async function createPurchase() {
    await createListing();

    await marketplace
      .connect(buyer)
      .purchaseFile(fileUrl, buyerWebId, { value: price });

    return await marketplace.saleCounter();
  }

  describe("Listing creation", function () {
    it("should allow a seller to create a listing", async function () {
      await createListing();

      const storedPrice = await marketplace.getFilePrice(fileUrl);
      expect(storedPrice).to.equal(price);

      const fileData = await marketplace.getFileData(fileUrl);

      expect(fileData[0]).to.equal(seller.address);
      expect(fileData[1]).to.equal(sellerWebId);
      expect(fileData[2]).to.equal(fileUrl);
      expect(fileData[3]).to.equal(fileHash);
      expect(fileData[4]).to.equal(price);
    });

    it("should emit a FileStored event when a listing is created", async function () {
      await expect(createListing())
        .to.emit(marketplace, "FileStored")
        .withArgs(
          seller.address,
          sellerWebId,
          fileUrl,
          fileHash,
          price,
          anyValue
        );
    });

    it("should reject listings with a price of zero", async function () {
      await expect(
        marketplace
          .connect(seller)
          .storeFileHashWithPrice(fileUrl, fileHash, 0, sellerWebId)
      ).to.be.revertedWith("Price must be greater than zero");
    });
  });

  describe("Hash verification", function () {
    it("should return true for the correct file hash", async function () {
      await createListing();

      const result = await marketplace.verifyFileHash(fileUrl, fileHash);
      expect(result).to.equal(true);
    });

    it("should return false for an incorrect file hash", async function () {
      await createListing();

      const result = await marketplace.verifyFileHash(fileUrl, wrongHash);
      expect(result).to.equal(false);
    });
  });

  describe("Listing deletion", function () {
    it("should allow the seller to delete their own listing", async function () {
      await createListing();

      await expect(marketplace.connect(seller).deleteListing(fileUrl))
        .to.emit(marketplace, "ListingDeleted")
        .withArgs(fileUrl, seller.address);

      await expect(
        marketplace.connect(buyer).purchaseFile(fileUrl, buyerWebId, {
          value: price,
        })
      ).to.be.revertedWith("Listing is no longer active");
    });

    it("should prevent another user from deleting the seller's listing", async function () {
      await createListing();

      await expect(
        marketplace.connect(otherUser).deleteListing(fileUrl)
      ).to.be.revertedWith("Only lister can delete listing");
    });

    it("should prevent deleting the same listing twice", async function () {
      await createListing();

      await marketplace.connect(seller).deleteListing(fileUrl);

      await expect(
        marketplace.connect(seller).deleteListing(fileUrl)
      ).to.be.revertedWith("Listing already deleted");
    });
  });

  describe("Purchase flow", function () {
    it("should allow a buyer to purchase a listed file and create a pending sale", async function () {
      await createListing();

      await expect(
        marketplace.connect(buyer).purchaseFile(fileUrl, buyerWebId, {
          value: price,
        })
      ).to.emit(marketplace, "SaleRequested");

      const saleId = await marketplace.saleCounter();
      const status = await marketplace.getSaleStatus(saleId);

      // SaleStatus.Pending = 0
      expect(status).to.equal(0);
    });

    it("should reject purchases with an incorrect payment amount", async function () {
      await createListing();

      const incorrectPrice = ethers.parseEther("0.5");

      await expect(
        marketplace.connect(buyer).purchaseFile(fileUrl, buyerWebId, {
          value: incorrectPrice,
        })
      ).to.be.revertedWith("Incorrect price");
    });

    it("should prevent the seller from buying their own listing", async function () {
      await createListing();

      await expect(
        marketplace.connect(seller).purchaseFile(fileUrl, sellerWebId, {
          value: price,
        })
      ).to.be.revertedWith("Seller cannot buy own listing");
    });

    it("should prevent purchasing a deleted listing", async function () {
      await createListing();

      await marketplace.connect(seller).deleteListing(fileUrl);

      await expect(
        marketplace.connect(buyer).purchaseFile(fileUrl, buyerWebId, {
          value: price,
        })
      ).to.be.revertedWith("Listing is no longer active");
    });
  });

  describe("Sale approval", function () {
    it("should allow the seller to approve a pending sale", async function () {
      const saleId = await createPurchase();

      await expect(marketplace.connect(seller).approveSale(saleId))
        .to.emit(marketplace, "SaleApproved")
        .withArgs(saleId);

      const status = await marketplace.getSaleStatus(saleId);

      // SaleStatus.Approved = 1
      expect(status).to.equal(1);
    });

    it("should prevent a non-seller from approving a sale", async function () {
      const saleId = await createPurchase();

      await expect(
        marketplace.connect(otherUser).approveSale(saleId)
      ).to.be.revertedWith("Only seller can approve");
    });

    it("should prevent approving the same sale twice", async function () {
      const saleId = await createPurchase();

      await marketplace.connect(seller).approveSale(saleId);

      await expect(
        marketplace.connect(seller).approveSale(saleId)
      ).to.be.revertedWith("Sale is not pending");
    });
  });

  describe("Sale rejection", function () {
    it("should allow the seller to reject a pending sale and refund the buyer", async function () {
      const saleId = await createPurchase();

      await expect(marketplace.connect(seller).rejectSale(saleId))
        .to.emit(marketplace, "SaleRejected")
        .withArgs(saleId);

      const status = await marketplace.getSaleStatus(saleId);

      // SaleStatus.Rejected = 2
      expect(status).to.equal(2);
    });

    it("should prevent a non-seller from rejecting a sale", async function () {
      const saleId = await createPurchase();

      await expect(
        marketplace.connect(otherUser).rejectSale(saleId)
      ).to.be.revertedWith("Only seller can reject");
    });

    it("should prevent rejecting an already approved sale", async function () {
      const saleId = await createPurchase();

      await marketplace.connect(seller).approveSale(saleId);

      await expect(
        marketplace.connect(seller).rejectSale(saleId)
      ).to.be.revertedWith("Sale is not pending");
    });
  });

  describe("Refund after timeout", function () {
    it("should allow the buyer to request a refund after the timeout period", async function () {
      const saleId = await createPurchase();

      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(marketplace.connect(buyer).refundAfterTimeout(saleId))
        .to.emit(marketplace, "SaleRefunded")
        .withArgs(saleId);

      const status = await marketplace.getSaleStatus(saleId);

      // SaleStatus.Refunded = 3
      expect(status).to.equal(3);
    });

    it("should prevent refund before the timeout period", async function () {
      const saleId = await createPurchase();

      await expect(
        marketplace.connect(buyer).refundAfterTimeout(saleId)
      ).to.be.revertedWith("Refund timeout not reached");
    });

    it("should prevent a non-buyer from requesting the timeout refund", async function () {
      const saleId = await createPurchase();

      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        marketplace.connect(otherUser).refundAfterTimeout(saleId)
      ).to.be.revertedWith("Only buyer can request refund");
    });
  });
});