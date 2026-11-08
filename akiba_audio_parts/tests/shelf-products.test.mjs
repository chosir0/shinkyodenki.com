import test from 'node:test';
import assert from 'node:assert/strict';
import { productBounds, inspectProducts } from '../shelf-products.js';

const small={width:700,depth:350,shelf:353,levels:[1050,700,350,0]};
const large={...small,width:900,depth:450};
const product={id:1,name:'キット',area:15,width:150,depth:100,height:100,x:20,z:20,gap:50,rotated:false};
const placedFaces=[5,11,15];

test('changing shelf size rechecks whether the same product fits',()=>{
    const wide={...product,width:400};
    assert(inspectProducts([wide],small,placedFaces).warnings.get(1).some(w=>w.includes('はみ出し')));
    assert.equal(inspectProducts([wide],large,placedFaces).warnings.get(1).length,0);
});
test('placing and hanging use different vertical anchors and contract faces',()=>{
    assert.equal(productBounds(product,small).min[1],361);
    const hanging={...product,area:1};
    assert.equal(productBounds(hanging,small).max[1],1000);
    assert.equal(inspectProducts([hanging],small,[1,3,9]).warnings.get(1).length,0);
    assert(inspectProducts([hanging],small,[1,3]).warnings.get(1).some(w=>w.includes('契約面')));
    assert(inspectProducts([{...hanging,gap:300}],small,[1,3,9]).warnings.get(1).some(w=>w.includes('高さ')));
    assert(inspectProducts([{...product,height:400}],small,placedFaces).warnings.get(1).some(w=>w.includes('高さ')));
});
test('overlap warns both products, while touching edges do not overlap',()=>{
    const overlapping=inspectProducts([product,{...product,id:2}],small,placedFaces);
    assert(overlapping.warnings.get(1).some(w=>w.includes('P2')));
    assert(overlapping.warnings.get(2).some(w=>w.includes('P1')));
    const touching=inspectProducts([product,{...product,id:2,x:170}],small,placedFaces);
    assert.equal(touching.warnings.get(1).length,0);
    assert.equal(touching.warnings.get(2).length,0);
});
test('rotation swaps footprint; negative offsets and right-hand areas are checked',()=>{
    const rotated=productBounds({...product,rotated:true},small);
    assert.equal(rotated.width,100);assert.equal(rotated.depth,150);
    assert(inspectProducts([{...product,x:-1}],small,placedFaces).warnings.get(1).some(w=>w.includes('はみ出し')));
    assert.equal(inspectProducts([{...product,area:16}],small,[6,12,16]).warnings.get(1).length,0);
    assert(productBounds({...product,area:16},small).min[0]>=0);
});
