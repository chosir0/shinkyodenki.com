export const SHELVES = [
    {id:'large-a',name:'大型棚A',size:'large'},
    {id:'large-b',name:'大型棚B',size:'large'},
    {id:'small-a',name:'小型棚A',size:'small'},
    {id:'small-b',name:'小型棚B',size:'small'},
    {id:'small-c',name:'小型棚C',size:'small'}
];
export const STATUSES = {'空きあり':'available','一部利用中':'partial','満室':'full','確認中':'checking'};
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
    }
    return SHELVES.map(shelf=>{const row=data.shelves.find(row=>row.id===shelf.id);return {...shelf,status:row.status,updatedAt:row.updatedAt};});
}
function render(rows) {
    const map=document.getElementById('availability-map');map.replaceChildren();
    for(const row of rows){
        const card=document.createElement('article');card.className=`availability-shelf ${row.size}`;
        const footprint=document.createElement('div');footprint.className='availability-footprint';
        const name=document.createElement('h3');name.textContent=row.name;footprint.append(name);
        const dimension=document.createElement('p');dimension.textContent=row.size==='large'?'約 幅900 × 奥行450mm':'約 幅700 × 奥行350mm';footprint.append(dimension);
        const front=document.createElement('span');front.className='availability-front';front.textContent='正面 ↓';footprint.append(front);
        const badge=document.createElement('p');badge.className=`availability-status ${STATUSES[row.status]}`;badge.textContent=row.status;
        const date=document.createElement('p');date.className='availability-date';
        if(row.updatedAt){const time=document.createElement('time');time.dateTime=row.updatedAt;time.textContent=row.updatedAt.replaceAll('-','/');date.append('更新：',time);}else date.textContent='更新：未更新';
        card.append(footprint,badge,date);map.append(card);
    }
}
if(typeof document!=='undefined'){
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
