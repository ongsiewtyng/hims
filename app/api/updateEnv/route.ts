import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { email, appPassword } = await req.json();

        // Path to the .env.local file
        const envPath = path.resolve(process.cwd(), '.env.local');

        // Read the current .env.local file
        let envContent = fs.readFileSync(envPath, 'utf-8');

        // Update the environment variables
        envContent = envContent.replace(/EMAIL_USER=.*/, `EMAIL_USER=${email}`);
        envContent = envContent.replace(/EMAIL_PASS=.*/, `EMAIL_PASS=${appPassword}`);

        // Write the updated content back to the .env.local file
        fs.writeFileSync(envPath, envContent);

        return NextResponse.json({ message: 'Environment configuration updated successfully!' });
    } catch (error) {
        return NextResponse.json(
            { message: 'Failed to update environment configuration!', error: error.message },
            { status: 500 }
        );
    }
}
