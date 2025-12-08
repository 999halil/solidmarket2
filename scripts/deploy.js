const hre = require("hardhat");

async function main() {
    const Marketplace = await hre.ethers.getContractFactory("MarketplaceTwo");
    const marketplace = await Marketplace.deploy();

    await marketplace.waitForDeployment();
    console.log(`Marketplace deployed to: ${marketplace.target}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
