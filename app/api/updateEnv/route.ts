import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { email, appPassword } = await req.json();

        console.log('Starting Vercel Environment Variable Update Process');

        const VERCEL_API_URL = `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env`;
        const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
        const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

        if (!VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
            console.error('Missing Vercel API credentials');
            return NextResponse.json(
                { message: 'Missing Vercel API credentials' },
                { status: 500 }
            );
        }

        // Prepare team ID query parameter
        const teamIdParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';

        // First, list existing environment variables
        const listEnvResponse = await fetch(
            `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env${teamIdParam}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
                }
            }
        );

        if (!listEnvResponse.ok) {
            console.error('Failed to list environment variables', await listEnvResponse.text());
            return NextResponse.json(
                { message: 'Failed to list environment variables' },
                { status: 500 }
            );
        }

        const existingEnv = await listEnvResponse.json();
        console.log('Existing Environment Variables:', JSON.stringify(existingEnv, null, 2));

        // Prepare update requests
        const updateRequests = [];

        // Helper function to update or create environment variable
        const updateOrCreateEnvVar = async (key: string, value: string) => {
            // Find existing variable
            const existingVar = existingEnv.envs.find((env : any) =>
                env.key === key &&
                env.target.includes('production') &&
                env.target.includes('preview') &&
                env.target.includes('development')
            );

            if (existingVar) {
                // Update existing variable
                console.log(`Updating existing ${key} environment variable`);
                const updateResponse = await fetch(
                    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env/${existingVar.id}${teamIdParam}`,
                    {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${VERCEL_API_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            value: value,
                            type: 'encrypted',
                            target: ['production', 'preview', 'development']
                        })
                    }
                );

                if (!updateResponse.ok) {
                    console.error(`Failed to update ${key}:`, await updateResponse.text());
                }
                return updateResponse;
            } else {
                // Create new variable
                console.log(`Creating new ${key} environment variable`);
                const createResponse = await fetch(
                    `${VERCEL_API_URL}${teamIdParam}`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${VERCEL_API_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            key: key,
                            value: value,
                            type: 'encrypted',
                            target: ['production', 'preview', 'development']
                        })
                    }
                );

                if (!createResponse.ok) {
                    console.error(`Failed to create ${key}:`, await createResponse.text());
                }
                return createResponse;
            }
        };

        // Update or create EMAIL_USER and EMAIL_PASS
        const emailUserResponse = await updateOrCreateEnvVar('EMAIL_USER', email);
        const emailPassResponse = await updateOrCreateEnvVar('EMAIL_PASS', appPassword);

        // Check if both operations were successful
        if (!emailUserResponse.ok || !emailPassResponse.ok) {
            return NextResponse.json(
                {
                    message: 'Failed to update environment variables',
                    emailUserStatus: emailUserResponse.status,
                    emailPassStatus: emailPassResponse.status
                },
                { status: 500 }
            );
        }

        console.log('Environment variables updated successfully');
        return NextResponse.json({ message: 'Environment variables updated successfully in Vercel!' });
    } catch (error) {
        console.error('Unexpected error during environment variable update:', error);
        return NextResponse.json(
            { message: 'Failed to update environment variables', error: error.message },
            { status: 500 }
        );
    }
}