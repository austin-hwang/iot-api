import express from 'express';
import { default as Web3 } from 'web3';
import { default as contract } from "truffle-contract";
import sha256 from 'js-sha256';
import hat from 'hat';
import geoip from 'geoip-lite';
import os from 'os';

import auction from "./build/contracts/dataAuction.json";
import auctionFactory from "./build/contracts/AuctionFactory.json"
import sampleMetadata from "./sampleMetadata.json";
import tempData from './temperature.json';
import humidityData from './humidity.json';

const app = express();
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const Auction = contract(auction);
Auction.setProvider(web3.currentProvider);
const AuctionFactory = contract(auctionFactory);
AuctionFactory.setProvider(web3.currentProvider);
const apiKey = hat()

const createAuction = async () => {
  let beneficiary = web3.eth.accounts[0];
  let sellerHash = '0x' + sha256('12345678910');
  let collectionPeriod = 600;
  let biddingTime = 600;

  let metadataJSON = sampleMetadata[0];
  metadataJSON.location = getLocation();
  let metadata = JSON.stringify(metadataJSON);

  const unlocked = await web3.personal.unlockAccount(beneficiary, '8580894a8e77c96c0132be3d766d87e3723111360e6b89dbd6408190b272b248', 10);
  console.log("API_KEY: " + apiKey);

  let factoryInstance = await AuctionFactory.deployed();
  let auction = await factoryInstance.createAuction(biddingTime, beneficiary, collectionPeriod, sellerHash, metadata, apiKey, { gas: 1500000, from: beneficiary });
  return auction;
};

const getAuctions = async (req,res,next) => {
  let factoryInstance = await AuctionFactory.deployed();
  let auction = await factoryInstance.getAuction.call(0);
  req.data = auction;
  next();
};

const getLocation = () => {
  let ifaces = os.networkInterfaces();
  let location = null;

  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      let ip = iface.address;
      location = geoip.lookup(ip) || geoip.lookup('207.97.227.239');
    });
  });

  return location;
}

app.get('/getAuctions', getAuctions, (req, res) => {
  const result = req.data;
  res.send(result);
});

app.get('/things/pi/properties/temperature', (req, res) => {
  if (req.get('x-access-token') !== apiKey)
    return res.sendStatus(401);
  res.send(tempData)
})

app.get('/things/pi/properties/humidity', (req, res) => {
  if (req.get('x-access-token') !== apiKey)
    return res.sendStatus(401);
  res.send(humidityData)
})


app.listen(5000, async () => {
    await createAuction();
    console.log('IoT device listening on port 5000!')
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