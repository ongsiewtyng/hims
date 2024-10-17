// app/api/verifyToken/route.ts

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import {getUserRole} from "../../services/firebase";

if (!admin.apps.length) {
    const serviceAccount = require('/app/services/serviceAccountKey.json'); // Update path to your service account key
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://hims-8187e-default-rtdb.firebaseio.com/"
    });
}

export async function POST(req: Request) {
    const { token } = await req.json();

    if (!token) {
        return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    try {
        // Verify the token using Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        // Here you can fetch the user's role or do any other processing
        const userRole = await getUserRole(uid); // Make sure getUserRole is defined correctly

        return NextResponse.json({ uid, role: userRole });
    } catch (error) {
        console.error('Error verifying token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }
}
