const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MarketplaceTwo gas usage", function () {
  let marketplace;
  let seller;
  let buyer;
  let otherBuyer;

  const price = ethers.parseEther("1");

  const shortData = {
    fileUrl: "ipfs://a",
    fileHash: "h1",
    sellerWebId: "seller",
    buyerWebId: "buyer",
  };

  const mediumData = {
    fileUrl: "https://seller.solidcommunity.net/resources/test-file.txt",
    fileHash: "abc123hash",
    sellerWebId: "https://seller.solidcommunity.net/profile/card#me",
    buyerWebId: "https://buyer.solidcommunity.net/profile/card#me",
  };

  const longData = {
    fileUrl:
      "https://seller.solidcommunity.net/resources/folder/subfolder/very-long-file-name-used-for-gas-testing-version-1-final-document.pdf",
    fileHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    sellerWebId:
      "https://very-long-seller-name-used-for-gas-testing.solidcommunity.net/profile/card#me",
    buyerWebId:
      "https://very-long-buyer-name-used-for-gas-testing.solidcommunity.net/profile/card#me",
  };

  beforeEach(async function () {
    [, seller, buyer, otherBuyer] = await ethers.getSigners();

    const MarketplaceTwo = await ethers.getContractFactory("MarketplaceTwo");
    marketplace = await MarketplaceTwo.deploy();
    await marketplace.waitForDeployment();
  });

  async function measureTx(label, txPromise) {
    const tx = await txPromise;
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.gasPrice ?? 0n;
    const feeWei = gasUsed * gasPrice;

    return {
      label,
      gasUsed: gasUsed.toString(),
      gasPriceWei: gasPrice.toString(),
      feeEth: ethers.formatEther(feeWei),
    };
  }

  async function createListing(data, customFileUrl) {
    const url = customFileUrl ?? data.fileUrl;

    return marketplace
      .connect(seller)
      .storeFileHashWithPrice(
        url,
        data.fileHash,
        price,
        data.sellerWebId
      );
  }

  async function createPurchase(data, customFileUrl) {
    const url = customFileUrl ?? data.fileUrl;

    await createListing(data, url);

    const tx = await marketplace
      .connect(buyer)
      .purchaseFile(url, data.buyerWebId, { value: price });

    const receipt = await tx.wait();
    const saleId = await marketplace.saleCounter();

    return { receipt, saleId, url };
  }

  describe("Gas per marketplace action", function () {
    it("measures gas for the main successful marketplace actions", async function () {
      const results = [];

      results.push(
        await measureTx(
          "Create listing",
          createListing(mediumData)
        )
      );

      results.push(
        await measureTx(
          "Purchase file",
          marketplace
            .connect(buyer)
            .purchaseFile(mediumData.fileUrl, mediumData.buyerWebId, {
              value: price,
            })
        )
      );

      const saleId = await marketplace.saleCounter();

      results.push(
        await measureTx(
          "Approve sale",
          marketplace.connect(seller).approveSale(saleId)
        )
      );

      const secondFileUrl =
        "https://seller.solidcommunity.net/resources/second-file.txt";

      await createListing(mediumData, secondFileUrl);

      await marketplace
        .connect(otherBuyer)
        .purchaseFile(secondFileUrl, mediumData.buyerWebId, {
          value: price,
        });

      const secondSaleId = await marketplace.saleCounter();

      results.push(
        await measureTx(
          "Reject sale",
          marketplace.connect(seller).rejectSale(secondSaleId)
        )
      );

      const thirdFileUrl =
        "https://seller.solidcommunity.net/resources/third-file.txt";

      results.push(
        await measureTx(
          "Delete listing",
          createListing(mediumData, thirdFileUrl)
        )
      );

      results.push(
        await measureTx(
          "Delete active listing",
          marketplace.connect(seller).deleteListing(thirdFileUrl)
        )
      );

      console.table(results);

      expect(results.length).to.equal(6);
    });
  });

  describe("Gas under different metadata lengths", function () {
    it("compares listing gas for short, medium, and long metadata", async function () {
      const results = [];

      results.push(
        await measureTx(
          "Create listing - short metadata",
          createListing(shortData)
        )
      );

      results.push(
        await measureTx(
          "Create listing - medium metadata",
          createListing(mediumData)
        )
      );

      results.push(
        await measureTx(
          "Create listing - long metadata",
          createListing(longData)
        )
      );

      console.table(results);

      const shortGas = BigInt(results[0].gasUsed);
      const mediumGas = BigInt(results[1].gasUsed);
      const longGas = BigInt(results[2].gasUsed);

      expect(mediumGas).to.be.greaterThan(shortGas);
      expect(longGas).to.be.greaterThan(mediumGas);
    });

    it("compares purchase gas for short, medium, and long buyer metadata", async function () {
      const results = [];

      await createListing(shortData);
      results.push(
        await measureTx(
          "Purchase - short metadata",
          marketplace
            .connect(buyer)
            .purchaseFile(shortData.fileUrl, shortData.buyerWebId, {
              value: price,
            })
        )
      );

      await createListing(mediumData);
      results.push(
        await measureTx(
          "Purchase - medium metadata",
          marketplace
            .connect(buyer)
            .purchaseFile(mediumData.fileUrl, mediumData.buyerWebId, {
              value: price,
            })
        )
      );

      await createListing(longData);
      results.push(
        await measureTx(
          "Purchase - long metadata",
          marketplace
            .connect(buyer)
            .purchaseFile(longData.fileUrl, longData.buyerWebId, {
              value: price,
            })
        )
      );

      console.table(results);

      const shortGas = BigInt(results[0].gasUsed);
      const mediumGas = BigInt(results[1].gasUsed);
      const longGas = BigInt(results[2].gasUsed);

      expect(mediumGas).to.be.greaterThan(shortGas);
      expect(longGas).to.be.greaterThan(mediumGas);
    });
  });

  describe("Gas stability as number of listings increases", function () {
    it("measures listing gas for first, tenth, and twentieth listing", async function () {
      const results = [];

      for (let i = 1; i <= 20; i++) {
        const url = `https://seller.solidcommunity.net/resources/file-${i}.txt`;

        const result = await measureTx(
          `Create listing ${i}`,
          createListing(mediumData, url)
        );

        if (i === 1 || i === 10 || i === 20) {
          results.push(result);
        }
      }

      console.table(results);

      const firstGas = BigInt(results[0].gasUsed);
      const twentiethGas = BigInt(results[2].gasUsed);

      const difference =
        firstGas > twentiethGas
          ? firstGas - twentiethGas
          : twentiethGas - firstGas;

      // The contract does not loop through all listings,
      // so the gas should remain in the same general range.
      expect(difference).to.be.lessThan(10000n);
    });
  });

  describe("Gas for different sale outcomes", function () {
    it("compares approve, reject, and timeout refund flows", async function () {
      const results = [];

      const approveUrl =
        "https://seller.solidcommunity.net/resources/approve-flow.txt";

      await createListing(mediumData, approveUrl);
      results.push(
        await measureTx(
          "Purchase - approve flow",
          marketplace
            .connect(buyer)
            .purchaseFile(approveUrl, mediumData.buyerWebId, {
              value: price,
            })
        )
      );

      let saleId = await marketplace.saleCounter();

      results.push(
        await measureTx(
          "Approve sale",
          marketplace.connect(seller).approveSale(saleId)
        )
      );

      const rejectUrl =
        "https://seller.solidcommunity.net/resources/reject-flow.txt";

      await createListing(mediumData, rejectUrl);
      results.push(
        await measureTx(
          "Purchase - reject flow",
          marketplace
            .connect(buyer)
            .purchaseFile(rejectUrl, mediumData.buyerWebId, {
              value: price,
            })
        )
      );

      saleId = await marketplace.saleCounter();

      results.push(
        await measureTx(
          "Reject sale",
          marketplace.connect(seller).rejectSale(saleId)
        )
      );

      const refundUrl =
        "https://seller.solidcommunity.net/resources/refund-flow.txt";

      await createListing(mediumData, refundUrl);
      results.push(
        await measureTx(
          "Purchase - timeout refund flow",
          marketplace
            .connect(buyer)
            .purchaseFile(refundUrl, mediumData.buyerWebId, {
              value: price,
            })
        )
      );

      saleId = await marketplace.saleCounter();

      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      results.push(
        await measureTx(
          "Refund after timeout",
          marketplace.connect(buyer).refundAfterTimeout(saleId)
        )
      );

      console.table(results);

      expect(results.length).to.equal(6);
    });
  });
});