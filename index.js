import express from "express";
import { default as Web3 } from "web3";
import { default as contract } from "truffle-contract";
import sha256 from "js-sha256";
import hat from "hat";
import geoip from "geoip-lite";
import os from "os";

import auction from "./build/contracts/dataAuction.json";
import auctionFactory from "./build/contracts/AuctionFactory.json";
import sampleMetadata from "./sampleMetadata.json";
import tempData from "./temperature.json";
import humidityData from "./humidity.json";

const sampleTempData = JSON.stringify(tempData);
const sampleHumidityData = JSON.stringify(humidityData);

const app = express();
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const Auction = contract(auction);
Auction.setProvider(web3.currentProvider);
const AuctionFactory = contract(auctionFactory);
AuctionFactory.setProvider(web3.currentProvider);
const apiKey = hat();
const beneficiary = web3.eth.accounts[0];
let auctionAddress = null;

const createAuction = async () => {
  let sellerHash =
    "0x" +
    sha256(
      parseInt(process.env.PORT)
        ? sampleTempData.slice(0, 128)
        : sampleHumidityData.slice(0, 128)
    );
  console.log("Data Hash:" + sellerHash);
  let collectionPeriod = 600;
  let biddingTime = 60;

  let metadataJSON = sampleMetadata[parseInt(process.env.PORT)];
  metadataJSON.location = getLocation();
  let metadata = JSON.stringify(metadataJSON);

  const unlocked = await web3.personal.unlockAccount(
    beneficiary,
    "welcome123",
    10
  );
  console.log("API_KEY: " + apiKey);

  let factoryInstance = await AuctionFactory.deployed();
  let auction = await factoryInstance.createAuction(
    biddingTime,
    beneficiary,
    collectionPeriod,
    sellerHash,
    metadata,
    apiKey,
    { gas: 1500000, from: beneficiary }
  );
  auctionAddress = auction.logs[0].args.auction;
  return auction;
};

const getAuctions = async (req, res, next) => {
  let factoryInstance = await AuctionFactory.deployed();
  let auction = await factoryInstance.getAuction.call(0);
  req.data = auction;
  next();
};

const getLocation = () => {
  let ifaces = os.networkInterfaces();
  let location = null;

  Object.keys(ifaces).forEach(function(ifname) {
    ifaces[ifname].forEach(function(iface) {
      if ("IPv4" !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      let ip = iface.address;
      location =
        geoip.lookup(ip) || process.env.PORT < 2
          ? geoip.lookup("207.97.227.239")
          : geoip.lookup("65.112.8.132");
      location.zip = location.zip.toString().padStart(5, "0");
      delete location["range"];
      delete location["metro"];
    });
  });

  return location;
};

const withdrawFunds = async () => {
  const interval = 30; // in seconds
  const intervalId = setInterval(attemptWithdraw, 1000 * interval);
  async function attemptWithdraw() {
    if (auctionAddress) {
      let auction = await Auction.at(auctionAddress);
      try {
        await auction.withdrawReward({ from: beneficiary, gas: 1500000 });
        clearInterval(intervalId);
        console.log(
          `${await auction.highestBid.call()} ETH transferred to ${beneficiary}.`
        );
      } catch (error) {
        // console.log("Funds not yet available.");
      }
    }
  }
};

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-access-token"
  );
  next();
});

app.get("/getAuctions", getAuctions, (req, res) => {
  const result = req.data;
  res.send(result);
});

app.get("/things/pi/properties/temperature", (req, res) => {
  if (req.get("x-access-token") !== apiKey) return res.sendStatus(401);
  res.send(sampleTempData);
});

app.get("/things/pi/properties/humidity", (req, res) => {
  if (req.get("x-access-token") !== apiKey) return res.sendStatus(401);
  res.send(sampleHumidityData);
});

app.listen(5000 + parseInt(process.env.PORT), async () => {
  await createAuction();
  withdrawFunds();
  console.log(
    `IoT device listening on port ${5000 + parseInt(process.env.PORT)}!`
  );
});

/*
function createExampleContract() {
	web3.eth.defaultAccount = '0x0Ea55fd4140012e999a0c397DCcf2d2FD46bf112';
    // create contract
    const myContract = new web3.eth.Contract(abi, '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe', {
        gasPrice: '20000000000' // default gas price in wei, 20 gwei in this case
    });

    myContract.deploy({
        data: '0x' + code,
    })
    .send({
        from: '0x0Ea55fd4140012e999a0c397DCcf2d2FD46bf112',
        gas: 1500000,
        gasPrice: '20000000000'
    }, function(error, transactionHash){})
    .on('error', function(error){})
    .on('transactionHash', function(transactionHash){})
    .on('receipt', function(receipt){
       console.log(receipt.contractAddress) // contains the new contract address
    })
    .on('confirmation', function(confirmationNumber, receipt){})
    .then(function(newContractInstance){
        callExampleContract(newContractInstance) // instance with the new contract address
    });

}

function callExampleContract(myContract) {
    var param = 5.7
    // call the contract
    myContract.methods.multiply(param).call()
    .then(console.log);
}
*/
