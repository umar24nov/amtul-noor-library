import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const SECRET = "test-auth-secret-that-is-long-enough-for-hs256";
process.env.AUTH_SECRET = SECRET;

async function signedCookie(): Promise<string> {
  const token = await new SignJWT({
    email: "admin@amtulnoorlibrary.com",
    userId: 5,
    roleId: 1,
    level: "ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRET));
  return `anl_session=${token}`;
}

test("a stale signed cookie still lets /login render", async () => {
  const request = new NextRequest("https://www.amtulnoorlibrary.in/login", {
    headers: { cookie: await signedCookie() },
  });

  const response = await proxy(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("the forgotten-password page is reachable without a session", async () => {
  const request = new NextRequest(
    "https://www.amtulnoorlibrary.in/forgot-password?next=%2Fdashboard",
  );

  const response = await proxy(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("a visitor without a cookie is sent to /login", async () => {
  const request = new NextRequest("https://www.amtulnoorlibrary.in/dashboard");

  const response = await proxy(request);

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location")!);
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/dashboard");
});
