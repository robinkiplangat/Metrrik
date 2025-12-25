
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is undefined');
        return;
    }

    // Mask password for logging
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    console.log(`Testing connection to: ${maskedUri}`);

    // Test 4: Allow Invalid Certs
    try {
        console.log('\n--- Attempt 4: tlsAllowInvalidCertificates: true ---');
        const client4 = new MongoClient(uri, {
            tls: true,
            tlsAllowInvalidCertificates: true,
            family: 4
        });
        console.log('Connecting...');
        await client4.connect();
        console.log('✅ Success with tlsAllowInvalidCertificates: true');
        await client4.db('admin').command({ ping: 1 });
        console.log('✅ Ping successful');
        await client4.close();
    } catch (err: any) {
        console.error('❌ Failed with tlsAllowInvalidCertificates:', err.message);
    }

    // Test 5: Clean URI
    try {
        const cleanUri = uri.split('?')[0];
        console.log('\n--- Attempt 5: Clean URI (no query params) ---');
        const client5 = new MongoClient(cleanUri, {
            tls: true,
            family: 4
        });
        console.log('Connecting...');
        await client5.connect();
        console.log('✅ Success with clean URI');
        await client5.db('admin').command({ ping: 1 });
        console.log('✅ Ping successful');
        await client5.close();
    } catch (err: any) {
        console.error('❌ Failed with clean URI:', err.message);
    }
}

testConnection().catch(console.error);
