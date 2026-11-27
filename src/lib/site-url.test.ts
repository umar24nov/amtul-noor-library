import assert from "node:assert/strict";
import test from "node:test";
import {
  configuredSiteOrigin,
  LOCAL_SITE_ORIGIN,
  PRODUCTION_SITE_ORIGIN,
} from "./site-url";

test("production metadata never falls back to localhost", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(configuredSiteOrigin("production"), PRODUCTION_SITE_ORIGIN);
    assert.equal(configuredSiteOrigin("development"), LOCAL_SITE_ORIGIN);
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalUrl;
  }
});

test("an explicit site URL wins and loses its trailing slash", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.in/site///";
    assert.equal(configuredSiteOrigin(), "https://example.in/site");
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalUrl;
  }
});
