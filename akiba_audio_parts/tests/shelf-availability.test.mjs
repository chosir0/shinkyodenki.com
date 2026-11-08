import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {availabilityRows,validDate,summarizeFaces} from '../shelf-availability.v1.js';
const data=JSON.parse(fs.readFileSync(new URL('../shelf-availability.json',import.meta.url),'utf8'));
test('published data validates and the physical shelf order is fixed',()=>{
    const rows=availabilityRows({...data,shelves:[...data.shelves].reverse()});
    assert.deepEqual(rows.map(row=>row.name),['小型棚C','小型棚B','小型棚A','大型棚B','大型棚A']);
});
test('face statuses aggregate consistently without treating unknown faces as available',()=>{
    const faces=Object.fromEntries(Array.from({length:16},(_,i)=>[i+1,'空きあり']));
    assert.equal(summarizeFaces(faces),'空きあり');faces[1]='利用中';assert.equal(summarizeFaces(faces),'一部利用中');
    faces[2]='確認中';assert.equal(summarizeFaces(faces),'確認中');
    Object.keys(faces).forEach(id=>faces[id]='利用中');assert.equal(summarizeFaces(faces),'満室');
    const next=structuredClone(data);next.shelves[0]={id:'large-a',status:'満室',updatedAt:'2026-11-09',faces};
    assert.equal(availabilityRows(next).find(row=>row.id==='large-a').faces[1],'利用中');
    next.shelves[0].status='空きあり';assert.throws(()=>availabilityRows(next));
    delete faces[16];assert.throws(()=>summarizeFaces(faces));
});
test('dated status changes are accepted',()=>{
    const next=structuredClone(data);next.shelves[0].status='一部利用中';next.shelves[0].updatedAt='2026-11-09';
    assert.equal(availabilityRows(next).find(row=>row.id==='large-a').status,'一部利用中');
});
test('invalid dates, unknown statuses, missing dates and duplicate IDs are rejected',()=>{
    assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-11-09'),true);
    for(const change of [row=>row.status='予約中',row=>row.updatedAt='2026-02-30',row=>{row.status='満室';row.updatedAt=null;},row=>row.id='large-b']){
        const next=structuredClone(data);change(next.shelves[0]);assert.throws(()=>availabilityRows(next));
    }
});
