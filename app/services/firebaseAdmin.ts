// app/services/firebaseAdmin.ts

import admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccount = require('/app/services/serviceAccountKey.json'); // Update path to your service account key
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://hims-8187e-default-rtdb.firebaseio.com/"
    });
}

export default admin;
