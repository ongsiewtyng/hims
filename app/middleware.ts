// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getUserRole } from './services/firebase'; // Ensure this function uses admin SDK for server-side

const admin = getAuth();

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const url = request.nextUrl.clone();

    const tokenCookie = request.cookies.get('token');

    if (!tokenCookie) {
        // No token, redirect to login
        url.pathname = '/signin';
        return NextResponse.redirect(url);
    }

    try {
        const decodedToken = await admin.verifyIdToken(tokenCookie.value);
        const role = await getUserRole(decodedToken.uid);

        // Role-based redirection
        if (role === 'Admin') {
            // Admins can access everything
            return NextResponse.next();
        }

        if (role === 'Lecturer') {
            // Restrict access for lecturers
            if (pathname.startsWith('/admin')) {
                url.pathname = '/lecturer/request-form';
                return NextResponse.redirect(url);
            }
        }

        // Redirect unauthorized users
        url.pathname = '/signin';
        return NextResponse.redirect(url);
    } catch (error) {
        console.error('Error verifying token:', error);
        url.pathname = '/signin';
        return NextResponse.redirect(url);
    }
}
