//here we will get the connection to the db:


const pg = require('pg');

const {Client, Pool } = pg;

// const client = new Client(
//     {
//         user: 'postgres',
//         host: 'localhost',
//         database: 'cossichwatches',
//         password: 'Gugu9000!',
//         port: 5432,
//     }
//);
const pool = new Pool(
    {
        user: 'postgres',
        host: 'localhost',
        database: 'cossichwatches',
        password: 'Gugu9000!',
        port: 5432,
    }
);

module.exports = pool;