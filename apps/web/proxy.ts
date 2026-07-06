import { NextResponse, type NextRequest } from "next/server";
import { roleAtLeast } from "@magz/core";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

const privatePrefixes = ["/workspace", "/dashboard", "/assistant", "/modules", "/admin"];
const authPages = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (authPages.includes(pathname) && session) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (!privatePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !roleAtLeast(session.role, "ADMIN")) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"]
};
