import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {availabilityRows,validDate} from '../shelf-availability.v1.js';
const data=JSON.parse(fs.readFileSync(new URL('../shelf-availability.json',import.meta.url),'utf8'));
test('published data validates and the physical shelf order is fixed',()=>{
    const rows=availabilityRows({...data,shelves:[...data.shelves].reverse()});
    assert.deepEqual(rows.map(row=>row.name),['大型棚A','大型棚B','小型棚A','小型棚B','小型棚C']);
});
test('dated status changes are accepted',()=>{
    const next=structuredClone(data);next.shelves[0].status='一部利用中';next.shelves[0].updatedAt='2026-11-09';
    assert.equal(availabilityRows(next)[0].status,'一部利用中');
});
test('invalid dates, unknown statuses, missing dates and duplicate IDs are rejected',()=>{
    assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-11-09'),true);
    for(const change of [row=>row.status='予約中',row=>row.updatedAt='2026-02-30',row=>{row.status='満室';row.updatedAt=null;},row=>row.id='large-b']){
        const next=structuredClone(data);change(next.shelves[0]);assert.throws(()=>availabilityRows(next));
    }
});
