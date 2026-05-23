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

  function printGasResult(group, operation, gasUsed, gasPriceWei, feeEth) {
    console.log(
      `GAS_RESULT,${group},${operation},${gasUsed.toString()},${gasPriceWei.toString()},${feeEth}`
    );
  }

  async function measureTx(group, operation, txPromise) {
    const tx = await txPromise;
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed;
    const gasPriceWei = receipt.gasPrice ?? 0n;
    const feeWei = gasUsed * gasPriceWei;
    const feeEth = ethers.formatEther(feeWei);

    printGasResult(group, operation, gasUsed, gasPriceWei, feeEth);

    return {
      group,
      operation,
      gasUsed: gasUsed.toString(),
      gasPriceWei: gasPriceWei.toString(),
      feeEth,
    };
  }

  async function createListing(data, customFileUrl) {
    const url = customFileUrl ?? data.fileUrl;

    return marketplace
      .connect(seller)
      .storeFileHashWithPrice(url, data.fileHash, price, data.sellerWebId);
  }

  describe("Gas per marketplace action", function () {
    it("measures gas for the main successful marketplace actions", async function () {
      const results = [];

      results.push(
        await measureTx(
          "Main actions",
          "Create listing",
          createListing(mediumData)
        )
      );

      results.push(
        await measureTx(
          "Main actions",
          "Purchase file",
          marketplace
            .connect(buyer)
            .purchaseFile(mediumData.fileUrl, mediumData.buyerWebId, {
              value: price,
            })
        )
      );

      let saleId = await marketplace.saleCounter();

      results.push(
        await measureTx(
          "Main actions",
          "Approve sale",
          marketplace.connect(seller).approveSale(saleId)
        )
      );

      const rejectFileUrl =
        "https://seller.solidcommunity.net/resources/reject-file.txt";

      await createListing(mediumData, rejectFileUrl);

      await marketplace
        .connect(otherBuyer)
        .purchaseFile(rejectFileUrl, mediumData.buyerWebId, {
          value: price,
        });

      saleId = await marketplace.saleCounter();

      results.push(
        await measureTx(
          "Main actions",
          "Reject sale",
          marketplace.connect(seller).rejectSale(saleId)
        )
      );

      const deleteFileUrl =
        "https://seller.solidcommunity.net/resources/delete-file.txt";

      await createListing(mediumData, deleteFileUrl);

      results.push(
        await measureTx(
          "Main actions",
          "Delete active listing",
          marketplace.connect(seller).deleteListing(deleteFileUrl)
        )
      );

      expect(results.length).to.equal(5);
    });
  });

  describe("Gas under different metadata lengths", function () {
    it("compares listing gas for short, medium, and long metadata", async function () {
      const results = [];

      results.push(
        await measureTx(
          "Metadata length - listing",
          "Create listing - short metadata",
          createListing(shortData)
        )
      );

      results.push(
        await measureTx(
          "Metadata length - listing",
          "Create listing - medium metadata",
          createListing(mediumData)
        )
      );

      results.push(
        await measureTx(
          "Metadata length - listing",
          "Create listing - long metadata",
          createListing(longData)
        )
      );

      const shortGas = BigInt(results[0].gasUsed);
      const mediumGas = BigInt(results[1].gasUsed);
      const longGas = BigInt(results[2].gasUsed);

      expect(mediumGas > shortGas).to.equal(true);
      expect(longGas > mediumGas).to.equal(true);
    });

    it("compares purchase gas for short, medium, and long buyer metadata", async function () {
      const results = [];

      await createListing(shortData);

      results.push(
        await measureTx(
          "Metadata length - purchase",
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
          "Metadata length - purchase",
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
          "Metadata length - purchase",
          "Purchase - long metadata",
          marketplace
            .connect(buyer)
            .purchaseFile(longData.fileUrl, longData.buyerWebId, {
              value: price,
            })
        )
      );

      const shortGas = BigInt(results[0].gasUsed);
      const mediumGas = BigInt(results[1].gasUsed);
      const longGas = BigInt(results[2].gasUsed);

      expect(mediumGas > shortGas).to.equal(true);
      expect(longGas > mediumGas).to.equal(true);
    });
  });

  describe("Gas stability as number of listings increases", function () {
    it("measures listing gas for first, tenth, and twentieth listing", async function () {
      const results = [];

      for (let i = 1; i <= 20; i++) {
        const url = `https://seller.solidcommunity.net/resources/file-${i}.txt`;
        const txPromise = createListing(mediumData, url);

        if (i === 1 || i === 10 || i === 20) {
          results.push(
            await measureTx(
              "Listing count stability",
              `Create listing ${i}`,
              txPromise
            )
          );
        } else {
          const tx = await txPromise;
          await tx.wait();
        }
      }

      const firstGas = BigInt(results[0].gasUsed);
      const twentiethGas = BigInt(results[2].gasUsed);

      const difference =
        firstGas > twentiethGas
          ? firstGas - twentiethGas
          : twentiethGas - firstGas;

      expect(difference < 10000n).to.equal(true);
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
          "Sale outcomes",
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
          "Sale outcomes",
          "Approve sale",
          marketplace.connect(seller).approveSale(saleId)
        )
      );

      const rejectUrl =
        "https://seller.solidcommunity.net/resources/reject-flow.txt";

      await createListing(mediumData, rejectUrl);

      results.push(
        await measureTx(
          "Sale outcomes",
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
          "Sale outcomes",
          "Reject sale",
          marketplace.connect(seller).rejectSale(saleId)
        )
      );

      const refundUrl =
        "https://seller.solidcommunity.net/resources/refund-flow.txt";

      await createListing(mediumData, refundUrl);

      results.push(
        await measureTx(
          "Sale outcomes",
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
          "Sale outcomes",
          "Refund after timeout",
          marketplace.connect(buyer).refundAfterTimeout(saleId)
        )
      );

      expect(results.length).to.equal(6);
    });
  });
});