const config = require('./config');
const Battle = require('./contracts/battle');
const ERC721 = require('./contracts/erc721');
const cache = require('./utils/cache');


var i18n_module = require('i18n-nodejs');
var i18n = new i18n_module(config.lang, './../../locale.json');


function AutoBattle(config) {
    let self = this;
    self.config = config;
    self.battleContract = new Battle(config.chain, config.zoonBattleContract, config.privateKey);
    self.erc721Contract = new ERC721(config.chain, config.zoonNftContract);
}

AutoBattle.prototype.run = async function () {
    let self = this;
    console.log(i18n.__("Current account", { address: self.config.address }));
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
    console.log("============================" + i18n.__("Number of scanning", { times: count }) + "==============================");

    let self = this;

    /// 获取宠物id列表
    let petIds = await self.getPetIds(self.config.address);
    console.log(i18n.__("Number of pets available", { quantity: petIds.length }));
    /// 获取宠物详情
    let pets = await self.getPets(petIds);
    pets = pets.filter(it => it.dna != '0');
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
    let balanceCacheKey = 'pets_balance';
    let balanceCache = cache.get(balanceCacheKey);
    let balanceChanged = balanceCache != balance;
    if (balanceChanged) {
        //console.log('balanceChanged');
        cache.set(balanceCacheKey, balance, 1000000000);
    }

    let petIdsCacheKey = "pets_ids";
    let results = cache.get(petIdsCacheKey);
    // if (results) {
    //     console.log(`cache   ${petIdsCacheKey} : ${results}`);
    // }
    if (!results || balanceChanged) {
        let promises = [];
        for (var i = 0; i < balance; i++) {
            let p = self.erc721Contract.tokenOfOwnerByIndex(address, i);
            promises.push(p);
        }
        results = await Promise.all(promises);
        cache.set(petIdsCacheKey, results, 10 * 60);//用户余额不变的情况下，缓存10分钟的宠物id列表
    }
    return results;
}

/// 获取宠物id列表
AutoBattle.prototype.getPets = async function (petIds) {

    let self = this;
    /// 批量请求宠物详情
    let results = [];
    for (var i = 0; i < petIds.length; i++) {
        let tokenId = petIds[i];
        let petCacheKey = `pet_${tokenId}`;
        let item = cache.get(petCacheKey);
        // if (item) {
        //     console.log(`cache   ${petCacheKey} : ${item}`);
        // }
        if (!item) {
            item = await self.erc721Contract.getZoan(tokenId);
            if (item.dna != '0') {
                cache.set(petCacheKey, item, 3 * 60 * 60);//因为目前只用到宠物的RARE，其实可以永久缓存
            }
        }
        results.push(item);
    }
    return results;
}

AutoBattle.prototype.ownerOf = async function (tokenId) {
    let self = this;
    let result = await self.erc721Contract.ownerOf(tokenId);
    return result
}


AutoBattle.prototype.batchConstructTransactions = async function (pets, petIds) {

    let self = this;
    let waitTimes = [];
    /// 批量获取宠物下次对战的等待时间
    for (var i = 0; i < pets.length; i++) {
        let pet = pets[i];
        let petId = petIds[i];
        let item = await self.getWaitTimeSessionOfPet(pet, petId);
        waitTimes.push(item);
    }
    // console.log("waitTimes:");
    // console.log(waitTimes);
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

    let transactions = [];
    if (models.length > 0) {
        let message = "";
        for (var i = 0; i < models.length; i++) {
            let model = models[i];
            message += i18n.__("Can attack", { petId: model.petId, rareIndex: model.rareIndex })
            let transaction = self.battleContract.battleOfTransaction(model.petId, self.config.gameIndex);
            transactions.push(transaction);
            if (i != models.length - 1) {
                message += "\n";
            }
        }
        console.log(message);
    } else {
        console.log(i18n.__("No pet to attack"));
    }


    return transactions;
}

/// 获取宠物的战斗等待时间
AutoBattle.prototype.getWaitTimeSessionOfPet = async function (pet, petId) {

    let self = this;
    /// 获取宠物品质
    let rare = self.getRare(pet.dna);
    /// 获取宠物下次对战的等待时间
    let results = [];
    for (var i = 0; i < rare; i++) {
        let rareIndex = i + 1;
        let waitTimeSessionCacheKey = `wait_time_session_${petId}_${rareIndex}`;
        let cacheWaitTime = cache.getWithSecondDecrease(waitTimeSessionCacheKey);
        let item = cacheWaitTime;
        // if (item) {
        //     console.log(`cache   ${waitTimeSessionCacheKey} : ${cacheWaitTime}`);
        // }
        if (!item) {
            item = await self.battleContract.waitTimeSession(petId, rareIndex);
            cache.set(waitTimeSessionCacheKey, item, item - 1);
        }
        results.push(item);
    }
    return results;
}

/// 计算宠物品质
AutoBattle.prototype.getRare = function (e) {
    var t = Math.floor(+(null === e || void 0 === e ? void 0 : e.toString()) / Math.pow(10, 26));
    return t > 9999 ? 1 : t > 9707 ? 6 : t > 9359 ? 5 : t > 8706 ? 4 : t > 7836 ? 3 : t > 5224 ? 2 : 1
}


module.exports = AutoBattle;