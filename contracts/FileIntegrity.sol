// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileIntegrity {
    mapping(string => string) private fileHashes;

    event FileHashStored(string fileUrl, string hash);
    event FileHashVerified(string fileUrl, bool integrity);

    function storeFileHash(string memory fileUrl, string memory fileHash) public {
        require(bytes(fileHashes[fileUrl]).length == 0, "Hash already exists for this file.");
        fileHashes[fileUrl] = fileHash;
        emit FileHashStored(fileUrl, fileHash);
    }

    function verifyFileHash(string memory fileUrl, string memory fileHash) public view returns (bool) {
        return keccak256(abi.encodePacked(fileHashes[fileUrl])) == keccak256(abi.encodePacked(fileHash));
    }

    function getFileHash(string memory fileUrl) public view returns (string memory) {
        return fileHashes[fileUrl];
    }
}
