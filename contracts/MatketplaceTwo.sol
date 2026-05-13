// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MarketplaceTwo {
    enum SaleStatus {
        Pending,
        Approved,
        Rejected,
        Refunded
    }

    struct FileData {
        address payable listerWallet;
        string webId;
        string fileUrl;
        string fileHash;
        uint256 price;
        bool exists;
        bool active;
        uint256 listedAt;
    }

    struct Sale {
        uint256 saleId;
        string fileUrl;
        address payable buyerWallet;
        address payable sellerWallet;
        string buyerWebId;
        uint256 amount;
        SaleStatus status;
        uint256 createdAt;
    }

    mapping(string => FileData) private files;
    mapping(uint256 => Sale) public sales;

    uint256 public saleCounter;
    uint256 public constant REFUND_TIMEOUT = 1 days;

    event FileStored(
        address indexed listerWallet,
        string webId,
        string fileUrl,
        string fileHash,
        uint256 price,
        uint256 listedAt
);
event ListingDeleted(
    string fileUrl,
    address indexed listerWallet
);

    event SaleRequested(
        uint256 indexed saleId,
        string fileUrl,
        address indexed buyerWallet,
        address indexed sellerWallet,
        string buyerWebId,
        uint256 amount
    );

    event SaleApproved(uint256 indexed saleId);
    event SaleRejected(uint256 indexed saleId);
    event SaleRefunded(uint256 indexed saleId);

    function storeFileHashWithPrice(
        string memory fileUrl,
        string memory fileHash,
        uint256 price,
        string memory webId
    ) public {
        require(price > 0, "Price must be greater than zero");

        files[fileUrl] = FileData({
    listerWallet: payable(msg.sender),
    webId: webId,
    fileUrl: fileUrl,
    fileHash: fileHash,
    price: price,
    exists: true,
    active: true,
    listedAt: block.timestamp
});

emit FileStored(
    msg.sender,
    webId,
    fileUrl,
    fileHash,
    price,
    block.timestamp
);
    }
    function deleteListing(string memory fileUrl) public {
    FileData storage file = files[fileUrl];

    require(file.exists, "Listing does not exist");
    require(file.active, "Listing already deleted");
    require(msg.sender == file.listerWallet, "Only lister can delete listing");

    file.active = false;

    emit ListingDeleted(fileUrl, msg.sender);
}

    function getFilePrice(string memory fileUrl) public view returns (uint256) {
        require(files[fileUrl].exists, "File not found");
        return files[fileUrl].price;
    }

    function purchaseFile(
        string memory fileUrl,
        string memory buyerWebId
    ) public payable returns (uint256) {
        FileData storage file = files[fileUrl];

        require(file.exists, "File not found");
        require(msg.value == file.price, "Incorrect price");
        require(file.active, "Listing is no longer active");
        require(msg.sender != file.listerWallet, "Seller cannot buy own listing");

        saleCounter++;

        sales[saleCounter] = Sale({
            saleId: saleCounter,
            fileUrl: fileUrl,
            buyerWallet: payable(msg.sender),
            sellerWallet: file.listerWallet,
            buyerWebId: buyerWebId,
            amount: msg.value,
            status: SaleStatus.Pending,
            createdAt: block.timestamp
        });

        emit SaleRequested(
            saleCounter,
            fileUrl,
            msg.sender,
            file.listerWallet,
            buyerWebId,
            msg.value
        );

        return saleCounter;
    }

    function approveSale(uint256 saleId) public {
        Sale storage sale = sales[saleId];

        require(sale.status == SaleStatus.Pending, "Sale is not pending");
        require(msg.sender == sale.sellerWallet, "Only seller can approve");

        sale.status = SaleStatus.Approved;

        (bool sent, ) = sale.sellerWallet.call{value: sale.amount}("");
        require(sent, "Payment transfer failed");

        emit SaleApproved(saleId);
    }

    function rejectSale(uint256 saleId) public {
        Sale storage sale = sales[saleId];

        require(sale.status == SaleStatus.Pending, "Sale is not pending");
        require(msg.sender == sale.sellerWallet, "Only seller can reject");

        sale.status = SaleStatus.Rejected;

        (bool refunded, ) = sale.buyerWallet.call{value: sale.amount}("");
        require(refunded, "Refund failed");

        emit SaleRejected(saleId);
    }

    function refundAfterTimeout(uint256 saleId) public {
        Sale storage sale = sales[saleId];

        require(sale.status == SaleStatus.Pending, "Sale is not pending");
        require(msg.sender == sale.buyerWallet, "Only buyer can request refund");
        require(
            block.timestamp >= sale.createdAt + REFUND_TIMEOUT,
            "Refund timeout not reached"
        );

        sale.status = SaleStatus.Refunded;

        (bool refunded, ) = sale.buyerWallet.call{value: sale.amount}("");
        require(refunded, "Refund failed");

        emit SaleRefunded(saleId);
    }

    function verifyFileHash(
        string memory fileUrl,
        string memory hashToCheck
    ) public view returns (bool) {
        return keccak256(abi.encodePacked(files[fileUrl].fileHash))
            == keccak256(abi.encodePacked(hashToCheck));
    }

    function getFileData(
    string memory fileUrl
)
    public
    view
    returns (
        address,
        string memory,
        string memory,
        string memory,
        uint256,
        bool,
        uint256
    )
{
    FileData memory f = files[fileUrl];

    return (
        f.listerWallet,
        f.webId,
        f.fileUrl,
        f.fileHash,
        f.price,
        f.active,
        f.listedAt
    );
}

    function getSaleStatus(uint256 saleId) public view returns (SaleStatus) {
        return sales[saleId].status;
    }
}