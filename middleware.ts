// app/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const url = req.nextUrl.clone();
    const tokenCookie = req.cookies.get('token'); // Get the token from cookies

    if (!tokenCookie) {
        console.log('No token found. Redirecting to sign-in page.');
        url.pathname = '/sign-in';
        return NextResponse.redirect(url);
    }

    const token = tokenCookie.value; // Extract the value from the RequestCookie object

    // Call the API route to verify the token
    const res = await fetch(`${req.nextUrl.origin}/api/verifyToken`, {
        method: 'POST',
        body: JSON.stringify({ token }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await res.json();

    if (res.status !== 200) {
        console.error('Error verifying token or fetching user role:', data.error);
        url.pathname = '/sign-in';
        return NextResponse.redirect(url);
    }

    // Role-based routing logic
    const { role } = data;

    if (role === 'Admin' && !url.pathname.startsWith('/admin')) {
        console.log('Admin trying to access non-admin page. Redirecting to /admin/home.');
        url.pathname = '/admin/home';
        return NextResponse.redirect(url);
    }

    if (role === 'Lecturer' && !url.pathname.startsWith('/lecturer')) {
        console.log('Lecturer trying to access non-lecturer page. Redirecting to /lecturer/request-form.');
        url.pathname = '/lecturer/request-form';
        return NextResponse.redirect(url);
    }

    console.log(`Access allowed for ${role} on path: ${url.pathname}`);
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/lecturer/:path*'],
};
