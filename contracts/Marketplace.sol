// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Marketplace {
    struct FileData {
        string fileHash;
        uint256 price;
        address owner;
    }

    mapping(string => FileData) public files;

    event FileUploaded(string fileUrl, uint256 price, address owner);
    event FilePurchased(string fileUrl, address buyer);

    function storeFileHashWithPrice(string memory fileUrl, string memory fileHash, uint256 price) public {
        require(files[fileUrl].owner == address(0), "File already exists");
        files[fileUrl] = FileData(fileHash, price, msg.sender);
        emit FileUploaded(fileUrl, price, msg.sender);
    }

    function getFilePrice(string memory fileUrl) public view returns (uint256) {
        return files[fileUrl].price;
    }

    function purchaseFile(string memory fileUrl) public payable {
        FileData memory file = files[fileUrl];
        require(file.owner != address(0), "File not found");
        require(msg.value >= file.price, "Insufficient payment");

        payable(file.owner).transfer(msg.value);
        emit FilePurchased(fileUrl, msg.sender);
    }

    function verifyFileHash(string memory fileUrl, string memory fileHash) public view returns (bool) {
        return keccak256(abi.encodePacked(files[fileUrl].fileHash)) == keccak256(abi.encodePacked(fileHash));
    }
}
