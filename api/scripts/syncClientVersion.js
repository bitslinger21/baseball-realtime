// api/scripts/syncClientVersion.js
const fs = require("node:fs");
const path = require("node:path");

const apiPkgPath = path.join(__dirname, "..", "package.json");
const clientPkgPath = path.join(
  __dirname,
  "..",
  "generated",
  "client",
  "typescript-axios",
  "package.json",
);

// read api package.json
const apiPkg = JSON.parse(fs.readFileSync(apiPkgPath, "utf8"));

// start from whatever the generator wrote, or an empty object
let clientPkg = {};
if (fs.existsSync(clientPkgPath)) {
  clientPkg = JSON.parse(fs.readFileSync(clientPkgPath, "utf8"));
}

// enforce valid name & version for publish
clientPkg.name = "@bitslinger21/baseball-realtime-client";
clientPkg.version = apiPkg.version;
clientPkg.private = false;

// minimal metadata
clientPkg.description = clientPkg.description || "Baseball Realtime API client";
clientPkg.license = clientPkg.license || "UNLICENSED";
clientPkg.main = clientPkg.main || "index.js";
clientPkg.types = clientPkg.types || "index.d.ts";

// 🔹 tell Yarn/npm explicitly which registry to publish to
clientPkg.publishConfig = {
  ...(clientPkg.publishConfig || {}),
  registry: "https://npm.pkg.github.com",
};

fs.writeFileSync(clientPkgPath, JSON.stringify(clientPkg, null, 2) + "\n");
