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

        // Update Vercel environment variables
        const token = process.env.VERCEL_API_TOKEN;
        const projectId = process.env.VERCEL_PROJECT_ID;

        const envVars = [
            { key: 'EMAIL_USER', value: email, target: ['production'], type: 'plain' },
            { key: 'EMAIL_PASS', value: appPassword, target: ['production'], type: 'plain' },
        ];

        for (const envVar of envVars) {
            // Check if the environment variable already exists
            const existingEnvVarResponse = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env?key=${envVar.key}&target=production`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const existingEnvVar = await existingEnvVarResponse.json();

            if (existingEnvVar.length > 0) {
                // Delete the existing environment variable
                const deleteResponse = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env/${existingEnvVar[0].id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!deleteResponse.ok) {
                    const errorText = await deleteResponse.text();
                    console.error(`Failed to delete ${envVar.key}: ${errorText}`);
                    throw new Error(`Failed to delete ${envVar.key}: ${errorText}`);
                }
            }

            // Create a new environment variable
            const createResponse = await fetch(`https://api.vercel.com/v8/projects/${projectId}/env`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(envVar),
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error(`Failed to create ${envVar.key}: ${errorText}`);
                throw new Error(`Failed to create ${envVar.key}: ${errorText}`);
            }
        }

        return NextResponse.json({ message: 'Environment configuration updated successfully!' });
    } catch (error) {
        console.error('Error updating environment configuration:', error);
        return NextResponse.json(
            { message: 'Failed to update environment configuration!', error: error.message },
            { status: 500 }
        );
    }
}