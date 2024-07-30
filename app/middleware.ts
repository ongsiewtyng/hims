// middleware/roleBasedRedirect.js
import { NextResponse } from "next/server";
import { getAuth } from "firebase/auth";
import { getUserRole, database} from "./services/firebase";

export async function middleware(req) {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
        const role = await getUserRole(user.uid);

        const url = req.nextUrl.clone();
        if (role === "admin" && !url.pathname.startsWith("/admin")) {
            url.pathname = "/admin";
            return NextResponse.redirect(url);
        } else if (role === "lecturer" && !url.pathname.startsWith("/lecturer")) {
            url.pathname = "/lecturer";
            return NextResponse.redirect(url);
        }
    } else {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/lecturer/:path*", "/anotherRole/:path*"],
};
