import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';

const rootRequire = createRequire(import.meta.url);

// Load the real TypeScript configuration with its aliases, without a browser,
// wallet, RPC requests, or an extra runtime dependency in the application.
const sourceModules = new Map();
function loadSource(path) {
  if (sourceModules.has(path)) return sourceModules.get(path).exports;
  const sourceModule = { exports: {} };
  sourceModules.set(path, sourceModule);
  const ts = rootRequire('typescript');
  const source = readFileSync(new URL(`../src/${path}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const require = id => id.startsWith('@/')
    ? loadSource(id.slice(2))
    : id.startsWith('.')
      ? loadSource(posix.normalize(posix.join(posix.dirname(path), id)))
      : rootRequire(id);
  new Function('require', 'module', 'exports', outputText)(require, sourceModule, sourceModule.exports);
  return sourceModule.exports;
}

const web3Require = createRequire(rootRequire.resolve('@solana/web3.js'));
const Client = web3Require('jayson/lib/client/browser');

test('Solana RPC client keeps JSON-RPC requests and secure UUID IDs', async () => {
  const ids = new Set();
  for (let index = 0; index < 3; index++) {
    const client = new Client((message, callback) => {
      const request = JSON.parse(message);
      assert.equal(request.jsonrpc, '2.0');
      assert.equal(request.method, 'getBalance');
      assert.deepEqual(request.params, ['offline-fixture']);
      assert.match(request.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      ids.add(request.id);
      callback(null, JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { value: 123 } }));
    });
    const response = await new Promise((resolve, reject) => client.request('getBalance', ['offline-fixture'], (error, response) => error ? reject(error) : resolve(response)));
    assert.equal(response.result.value, 123);
  }
  assert.equal(ids.size, 3);
});

test('RPC errors, batches, notifications and malformed responses retain their contracts', () => {
  const rpcError = { code: -32602, message: 'Invalid params' };
  const client = new Client((message, callback) => callback(null, JSON.stringify({ jsonrpc: '2.0', id: 1, error: rpcError })));
  client.request('getBalance', [], 1, (error, responseError, result) => {
    assert.equal(error, null); assert.deepEqual(responseError, rpcError); assert.equal(result, undefined);
  });
  const responses = [{ jsonrpc: '2.0', id: 1, result: 5 }, { jsonrpc: '2.0', id: 2, error: rpcError }];
  const batchClient = new Client((message, callback) => { assert.equal(JSON.parse(message).length, 2); callback(null, JSON.stringify(responses)); });
  batchClient.request([{ jsonrpc: '2.0', method: 'first', id: 1 }, { jsonrpc: '2.0', method: 'second', id: 2 }], (error, errors, successes) => {
    assert.equal(error, null); assert.deepEqual(errors, [responses[1]]); assert.deepEqual(successes, [responses[0]]);
  });
  const notification = client.request('notify', [], null);
  assert.equal(Object.hasOwn(notification, 'id'), false);
  const invalidClient = new Client((message, callback) => callback(null, '{invalid-json'));
  invalidClient.request('getBalance', [], error => assert.ok(error instanceof SyntaxError));
});

test('Solflare UUID generator preserves CommonJS v4 API', () => {
  const sdkRequire = createRequire(rootRequire.resolve('@solflare-wallet/sdk'));
  const { v4, validate, version } = sdkRequire('uuid');
  const id = v4(); assert.equal(validate(id), true); assert.equal(version(id), 4);
});

test('Anchor workspace TOML keeps Buffer input, program addresses and provider configuration', () => {
  const anchorRequire = createRequire(rootRequire.resolve('@coral-xyz/anchor'));
  const toml = anchorRequire('toml');
  const config = toml.parse(Buffer.from('[programs.localnet]\nbridge = "11111111111111111111111111111111"\n[provider]\ncluster = "localnet"\nwallet = "offline-fixture.json"\n[workspace]\nmembers = ["programs/*"]\n'));
  assert.equal(config.programs.localnet.bridge, '11111111111111111111111111111111');
  assert.deepEqual({ ...config.provider }, { cluster: 'localnet', wallet: 'offline-fixture.json' });
  assert.equal(Object.getPrototypeOf(config.provider), null);
  assert.equal(Object.entries(config.programs.localnet).find(([name]) => name === 'bridge')[1], '11111111111111111111111111111111');
  assert.deepEqual(config.workspace.members, ['programs/*']);
});

test('upgraded Circle SDK preserves every configured mainnet USDC route and contract', async context => {
  // The new SDK warms its CCTPx registries in the background. Route metadata
  // comes from its bundled catalog, so this test needs no external service.
  context.mock.method(globalThis, 'fetch', async () => {
    throw new Error('External requests are disabled in dependency compatibility tests');
  });
  const { CHAINS } = loadSource('lib/cctp/constants');
  const { createBridgeKit, toBridgeKitChain } = loadSource('lib/cctp/bridge-kit');
  const kit = await createBridgeKit();
  const catalog = kit.getSupportedChains({ isTestnet: false });
  assert.equal(CHAINS.length, 24);
  assert.equal(new Set(CHAINS.map(chain => chain.domainId)).size, CHAINS.length);
  for (const chain of CHAINS) {
    const sdk = catalog.find(entry => entry.chain === toBridgeKitChain(chain));
    assert.ok(sdk, `${chain.name} is absent from the upgraded SDK`);
    assert.equal(sdk.cctp.domain, chain.domainId, chain.name);
    assert.equal(sdk.chainId, chain.chainId, chain.name);
    assert.equal(sdk.type, chain.type, chain.name);
    const normalizeAddress = address => chain.type === 'evm' ? address.toLowerCase() : address;
    assert.equal(normalizeAddress(sdk.usdcAddress), normalizeAddress(chain.usdcAddress), chain.name);
    assert.equal(normalizeAddress(sdk.cctp.contracts.v2.tokenMessenger), normalizeAddress(chain.tokenMessengerAddress), chain.name);
    assert.equal(normalizeAddress(sdk.cctp.contracts.v2.messageTransmitter), normalizeAddress(chain.messageTransmitterAddress), chain.name);
  }
  assert.equal(CHAINS.some(chain => chain.domainId === 25), false, 'Starknet stays excluded');
  const configuredDomains = new Set(CHAINS.map(chain => chain.domainId));
  assert.deepEqual(catalog.filter(chain => !configuredDomains.has(chain.cctp.domain)).map(chain => chain.chain).sort(), ['Arc', 'Plasma']);
});
