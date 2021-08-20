const config = require('./config');
const Battle = require('./contracts/battle');
const ERC721 = require('./contracts/erc721');


function AutoBattle(config) {
    let self = this;
    self.config = config;
    self.battleContract = new Battle(config.chain, config.zoonBattleContract, config.privateKey);
    self.erc721Contract = new ERC721(config.chain, config.zoonNftContract);
}

AutoBattle.prototype.run = async function () {
    let self = this;
    console.log("ZOON自动Battle脚本启动，当前账号: " + self.config.address);
    let timeOut = config.loopSeconds * 1000;
    let count = 1;
    (function iterator() {
        self.runThis(count).then(() => {
            setTimeout(() => {
                count++;
                iterator();
            }, timeOut);
        }).catch((err) => {
            console.log(`error: ${err.message}`);
            console.log(err);
            setTimeout(() => {
                count++;
                iterator();
            }, timeOut);
        })
    })();
}

AutoBattle.prototype.runThis = async function (count) {
    console.log("============================程序开始第" + count + "次扫描==============================");
    let self = this;
    /// 获取宠物id列表
    let petIds = await self.getPetIds(self.config.address);
    /// 获取宠物详情
    let pets = await self.getPets(petIds);
    /// 批量组装battle交易
    let transactions = await self.batchConstructTransactions(pets, petIds);
    /// 批量发送交易
    await self.battleContract.queueTransactions(transactions);
}

/// 获取宠物id列表
AutoBattle.prototype.getPetIds = async function (address) {

    let self = this;
    /// 获取当前账号有几个NFT
    let balance = await self.erc721Contract.balanceOf(address);
    let promises = [];
    for (var i = 0; i < balance; i++) {
        let item = self.erc721Contract.tokenOfOwnerByIndex(address, i);
        promises.push(item);
    }
    let results = await Promise.all(promises);
    return results;
}

/// 获取宠物id列表
AutoBattle.prototype.getPets = async function (petIds) {

    let self = this;
    /// 批量请求宠物详情
    let promises = [];
    for (var i = 0; i < petIds.length; i++) {
        let tokenId = petIds[i];
        let item = self.erc721Contract.getZoan(tokenId);
        promises.push(item);
    }
    let results = await Promise.all(promises);
    return results;
}


AutoBattle.prototype.getZoan = async function (tokenId) {
    let self = this;
    let result = await self.erc721Contract.getZoan(tokenId);
    return result
}

AutoBattle.prototype.ownerOf = async function (tokenId) {
    let self = this;
    let result = await self.erc721Contract.ownerOf(tokenId);
    return result
}


AutoBattle.prototype.batchConstructTransactions = async function (pets, petIds) {

    let self = this;
    let promises = [];
    /// 批量获取宠物下次对战的等待时间
    for (var i = 0; i < pets.length; i++) {
        let pet = pets[i];
        let petId = petIds[i];
        let item = self.getWaitTimeSessionOfPet(pet, petId);
        promises.push(item);
    }
    let waitTimes = await Promise.all(promises);
    /// 筛选可以攻击的pet
    let models = [];
    for (var j = 0; j < waitTimes.length; j++) {
        let waitTimeItem = waitTimes[j];
        let petId = petIds[j];
        for (var k = 0; k < waitTimeItem.length; k++) {
            let time = waitTimeItem[k];
            if (time <= 0) {
                let rareIndex = k + 1;
                let model = {
                    petId: petId,
                    rareIndex: rareIndex
                };
                models.push(model);
            }

        }
    }
    /// 获取nonce,组装交易
    let transactionCount = await self.battleContract.getTransactionCount();
    let transactions = [];
    if (models.length > 0) {
        let message = "";
        for (var i = 0; i < models.length; i++) {
            let model = models[i];
            message = message + "宠物id:" + model.petId + ", rareIndex:" + model.rareIndex + "可以进行攻击";
            let transaction = self.battleContract.battleOfTransaction(model.petId, self.config.gameIndex, transactionCount);
            transactions.push(transaction);
            transactionCount++;
            if (i != models.length - 1) {
                message += "\n";
            }
        }
        console.log(message);
    } else {
        console.log("当前无宠物需要攻击");
    }


    return transactions;
}

/// 获取宠物的战斗等待时间
AutoBattle.prototype.getWaitTimeSessionOfPet = async function (pet, petId) {

    let self = this;
    /// 获取宠物品质
    let rare = self.getRare(pet.dna);
    /// 获取宠物下次对战的等待时间
    let promises = [];
    for (var i = 0; i < rare; i++) {
        let rareIndex = i + 1;
        let item = self.battleContract.waitTimeSession(petId, rareIndex);
        promises.push(item);
    }
    let results = await Promise.all(promises);
    return results;
}

/// 计算宠物品质
AutoBattle.prototype.getRare = function (e) {
    var t = Math.floor(+(null === e || void 0 === e ? void 0 : e.toString()) / Math.pow(10, 26));
    return t > 9999 ? 1 : t > 9707 ? 6 : t > 9359 ? 5 : t > 8706 ? 4 : t > 7836 ? 3 : t > 5224 ? 2 : 1
}


module.exports = AutoBattle;