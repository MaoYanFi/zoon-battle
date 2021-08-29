const dotenv = require('dotenv');
const Web3 = require('web3');
const web3 = new Web3();
const result = dotenv.config();
if (result.error) {
    throw result.error;
}
var readlineSync = require('readline-sync');

let address = process.env.address;
let privateKey = process.env.private_key;

while (!privateKey) {
    try {
        privateKey = readlineSync.question('Please enter your private key (empty to exit): ', {
            keyInSelect: true,
            hideEchoBack: true // The typed text on screen is hidden by `*` (default).
        });
        if (!privateKey) {
            process.exit(0);
        }
        let account = web3.eth.accounts.privateKeyToAccount(privateKey);
        address = account.address.toLowerCase();
    } catch (err) {
        console.log('Private key Wrong: ' + err.message);
        privateKey = "";
    }
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