const dotenv = require('dotenv');
const result = dotenv.config();
if (result.error) {
    throw result.error;
}

const config = require('./config');

const AutoBattle = require('./auto_battle');


const autoBattle = new AutoBattle(config);
autoBattle.run();


