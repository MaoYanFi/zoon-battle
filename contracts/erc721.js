const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const retry = require('bluebird-retry');
const retryPromise = require('bluebird');

const erc721Abi = require('./abi/ERC721.json');
const config = require('../config');


function ERC721(chain, contractAddress) {

    let self = this;

    self.web3 = new Web3(chain.rpc);
    self.chain = chain;
    self.contractAddress = contractAddress;

    self.tokenContract = new self.web3.eth.Contract(erc721Abi, contractAddress);
}

ERC721.prototype.balanceOf = async function (address) {

    let self = this;
    return new Promise((resolve, reject) => {
        /// 重试3次
        retry(() => {
            return self.tokenContract.methods.balanceOf(address).call();
        }, { max_tries: 5, interval: 3000 }).then(function (result) {
            resolve(result);
        }).catch(function (error) {
            reject(error);
        });
    });
}

ERC721.prototype.tokenURI = async function (tokenId) {
    let self = this;
    let result = await self.tokenContract.methods.tokenURI(tokenId).call();
    return result;
}

ERC721.prototype.ownerOf = async function (tokenId) {
    let self = this;
    return new Promise((resolve, reject) => {
        /// 重试3次
        retry(() => {
            return self.tokenContract.methods.ownerOf(tokenId).call();
        }, { max_tries: 5, interval: 3000 }).then(function (result) {
            resolve(result);
        }).catch(function (error) {
            reject(error);
        });
    });

}

ERC721.prototype.getZoan = async function (tokenId) {
    let self = this;
    return new Promise((resolve, reject) => {
        /// 重试3次
        retry(() => {
            return self.tokenContract.methods.getZoan(tokenId).call();
        }, { max_tries: 5, interval: 3000 }).then(function (result) {
            resolve(result);
        }).catch(function (error) {
            reject(error);
        });
    });
}

ERC721.prototype.tokenOfOwnerByIndex = function (address, index) {
    let self = this;
    return new Promise((resolve, reject) => {
        /// 重试3次
        retry(() => {
            return self.tokenContract.methods.tokenOfOwnerByIndex(address, index).call();
        }, { max_tries: 5, interval: 3000 }).then(function (result) {
            resolve(result);
        }).catch(function (error) {
            reject(error);
        });
    });

}




module.exports = ERC721;