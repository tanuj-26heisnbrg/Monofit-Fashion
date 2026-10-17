import test from 'node:test';
import assert from 'node:assert';
import Product from '../models/Product.js';
const base = { name: 'x', slug: 'x', category: '507f1f77bcf86cd799439011', gender: 'men', sku: 'X', sizes: [{ size: 'M', stock: 1 }] };
test('discount is calculated from stored prices', async () => { const p = new Product({ ...base, mrp: 999, price: 699 }); await p.validate(); assert.strictEqual(p.discountPct, 30); });
test('price above MRP is rejected', async () => { await assert.rejects(() => new Product({ ...base, mrp: 500, price: 700 }).validate()); });
test('negative stock is rejected', async () => { await assert.rejects(() => new Product({ ...base, mrp: 500, price: 400, sizes: [{ size: 'M', stock: -1 }] }).validate()); });
