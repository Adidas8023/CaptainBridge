// Minimum versions containing the 2026-10-21 Node.js security fixes.
// https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
const minimums = { 22: [23, 4], 24: [22, 1], 26: [12, 1] };
const version = /^v(\d+)\.(\d+)\.(\d+)$/.exec(process.version);
const [major, minor, patch] = version ? version.slice(1).map(Number) : [];
const floor = minimums[major];
if (!floor || minor < floor[0] || (minor === floor[0] && patch < floor[1])) {
  console.error(`Unsupported or unpatched Node.js ${process.version}. Use >=22.23.4 <23, >=24.22.1 <25, or >=26.12.1 <27.`);
  process.exit(1);
}
console.log(`Node.js ${process.version}: security baseline satisfied`);
