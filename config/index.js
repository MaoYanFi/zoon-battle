const dotenv = require('dotenv');
const result = dotenv.config();
if (result.error) {
    throw result.error;
}

const address = process.env.address;
if (!address) {
    console.log('Please configure the address in .env file');
}
const privateKey = process.env.private_key;
if (!privateKey) {
    console.log('Please configure the private_key in .env file');
}
//挑战第几个boss, 2代表60%等级那个
let gameIndex = process.env.game_index || 3;
gameIndex = gameIndex - 1;

const loopSeconds = process.env.loop_seconds || 60;

const rpc = process.env.RPC || "https://bsc-dataseed.binance.org/";

const lang = process.env.lang || "zh";

const attackResult = process.env.attack_result || false;

/// 战斗合约合约地址
const zoonBattleContract = "0xf70c08a428f300c7f3e3f09217211d21f7a50410";
/// 基础信息合约地址
const zoonNftContract = "0x8bbe571b381ee58dd8f2335a8f0a5b42e83bdcfa";


const chain_bsc = {
    chainId: 56,
    rpc: rpc,
    gasLimit: 300000,
    gasPrice: "5" + "000000000",
}

const config = {
    address: address,
    privateKey: privateKey,
    chain: chain_bsc,
    zoonBattleContract: zoonBattleContract,
    zoonNftContract: zoonNftContract,
    gameIndex: gameIndex,
    loopSeconds: loopSeconds,
    lang: lang,
    attackResult: attackResult
}

module.exports = config