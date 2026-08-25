import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER ? process.env.DB_SERVER.split(',')[0] : 'localhost',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_SERVER?.split(',')[1] || '1433'),
    options: {
        encrypt: false, // Set to true for azure
        trustServerCertificate: true,
    },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getDbPool() {
    if (poolPromise) {
        return poolPromise;
    }

    poolPromise = new sql.ConnectionPool(config)
        .connect()
        .then(pool => {
            console.log('Connected to SQL Server');
            return pool;
        })
        .catch(err => {
            poolPromise = null;
            console.error('Database Connection Failed! Bad Config: ', err);
            throw err;
        });

    return poolPromise;
}

export { sql };
