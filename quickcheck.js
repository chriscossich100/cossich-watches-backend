const pg = require('pg');
const bcrypt = require('bcrypt');

const {Client } = pg;

const client = new Client(
    {
        user: 'postgres',
        host: 'localhost',
        database: 'cossichwatches',
        password: 'Gugu9000!',
        port: 5432,
    }
);

const queryIt = async () => {


    try {
        await client.connect();
        const res = await client.query('SELECT * FROM watches');
        console.log(res.rows);
    } catch (error) {
        console.log(error);
    } finally {
        await client.end();
    }
};

// queryIt();


const hashIt = async () => {

    // const saltRounds = 10;
    // const password = 'Gugu9000!';
    // const hashedPassword = await bcrypt.hash(password, saltRounds);
    // console.log('the hashed password is: ', hashedPassword.length);

    // and now to compare the password:
    // const match = await bcrypt.compare('Gugu9000!', hashedPassword, function(err, result) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         console.log('the passwords were a : ', result);
            
    //     }
    // });

    let specifications = {
        "overview": {
            "reference": "116610LN",
            "case size": "40mm",
            "case height": "9.5mm",
            "lug to lug": "44mm",
            "lug width": "20mm",
            "Water resistance": "300m",
            "movement": "Automatic"
        },
        "case": {
            "case back": "Screw-down",
            "case material": "Stainless steel",
            "crown": "Screw-in",
            "Dial Color": "Black",
            "hands": "Silver polished hands",
            "lume": "Swiss Super-LumiNova",
            "strap / bracelet": "Stainless steel",
            "weight": "155g"
        },
        "movement": {
            "caliber": "3135",
            "power reserve": "48 hours",
            "Fequency": "28,800 vph",
            "functions": "Hours, minutes, seconds, date"
        },
    }

    // let query = {
    //     text: 'UPDATE watches SET specifications = $1 WHERE watch_name = $2',
    //     values: [specifications,'The Twelve']
    // }

    try{
        await client.connect();
        const res = await client.query('UPDATE watches SET specifications = $1 WHERE watch_name = $2', [specifications, 'The Twelve']);
        console.log(res);
    }
    catch(error) {
        console.log('there has been an error: ', error);
    }
    finally {
        await client.end();
    }
    
}

hashIt();