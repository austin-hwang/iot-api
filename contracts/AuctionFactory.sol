pragma solidity ^0.4.11;

import './dataAuction.sol';

contract AuctionFactory {

    // This is dummy holder so that changes to Product are loaded along with factory
    // This number will match the migration number
    uint256 public version = 16;

    //restrict call to create produt later using this owner only
    address factoryOwner;

    // contains the owner of an auction mapped to the hash of that auction
    address[] public auctions;
    // mapping( address => address) public escrows;

    event AuctionCreated(address auction, address beneficiary);

    function AuctionFactory() {
        factoryOwner = msg.sender;
    }

    function createAuction(uint biddingTime, address beneficiary, uint collectionPeriod, bytes32 sellerHash, string metadata, string apiKey) returns (address auctionAddress) {

        address owner = msg.sender;
        dataAuction auction = new dataAuction(biddingTime, beneficiary, collectionPeriod, sellerHash, metadata, apiKey);
        auctions.push(auction);
        // AuctionEscrow escrow = new AuctionEscrow(owner, auction);
        // escrows[auction] = escrow;
        AuctionCreated(address(auction), owner);

    }

    function getAuction(uint256 index) returns (address) {
        return auctions[index];
    }

    function numAuctions() returns (uint256) {
        return auctions.length;
    }

    // function getEscrow(address auction) returns (address) {
    //     return escrows[auction];
    // }


}