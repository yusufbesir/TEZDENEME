// İnternet erişimi katmanı güvenlik denetimleri testleri (D8c-2a). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
// Saf işlevler: ağ yok.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hostAllowed, isBlockedAddress, normalizeDomainPattern, parseTarget } from "./guard.ts";

test("IPv4: every private, local and reserved range is blocked at its boundary addresses; neighbours outside are public", () => {
  const blocked = [
    "0.0.0.0", "0.255.255.255", "10.0.0.0", "10.255.255.255", "100.64.0.0", "100.127.255.255", "127.0.0.1", "127.255.255.255", "169.254.0.0", "169.254.169.254", "169.254.255.255",
    "172.16.0.0", "172.31.255.255", "192.0.0.0", "192.0.0.255", "192.0.2.1", "192.88.99.1", "192.168.0.0", "192.168.255.255", "198.18.0.0", "198.19.255.255", "198.51.100.7", "203.0.113.9",
    "224.0.0.0", "239.255.255.255", "240.0.0.1", "255.255.255.255",
  ];
  for (const a of blocked) assert.equal(isBlockedAddress(a), true, a);
  const open = ["9.255.255.255", "11.0.0.0", "100.63.255.255", "100.128.0.0", "126.255.255.255", "128.0.0.1", "169.253.255.255", "169.255.0.0", "172.15.255.255", "172.32.0.0", "192.0.1.1", "192.169.0.0", "198.17.255.255", "198.20.0.0", "223.255.255.255", "93.184.216.34", "8.8.8.8"];
  for (const a of open) assert.equal(isBlockedAddress(a), false, a);
});

test("IPv6: loopback, unspecified, ULA, link-local, multicast, mapped/NAT64/6to4 with private IPv4, documentation are blocked; global unicast passes", () => {
  const blocked = [
    "::1", "::", "fc00::1", "fdff:ffff::1", "fe80::1", "febf::1", "fec0::1", "ff00::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.1.2.3", "::ffff:169.254.169.254", "::ffff:a9fe:a9fe", "::ffff:192.168.1.1", "::ffff:0:0",
    "64:ff9b::7f00:1", "64:ff9b::a00:1", "64:ff9b::169.254.169.254", "64:ff9b:1::1",
    "2002:7f00:1::1", "2002:a00:1::", "2002:c0a8:101::1", "2002:a9fe:a9fe::1",
    "2001:db8::1", "2001:db8:ffff::1", "2001::1", "2001:2::1", "2001:10::1", "3fff::1", "::7f00:1", "0:0:0:0:0:0:0:1", "[::1]", "fe80::1%eth0", "5f00::1", "100::1",
  ];
  for (const a of blocked) assert.equal(isBlockedAddress(a), true, a);
  const open = ["2606:4700:4700::1111", "2a00:1450:4001:81b::200e", "2001:4860:4860::8888", "::ffff:8.8.8.8", "64:ff9b::808:808", "2002:808:808::1", "2001:200::1"];
  for (const a of open) assert.equal(isBlockedAddress(a), false, a);
});

test("unparseable address text is blocked (fail closed)", () => {
  for (const a of ["", "abc", "1.2.3", "1.2.3.4.5", "256.1.1.1", "010.0.0.1", "1.2.3.4/8", "gggg::1", "1:2:3:4:5:6:7:8:9"]) assert.equal(isBlockedAddress(a), true, a);
});

test("URL: IP-literal in every notation, userinfo, bad scheme, ports, length and control characters are refused before any network use", () => {
  const cases: Array<[string, string]> = [
    ["http://2130706433/", "ip_literal"],
    ["http://0x7f.1/", "ip_literal"],
    ["http://017700000001/", "ip_literal"],
    ["http://127.1/", "ip_literal"],
    ["http://0177.0.0.1/", "ip_literal"],
    ["http://[::1]/", "ip_literal"],
    ["http://[::ffff:127.0.0.1]/", "ip_literal"],
    ["http://[::ffff:7f00:1]/", "ip_literal"],
    ["https://8.8.8.8/", "ip_literal"],
    ["https://169.254.169.254/latest/meta-data", "ip_literal"],
    ["https://user@example.com/", "credentials_in_url"],
    ["https://user:pass@example.com/", "credentials_in_url"],
    ["https://:pw@example.com/", "credentials_in_url"],
    ["ftp://example.com/", "scheme_not_allowed"],
    ["file:///etc/passwd", "scheme_not_allowed"],
    ["javascript:alert(1)", "scheme_not_allowed"],
    ["https://example.com:8443/", "port_not_allowed"],
    ["http://example.com:443/", "port_not_allowed"],
    ["https://example.com:80/", "port_not_allowed"],
    ["https://exa mple.com/", "invalid_url"],
    ["https://example.com/a\nb", "invalid_url"],
    ["not a url", "invalid_url"],
    ["", "invalid_url"],
    [`https://example.com/${"a".repeat(2000)}`, "url_too_long"],
    ["https://example.com./", "invalid_url"],
  ];
  for (const [u, code] of cases) {
    const r = parseTarget(u);
    assert.equal(r.ok, false, u);
    if (!r.ok) assert.equal(r.code, code, u);
  }
});

test("URL: valid forms pass, default ports are accepted, the fragment is dropped, the host is lower-cased and punycoded", () => {
  const a = parseTarget("HTTPS://Example.COM:443/Yol?x=1#parca");
  assert.ok(a.ok);
  if (a.ok) {
    assert.equal(a.host, "example.com");
    assert.equal(a.url.href, "https://example.com/Yol?x=1");
  }
  const b = parseTarget("http://example.com:80/");
  assert.ok(b.ok);
  const c = parseTarget("https://bücher.example.com/");
  assert.ok(c.ok);
  if (c.ok) assert.equal(c.host, "xn--bcher-kva.example.com");
});

test("URL: secrets never ride in a URL (token-like values, secret-looking keys, encoded forms, high-entropy values, known key shapes)", () => {
  const bad = [
    "https://example.com/?token=abc123",
    "https://example.com/?api_key=zzz",
    "https://example.com/?access_token=abcdef",
    "https://example.com/?apikey=1",
    "https://example.com/?password=hunter2",
    "https://example.com/?sig=abc",
    "https://example.com/?x=sk-abcdefghijklmnopqrstuvwxyz123456",
    "https://example.com/?x=ghp_abcdefghijklmnopqrstuvwxyz0123456789",
    "https://example.com/?x=AKIAABCDEFGHIJKLMNOP",
    "https://example.com/?%74oken=abc",
    "https://example.com/?q=abcdef0123456789abcdef0123456789abcd",
    "https://example.com/sk-abcdefghijklmnopqrstuvwxyz123456",
    "https://example.com/?auth=1",
  ];
  for (const u of bad) {
    const r = parseTarget(u);
    assert.equal(r.ok, false, u);
    if (!r.ok) assert.equal(r.code, "secret_in_url", u);
  }
  assert.ok(parseTarget("https://example.com/search?q=hello+world&page=2").ok);
  assert.ok(parseTarget("https://example.com/docs/passage?lang=tr").ok);
});

test("domain list validation: normalised to lower-case punycode; IPs, local names, single labels, bad shapes are refused", () => {
  const good: Array<[string, string]> = [
    ["Example.COM", "example.com"],
    ["*.Docs.Example.com", "*.docs.example.com"],
    [" a.b.c ", "a.b.c"],
    ["bücher.de", "xn--bcher-kva.de"],
    ["*.bücher.de", "*.xn--bcher-kva.de"],
    ["xn--bcher-kva.de", "xn--bcher-kva.de"],
  ];
  for (const [i, o] of good) {
    const r = normalizeDomainPattern(i);
    assert.ok(r.ok, i);
    if (r.ok) assert.equal(r.value, o);
  }
  const bad = [
    "127.0.0.1", "10.0.0.1", "2130706433", "0x7f.1", "[::1]", "::1", "1.2.3.4", "localhost", "foo.localhost", "*.local", "a.local", "*.b.local", "x.internal", "*.internal", "host.lan", "*.lan", "router.home.arpa",
    "intranet", "com", "*.com", "*.", "*", "a.*.com", "ab*.example.com", "http://example.com", "example.com/path", "example.com:443", "user@example.com", "exa mple.com", "-a.com", "a-.com", "a..com", ".example.com", "example.com.", "a_b.com", "", "   ", "x".repeat(101) + ".com",
  ];
  for (const b of bad) {
    const r = normalizeDomainPattern(b);
    assert.equal(r.ok, false, JSON.stringify(b));
  }
  assert.equal(normalizeDomainPattern(5 as unknown as string).ok, false);
  assert.equal(normalizeDomainPattern(null as unknown as string).ok, false);
});

test("host matching: exact or *.suffix only; evilexample.com and example.com.evil.com are not *.example.com; the wildcard does not cover the apex", () => {
  const list = ["example.com", "*.docs.org"];
  assert.equal(hostAllowed("example.com", list), true);
  assert.equal(hostAllowed("EXAMPLE.com", list), true);
  assert.equal(hostAllowed("www.example.com", list), false, "exact entry covers only itself");
  assert.equal(hostAllowed("a.docs.org", list), true);
  assert.equal(hostAllowed("a.b.docs.org", list), true);
  assert.equal(hostAllowed("docs.org", list), false, "wildcard does not cover the apex");
  assert.equal(hostAllowed("evildocs.org", list), false);
  assert.equal(hostAllowed("docs.org.evil.com", list), false);
  assert.equal(hostAllowed("evilexample.com", ["*.example.com"]), false);
  assert.equal(hostAllowed("example.com.evil.com", ["*.example.com"]), false);
  assert.equal(hostAllowed("xexample.com", ["example.com"]), false);
  assert.equal(hostAllowed("anything.com", []), false);
});

test("secrets are searched in PATH segments and host labels too; UUIDs, ISO dates and long slugs pass", () => {
  const bad = [
    "https://example.com/api/0123456789abcdef0123456789abcdef/x",
    "https://example.com/dl/aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE3fG",
    "https://example.com/aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE3fG%2Fx",
    "https://0123456789abcdef0123456789abcdef.example.com/",
    "https://abcdefghij1234567890abcdefghij1234567890.example.com/",
    "https://example.com/?q=ABCdef0123456789ABCdef0123456789xyz",
  ];
  for (const u of bad) {
    const r = parseTarget(u);
    assert.equal(r.ok, false, u);
    if (!r.ok) assert.equal(r.code, "secret_in_url", u);
  }
  const good = [
    "https://example.com/blog/this-is-a-very-long-article-title-about-networking-and-security-basics",
    "https://example.com/2026/10/23/a-long-slug-with-digits-2026-10-23-and-more-words-here",
    "https://example.com/items/123e4567-e89b-12d3-a456-426614174000",
    "https://example.com/archive/2026-10-23T12:30:00Z",
    "https://example.com/a?id=123e4567-e89b-12d3-a456-426614174000&d=2026-10-23",
    "https://very-long-descriptive-subdomain-name.example.com/",
  ];
  for (const u of good) assert.ok(parseTarget(u).ok, u);
});

test("public suffixes: no wildcard on or under them and no bare suffix; a concrete tenant name is fine", () => {
  for (const d of ["*.github.io", "github.io", "*.co.uk", "co.uk", "com.tr", "*.com.tr", "*.vercel.app", "*.alice.github.io", "*.herokuapp.com", "*.pages.dev", "*.blogspot.com", "*.amazonaws.com", "*.s3.amazonaws.com", "*.web.app", "*.glitch.me", "workers.dev"]) {
    assert.equal(normalizeDomainPattern(d).ok, false, d);
  }
  for (const d of ["alice.github.io", "myapp.vercel.app", "site.co.uk", "firma.com.tr", "*.firma.com.tr", "*.example.co.uk"]) assert.ok(normalizeDomainPattern(d).ok, d);
});
