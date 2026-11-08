// Nominal dimensions in mm. This checks display volumes, not mesh collisions or load limits.
export const PRODUCT_AREAS = {
    1:{side:0,hanging:true,label:'① 左の天面から吊るす',required:[3,9]},
    2:{side:1,hanging:true,label:'② 右の天面から吊るす',required:[4,10]},
    15:{side:0,hanging:false,label:'⑮ 左の棚板に置く',required:[5,11]},
    16:{side:1,hanging:false,label:'⑯ 右の棚板に置く',required:[6,12]}
};
export function productBounds(product,config) {
    const area=PRODUCT_AREAS[product.area];
    const width=product.rotated?product.depth:product.width;
    const depth=product.rotated?product.width:product.depth;
    const left=-config.width/2+area.side*config.width/2+product.x;
    const front=config.depth/2-product.z;
    const bottom=area.hanging?config.levels[0]-product.gap-product.height:config.shelf+8;
    return {min:[left,bottom,front-depth],max:[left+width,bottom+product.height,front],width,depth};
}
export function inspectProducts(products,config,selected) {
    const warnings=new Map(products.map(product=>[product.id,[]]));
    const bounds=products.map(product=>productBounds(product,config));
    products.forEach((product,i)=>{
        const area=PRODUCT_AREAS[product.area],b=bounds[i];
        const left=-config.width/2+area.side*config.width/2;
        if(b.min[0]<left||b.max[0]>left+config.width/2||b.min[2]<-config.depth/2||b.max[2]>config.depth/2)warnings.get(product.id).push('指定した面の幅・奥行からはみ出しています。');
        const lower=area.hanging?config.levels[1]:config.shelf+8;
        const upper=area.hanging?config.levels[0]:config.levels[1];
        if(b.min[1]<lower||b.max[1]>upper)warnings.get(product.id).push('展示区画の高さを超えています。隣の区画への干渉を確認してください。');
        if(!selected.includes(product.area)||!area.required.every(id=>selected.includes(id)))warnings.get(product.id).push('必要な契約面（配置先と側面・背面）が選択されていません。');
    });
    for(let i=0;i<products.length;i++)for(let j=i+1;j<products.length;j++){
        if(bounds[i].min.every((v,axis)=>v<bounds[j].max[axis]&&bounds[i].max[axis]>bounds[j].min[axis])){
            warnings.get(products[i].id).push(`商品P${products[j].id}と重なっています。`);
            warnings.get(products[j].id).push(`商品P${products[i].id}と重なっています。`);
        }
    }
    return {warnings,bounds};
}
