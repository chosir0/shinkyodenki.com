export const SHELVES = [
    // Screen order is left to right; visitors count A/B/C from the right.
    {id:'small-c',name:'小型棚C',size:'small'},
    {id:'small-b',name:'小型棚B',size:'small'},
    {id:'small-a',name:'小型棚A',size:'small'},
    {id:'large-b',name:'大型棚B',size:'large'},
    {id:'large-a',name:'大型棚A',size:'large'}
];
export const STATUSES = {'空きあり':'available','一部利用中':'partial','満室':'full','確認中':'checking'};
export const FACE_STATUSES=['空きあり','利用中','確認中'];
export const FACE_NAMES=['左上段・天面','右上段・天面','左上段・側面','右上段・側面','左中段・側面','右中段・側面','左下段・側面','右下段・側面','左上段・背面','右上段・背面','左中段・背面','右中段・背面','左下段・背面','右下段・背面','左・水平面','右・水平面'];
export function displayFaces(row){
    if(row.faces)return {...row.faces};
    return Object.fromEntries(Array.from({length:16},(_,i)=>[i+1,row.status==='空きあり'?'空きあり':row.status==='満室'?'利用中':'確認中']));
}
// A fixed oblique diagram. No WebGL, CAD download or camera controls are required.
export function diagramFaces(size){
    const w=size==='large'?900:700,d=size==='large'?450:350,result=[];
    const add=(id,points,anchor)=>result.push({id,points,anchor});
    for(let row=0;row<3;row++){
        const bottom=700-row*350,top=bottom+350;
        for(let side=0;side<2;side++){
            const left=-w/2+side*w/2,right=left+w/2;
            add(9+row*2+side,[[left,bottom,-d/2],[right,bottom,-d/2],[right,top,-d/2],[left,top,-d/2]],[(left+right)/2,(top+bottom)/2,-d/2]);
        }
    }
    for(let row=0;row<3;row++)for(let side=0;side<2;side++){
        const x=side?w/2:-w/2,bottom=700-row*350,top=bottom+350;
        add(3+row*2+side,[[x,bottom,-d/2],[x,bottom,d/2],[x,top,d/2],[x,top,-d/2]],[x,(bottom+top)/2,0]);
    }
    for(const [base,height] of [[15,350],[1,1050]])for(let side=0;side<2;side++){
        const left=-w/2+side*w/2,right=left+w/2;
        add(base+side,[[left,height,-d/2],[right,height,-d/2],[right,height,d/2],[left,height,d/2]],[(left+right)/2,height,base===15?d*.3:0]);
    }
    return result;
}
function shelfDiagram(row){
    const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg'),faces=displayFaces(row);
    svg.setAttribute('viewBox',row.size==='large'?'0 0 320 400':'30 0 260 400');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${row.name}の面別空き状況。番号と状態は下の詳細一覧でも確認できます。`);svg.classList.add('availability-drawing');
    const title=document.createElementNS(NS,'title');title.textContent=row.name+'の面別空き状況';svg.append(title);
    const project=([x,y,z])=>[160+x*.23+z*.15,355-y*.27+z*.12-x*.035];
    const palette={'空きあり':['#d9f0e2','#2d8655'],'利用中':['#f4d9d5','#b74e45'],'確認中':['#e3e8ec','#647481']};
    const shapes=diagramFaces(row.size);
    for(const face of shapes){
        const points=face.points.map(project),[fill,stroke]=palette[faces[face.id]];
        const polygon=document.createElementNS(NS,'polygon');polygon.setAttribute('points',points.map(p=>p.join(',')).join(' '));polygon.setAttribute('fill',fill);polygon.setAttribute('fill-opacity','.8');polygon.setAttribute('stroke',stroke);polygon.setAttribute('stroke-width','1.5');
        const tooltip=document.createElementNS(NS,'title');tooltip.textContent=`${String.fromCodePoint(0x245f+face.id)} ${FACE_NAMES[face.id-1]}：${faces[face.id]}`;polygon.append(tooltip);svg.append(polygon);
        const grid=document.createElementNS(NS,'path');let path='';
        const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        for(let i=1;i<8;i++)for(const [a,b,c,d] of [[0,1,3,2],[0,3,1,2]]){const start=mix(points[a],points[b],i/8),end=mix(points[c],points[d],i/8);path+=`M${start.join(' ')}L${end.join(' ')}`;}
        grid.setAttribute('d',path);grid.setAttribute('fill','none');grid.setAttribute('stroke',stroke);grid.setAttribute('stroke-opacity','.25');grid.setAttribute('stroke-width','.6');svg.append(grid);
    }
    for(const face of shapes){
        const [x,y]=project(face.anchor),stroke=palette[faces[face.id]][1];
        const badge=document.createElementNS(NS,'circle');badge.setAttribute('cx',x);badge.setAttribute('cy',y);badge.setAttribute('r','10');badge.setAttribute('fill','#fff');badge.setAttribute('stroke',stroke);badge.setAttribute('stroke-width','1.5');svg.append(badge);
        const text=document.createElementNS(NS,'text');text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('dy','.35em');text.setAttribute('text-anchor','middle');text.setAttribute('font-size','14');text.setAttribute('font-family','sans-serif');text.setAttribute('fill','#203e2d');text.textContent=String(face.id);svg.append(text);
    }
    return svg;
}
export function summarizeFaces(faces) {
    if(!faces||typeof faces!=='object'||Array.isArray(faces)||Object.keys(faces).length!==16)throw Error('各棚の16面を指定してください。');
    const values=Array.from({length:16},(_,i)=>faces[String(i+1)]);
    if(!values.every(value=>FACE_STATUSES.includes(value)))throw Error('面の状態は空きあり・利用中・確認中から指定してください。');
    if(values.includes('確認中'))return '確認中';
    if(values.every(value=>value==='利用中'))return '満室';
    if(values.every(value=>value==='空きあり'))return '空きあり';
    return '一部利用中';
}
export function validDate(value) {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const date=new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
export function availabilityRows(data) {
    if(!Array.isArray(data?.shelves)||data.shelves.length!==SHELVES.length)throw Error('5台の棚の情報が必要です。');
    const ids=new Set();
    for(const row of data.shelves){
        if(!SHELVES.some(shelf=>shelf.id===row.id)||ids.has(row.id))throw Error('棚IDが不正または重複しています。');
        ids.add(row.id);
        if(!Object.hasOwn(STATUSES,row.status))throw Error('状態は空きあり・一部利用中・満室・確認中から指定してください。');
        if(row.updatedAt!==null&&!validDate(row.updatedAt))throw Error('更新日はYYYY-MM-DD形式で指定してください。');
        if(row.status!=='確認中'&&!validDate(row.updatedAt))throw Error('確認中以外の状態には更新日が必要です。');
        if(row.faces!==undefined){
            if(summarizeFaces(row.faces)!==row.status)throw Error('面の状態と棚全体の状態が一致しません。');
            if(Object.values(row.faces).some(value=>value!=='確認中')&&!validDate(row.updatedAt))throw Error('面を確認した場合は更新日が必要です。');
        }
    }
    return SHELVES.map(shelf=>{const row=data.shelves.find(row=>row.id===shelf.id);return {...shelf,status:row.status,updatedAt:row.updatedAt,...(row.faces?{faces:{...row.faces}}:{})};});
}
function render(rows) {
    const map=document.getElementById('availability-map');map.replaceChildren();
    const detail=document.getElementById('availability-detail'),detailBody=document.getElementById('availability-detail-body');
    function showDetail(row){
        detailBody.replaceChildren();const header=document.createElement('h3');header.textContent=row.name+'の面別空き状況';detailBody.append(header);
        const layout=document.createElement('div');layout.className='availability-detail-layout';layout.append(shelfDiagram(row));
        const list=document.createElement('dl');list.className='availability-face-list';const faces=displayFaces(row);
        for(let id=1;id<=16;id++){const item=document.createElement('div');item.className='availability-face-item '+({'空きあり':'face-free','利用中':'face-used','確認中':'face-unknown'}[faces[id]]);const label=document.createElement('dt');label.textContent=String.fromCodePoint(0x245f+id)+' '+FACE_NAMES[id-1];const value=document.createElement('dd');value.textContent=faces[id];item.append(label,value);list.append(item);}
        layout.append(list);detailBody.append(layout);detail.open=true;
    }
    for(const row of rows){
        const card=document.createElement('article');card.className=`availability-shelf ${row.size}`;
        const footprint=document.createElement('div');footprint.className='availability-footprint';
        const name=document.createElement('h3');name.textContent=row.name;footprint.append(name,shelfDiagram(row));
        const dimension=document.createElement('p');dimension.textContent=row.size==='large'?'約 幅900 × 奥行450mm':'約 幅700 × 奥行350mm';footprint.append(dimension);
        const badge=document.createElement('p');badge.className=`availability-status ${STATUSES[row.status]}`;badge.textContent=row.status;
        const date=document.createElement('p');date.className='availability-date';
        if(row.updatedAt){const time=document.createElement('time');time.dateTime=row.updatedAt;time.textContent=row.updatedAt.replaceAll('-','/');date.append('更新：',time);}else date.textContent='更新：未更新';
        card.append(footprint,badge,date);map.append(card);
        if(row.faces){const counts=document.createElement('p');counts.className='availability-date';counts.textContent=`利用中${Object.values(row.faces).filter(v=>v==='利用中').length}面／空き${Object.values(row.faces).filter(v=>v==='空きあり').length}面／確認中${Object.values(row.faces).filter(v=>v==='確認中').length}面`;card.append(counts);}
        const available=Object.entries(displayFaces(row)).filter(([,status])=>status==='空きあり').map(([id])=>String.fromCodePoint(0x245f+Number(id)));
        const free=document.createElement('p');free.className='availability-free-faces';free.textContent=available.length?'空いている面：'+available.join(' '):'空きが確認できている面はありません';card.append(free);
        const button=document.createElement('button');button.type='button';button.className='availability-detail-button';button.textContent=row.name+'を詳しく見る';button.addEventListener('click',()=>{showDetail(row);detail.scrollIntoView({block:'nearest'});});card.append(button);
    }
    showDetail(rows.find(row=>row.id==='large-a')||rows[0]);detail.open=false;
}
if(typeof document!=='undefined'&&document.getElementById('availability-map')){
    (async()=>{
        try{
            const response=await fetch('shelf-availability.json',{cache:'no-store'});
            if(!response.ok)throw Error(`HTTP ${response.status}`);
            render(availabilityRows(await response.json()));
        }catch(error){
            render(SHELVES.map(shelf=>({...shelf,status:'確認中',updatedAt:null})));
            document.getElementById('availability-message').textContent='最新の空き状況を取得できませんでした。お問い合わせにてご確認ください。';
            console.error('Shelf availability:',error);
        }
    })();
}
