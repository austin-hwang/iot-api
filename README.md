
# Enabling the Dissemination of High-Value IoT Data Through Decentralized Auctions on the Blockchain

![Logo](https://i.imgur.com/sfpkfud.png)

# Overview
This RESTful API, written in _Express_, models an IoT device according to the Mozilla Web of Things API. It automatically
starts an Auction contract, provides endpoints for the highest bidder to retrieve the device data using the API Key won in the 
auction, and also automatically collects funds from the highest bid  in the contract after the auction ends.

# Instructions

To install dependencies: `npm i`

Either install the Ganache GUI and change port number to `8545` or run in terminal `ganache-cli -b 3`

To start IoT API backend: `npm start`, which creates an instance of the AuctionFactory, which we use to keep track of
 all created auctions, and starts one Auction. After that, running `npm run testAll` would create 5 more auctions using
 the same AuctionFactory.


To view the auctions on the frontend: copy the AuctionFactory address generated in terminal and replace it in 
Details.js at line 216.
```bash
Running migration: 2_deploy_contracts.js
  Deploying AuctionFactory...
  ... 0x782fd6a0e54f7c3934261f94e6bdcbb257a6ad2adf9f63d923c23ca4fb1492ab
  AuctionFactory: 0xd62ba15ba2ec4e589b569c6f04eabe61c99c7008
```

```javascript
async refreshAuctions() {
    let factoryInstance = await AuctionFactory.at(
      "0xd62ba15ba2ec4e589b569c6f04eabe61c99c7008"
    );
    ...
}
```

# Files

## /contracts

This folder contains `AuctionFactory.sol` which creates a smart contract for creating new auction smart contracts for the IoT devices, and it stores all the active auctions. 

The file `dataAuction.sol` creates a smart contract for managing auctions, allowing for:
1. Bidding.
2. Getting an API key after transaction is locked.
3. Confirming the validity of the data provided by an API key by comparing hashes.
4. Allow refunding of bids lower than highest bid.
5. Withdrawing rewards after auction is completed.

## /migrations
This folder contains the scripts which deploy the AuctionFactory to the Ethereum blockchain when running `npm start` 
(`npm start` runs the command `truffle migrate --reset --compile-all`)

## index.js
This file contains the functionality of the RESTful API. On start, the `createAuction` function is automatically called.
This creates an Auction contract, assuming the ethereum address of the IoT device to be the first `geth` address and setting the auction
length to 100 seconds. It also generates a random API key and hashes the first 256 bytes of the data file, both of which 
are put into the Auction contract. This allows the highest bidder to retrieve the data from this API and verify the
validity of the data after the end of the auction, respectively. 

The `createAuction` function also calls the `getLocation` function, which populates the location field of the metadata with the current location of the simulated "IoT device," using IP
address lookup.

The `withdrawFunds` function, also called on start, automatically attempts to withdraw the funds, paid by the highest 
bidder, from the Auction contract at set time intervals. It will only be successful after the end of the auction bidding
period and after the highest bidder has verified the data (handled automatically by our frontend).

Finally, we have two functions for the API endpoints:
```javascript
app.get("/things/pi/properties/temperature", (req, res) => {...

app.get("/things/pi/properties/humidity", (req, res) => {...
```
These endpoints allow the highest bidder to retrieve the pertinent simulated device's data (for the purposes of the MVP, we have
included some sample data), using the API key they received from the Auction as authentication in the `x-access-token` 
header. 

## sampleMetadata.json
This file contains example metadata for a few kinds of devices. This metadata is put into the Auction contract so that 
bidders can see to what kind of device a particular auction pertains. On the frontend, we are able to provide filtering 
on all available auctions using the fields in the metadata, including location.

## temperature.json and humidity.json
These files contains sample data that one might expect to receive from a Nest thermostat or humidity sensor, respectively.
