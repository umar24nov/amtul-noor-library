#!/usr/bin/env node
/**
 * Checks that the routes which must answer after a deploy really do.
 *
 * The private screens are behind the sign-in, so an anonymous visit is
 * expected to be sent to /login rather than to answer 200. A page that answers
 * 200 without a session would be a hole, so the redirect is checked too.
 *
 *   node scripts/check-routes.mjs [base-url]
 *
 * The exit code is 1 when any route is not what it should be.
 */

const base = (process.argv[2] ?? process.env.SITE_URL ?? "https://www.amtulnoorlibrary.site")
  .replace(/\/+$/, "");

const routes = [
  { path: "/", expect: "ok" },
  { path: "/login", expect: "ok" },
  { path: "/join", expect: "ok" },
  { path: "/support", expect: "ok" },
  { path: "/opengraph-image", expect: "ok" },
  { path: "/dashboard", expect: "login" },
  { path: "/users", expect: "login" },
  { path: "/members", expect: "login" },
  { path: "/payments", expect: "login" },
];

let failed = 0;

for (const route of routes) {
  const url = `${base}${route.path}`;
  let status = 0;
  let location = "";
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": "amtul-noor-library-route-check" },
    });
    status = response.status;
    location = response.headers.get("location") ?? "";
  } catch (error) {
    console.log(`FAIL ${route.path} ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
    continue;
  }

  if (route.expect === "ok") {
    if (status === 200) {
      console.log(`ok   ${route.path} 200`);
    } else {
      console.log(`FAIL ${route.path} expected 200, got ${status}`);
      failed += 1;
    }
    continue;
  }

  const sentToLogin = status >= 300 && status < 400 && location.includes("/login");
  if (sentToLogin) {
    console.log(`ok   ${route.path} ${status} -> ${location}`);
  } else {
    console.log(`FAIL ${route.path} expected a redirect to /login, got ${status}`);
    failed += 1;
  }
}

console.log("");
console.log(failed === 0 ? `All ${routes.length} routes answered as expected.` : `${failed} route(s) did not.`);

process.exit(failed === 0 ? 0 : 1);
