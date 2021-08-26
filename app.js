const dotenv = require('dotenv');
const result = dotenv.config();
if (result.error) {
    throw result.error;
}

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

const config = require('./config');

const AutoBattle = require('./auto_battle');


const autoBattle = new AutoBattle(config);
autoBattle.run();


