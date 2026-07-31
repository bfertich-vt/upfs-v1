import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import {generate} from './generate-public-docs.mjs';
test('generated artifacts are synchronized',()=>{generate();assert.doesNotThrow(()=>generate({check:true}));});
test('reference covers route permission events schemas',()=>{generate();const x=fs.readFileSync('docs/generated/api-reference.md','utf8');assert.match(x,/POST \/transactions\/search/);assert.match(x,/transactions\.search/);assert.match(x,/canonicalTransactionChanged/);assert.match(x,/canonical-transaction/);});
