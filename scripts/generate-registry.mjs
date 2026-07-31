import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRegistry } from '../services/transaction-registry.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = generateRegistry({ schemaDir: path.join(root, 'contracts/schemas'), output: path.join(root, 'artifacts/schema-registry.json') });
console.log(`Generated registry with ${registry.schemas.length} schemas.`);
