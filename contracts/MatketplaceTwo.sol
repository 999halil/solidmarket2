// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MarketplaceTwo {

    // -----------------------------------
    // STRUCT THAT STORES ALL FILE DATA
    // -----------------------------------
    struct FileData {
        address listerWallet;   // Ethereum wallet of the uploader
        string webId;           // Solid WebID of the uploader
        string fileUrl;         // URL to the file in their Solid Pod
        string fileHash;        // SHA-256 hash
        uint256 price;          // Price in ETH
    }

    // Mapping: fileUrl → FileData
    mapping(string => FileData) private files;

    // -----------------------------------
    // EVENT EMITTED ON EACH FILE LISTING
    // -----------------------------------
    event FileStored(
        address indexed listerWallet,
        string webId,
        string fileUrl,
        string fileHash,
        uint256 price
    );

    // -----------------------------------
    // STORE FILE HASH, PRICE, LISTER DATA
    // -----------------------------------
    function storeFileHashWithPrice(
        string memory fileUrl,
        string memory fileHash,
        uint256 price,
        string memory webId
    ) public payable {

        files[fileUrl] = FileData({
            listerWallet: msg.sender,
            webId: webId,
            fileUrl: fileUrl,
            fileHash: fileHash,
            price: price
        });

        emit FileStored(msg.sender, webId, fileUrl, fileHash, price);
    }

    // -----------------------------------
    // READ PRICE
    // -----------------------------------
    function getFilePrice(string memory fileUrl)
        public
        view
        returns (uint256)
    {
        return files[fileUrl].price;
    }

    // -----------------------------------
    // PURCHASE FILE (REQUIRES EXACT PRICE)
    // -----------------------------------
    function purchaseFile(string memory fileUrl) public payable {

        uint256 price = files[fileUrl].price;

        require(price > 0, "File not found.");
        require(msg.value == price, "Incorrect price.");

        // (Optional) ETH transfer to seller:
        // payable(files[fileUrl].listerWallet).transfer(msg.value);
    }

    // -----------------------------------
    // VERIFY HASH
    // -----------------------------------
    function verifyFileHash(
        string memory fileUrl,
        string memory hashToCheck
    )
        public
        view
        returns (bool)
    {
        return keccak256(abi.encodePacked(files[fileUrl].fileHash))
            == keccak256(abi.encodePacked(hashToCheck));
    }


    // -----------------------------------
    // OPTIONAL: GET FULL FILE DATA
    // -----------------------------------
    function getFileData(string memory fileUrl)
        public
        view
        returns (
            address,
            string memory,
            string memory,
            string memory,
            uint256
        )
    {
        FileData memory f = files[fileUrl];
        return (f.listerWallet, f.webId, f.fileUrl, f.fileHash, f.price);
    }
}
