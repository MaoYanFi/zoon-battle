const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const retry = require('bluebird-retry');
const retryPromise = require('bluebird');

const zoonAbi = require('./abi/Zoon.json');
const config = require('../config');


function Battle(chain, contractAddress, privateKey) {

    let self = this;

    self.web3 = new Web3(chain.rpc);
    self.chain = chain;
    self.contractAddress = contractAddress;

    self.tokenContract = new self.web3.eth.Contract(zoonAbi, contractAddress);

    if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
    }
    let account = self.web3.eth.accounts.privateKeyToAccount(privateKey);
    self.web3.eth.accounts.wallet.add(account);
    self.web3.eth.defaultAccount = account.address;
}

Battle.prototype.battle = async function (itemId, index) {
    let self = this;
    let owner = self.web3.eth.defaultAccount;
    let options = {
        from: owner,
        gas: self.chain.gasLimit,
        gasPrice: self.chain.gasPrice,
        value: 0
    }
    console.log("itemId: "+ itemId + ", index:" +index);
    let sendResult = await self.tokenContract.methods.battle(itemId, index).send(options);
    return sendResult;
}

Battle.prototype.battleOfTransaction = function (itemId, index, nonce) {
    let self = this;
    let data = self.web3.eth.abi.encodeFunctionCall({
        name: 'battle',
        type: 'function',
        inputs: [{
            "name": "_id",
            "type": "uint256"
        }, {
            "name": "_index",
            "type": "uint8"
        }]
    }, [itemId.toString(), index.toString()]);
    
    let owner = self.web3.eth.defaultAccount;
    let transaction = {
        from: owner,
        to: self.contractAddress,
        gas: self.chain.gasLimit,
        gasPrice: self.chain.gasPrice,
        value: 0,
        data: data,
        nonce: nonce
    };
    return transaction;
}

Battle.prototype.getTransactionCount = async function () {
    let self = this;
    let owner = self.web3.eth.defaultAccount;
    let transactionCount = await self.retryRequest(() => {
        return new Promise((resolve, reject) => {
            self.web3.eth.getTransactionCount(owner).then(function (result) {
                resolve(result);
            }).catch(function (error) {
                reject(error);
            });
        });
    });
    return transactionCount;
}

/// 线性发送交易
Battle.prototype.queueTransactions = async function (transactions) {
    let self = this;
    let current = -1;
    let handled = -1;
    const intervalObj = setInterval(async () => {
        if (handled == transactions.length - 1) {
            clearInterval(intervalObj);
            return;
        }
        if (current == handled) {
            current++;
            let transaction = transactions[current];
            try {
                let result = await self.sendTransactionAndRetry(transaction, current);
                console.log("第"+current+"个交易发送成功: "+result);
                handled++;
            } catch (e) {
                console.log("第"+current+"个交易发送失败: "+e);
                handled++;
            }

        }
    }, 3000);
}

Battle.prototype.retryRequest = async function(request) {
    let self = this;
    return new Promise((resolve, reject) => {
        /// 重试3次
        retry(() => {
            return request();
        }, { max_tries: 5, interval: 3000 }).then(function (result) {
            resolve(result);
        }).catch(function (error) {
            reject(error);
        });
    });

}

Battle.prototype.sendTransactionAndRetry = async function(transaction, index) {
    let self = this;
    let i = 0;
    return new Promise((resolve, reject) => {
        /// 重试3次
        retry(() => {
            return self.sendTransaction(transaction, index);
        }, { max_tries: 5, interval: 3000 }).then(function (result) {
            resolve(result);
        }).catch(function (error) {
            reject(error);
        });
    });
}

Battle.prototype.sendTransaction = async function(transaction, index) {
    let self = this;
    return new Promise((resolve, reject) => {
        self.web3.eth.sendTransaction(transaction, function (error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

Battle.prototype.battleSessionsTime = async function(tokenId, rare) {
    let self = this;
    let result = await self.tokenContract.methods.battleSessionsTime(tokenId, rare).call();
    return result;
}

///
Battle.prototype.waitTimeSession = async function(tokenId, rare) {
    let self = this;
    return new Promise((resolve, reject) => {
        /// 重试3次
        retry(() => {
            return self.tokenContract.methods.waitTimeSession(tokenId, rare).call();
        }, { max_tries: 5, interval: 3000 }).then(function (result) {
            resolve(result);
        }).catch(function (error) {
            reject(error);
        });
    });
}

/// 对应NFT已经挑战过几次怪物
Battle.prototype.battleTimes = async function (tokenId) {
    let self = this;
    let result = await self.tokenContract.methods.battleTimes(tokenId).call();
    return result;
}

/// 对应稀有度能挑战多少次怪物
Battle.prototype.getLimitRateRare = async function (rare) {
    let self = this;
    let result = await self.tokenContract.methods.getLimitRateRare(rare).call();
    return result;
}

module.exports = Battle;