const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const retry = require('bluebird-retry');
const retryPromise = require('bluebird');

const zoonAbi = require('./abi/Zoon.json');
const config = require('../config');

var i18n_module = require('i18n-nodejs');
var i18n = new i18n_module(config.lang, './../../locale.json');

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
    console.log(i18n.__("Pets list", {itemId: itemId, index: index}));
    let sendResult = await self.tokenContract.methods.battle(itemId, index).send(options);
    return sendResult;
}

Battle.prototype.battleOfTransaction = function (itemId, index) {
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
        data: data
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
    let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    for(let i=0; i<transactions.length; i++) {
        try {
            let transaction = transactions[i];
            let result = await self.sendTransactionAndRetry(transaction, i);
            console.log(i18n.__("Transaction successfully", {current: i+1, trxID: result}));

            //  如果交易处于pending状态，则返回null.
  
            for(let j=0; j<10; j++) {
                let logs = await self.getTransactionReceipt(result);
                if (logs != null) {
                    let log = self.decodeLog(logs['logs'][2]['data']);

                    let res = log['result'] == '0' ? 'Lose' : 'Win';

                    let reward = self.web3.utils.fromWei(log['reward']);

                    let exp = (parseInt(log['exp']) / 100).toFixed(2);

                    console.log( i18n.__("Attack result", {result: i18n.__(res), reward: reward, exp: exp }) );

                    break;
                }

                await wait(1000);
            }

            await wait(3000);
        } catch(err) {
            console.log(i18n.__("Transaction failed", {current: i+1, err: err}));
        }
    }
}



Battle.prototype.retryRequest = async function (request) {
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

Battle.prototype.sendTransactionAndRetry = async function (transaction, index) {
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

Battle.prototype.sendTransaction = async function (transaction, index) {
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

Battle.prototype.battleSessionsTime = async function (tokenId, rare) {
    let self = this;
    let result = await self.tokenContract.methods.battleSessionsTime(tokenId, rare).call();
    return result;
}

///
Battle.prototype.waitTimeSession = async function (tokenId, rare) {
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


Battle.prototype.getTransactionReceipt = async function (transaction) {
    let self = this;
    return new Promise((resolve, reject) => {
        self.web3.eth.getTransactionReceipt(transaction, function (error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}


Battle.prototype.decodeLog = function (data) {
    let self = this;
    return self.web3.eth.abi.decodeLog([ {
        "name": "tokenId",
        "type": "uint256"
    }, {
        "name": "monster",
        "type": "uint8"
    }, {
        "name": "result",
        "type": "uint8"
    }, {
        "name": "reward",
        "type": "uint256"
    }, {
        "name": "exp",
        "type": "uint256"
    }], data ,['0x22020c10ce04134fcde4cba3315ea35a2653b8eb84fb95cb72b94c10f0d236b5','0x000000000000000000000000685905ed3dbe7f962ff4a3456fc4383d5cbda91e']);
}

module.exports = Battle;