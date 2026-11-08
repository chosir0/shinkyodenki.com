/* 月額・税込。出典：委託販売料金プラン。番号は同資料の貸出面に対応。 */
const SHELF_FACES = [
    [1,'左上段','天面',380,440],[2,'右上段','天面',380,440],
    [3,'左上段','側面',790,880],[4,'右上段','側面',790,880],
    [5,'左中段','側面',590,660],[6,'右中段','側面',590,660],
    [7,'左下段','側面',380,440],[8,'右下段','側面',380,440],
    [9,'左上段','背面',1450,1650],[10,'右上段','背面',1450,1650],
    [11,'左中段','背面',990,1100],[12,'右中段','背面',990,1100],
    [13,'左下段','背面',380,440],[14,'右下段','背面',380,440],
    [15,'左上段','水平面',1450,1650],[16,'右上段','水平面',1450,1650]
];
const TOP_REQUIREMENTS = {1:[3,9],2:[4,10]};
function normalizeFaces(selected) {
    const result = new Set([...selected].filter(id => SHELF_FACES.some(face => face[0] === id)));
    for (const [top, requirements] of Object.entries(TOP_REQUIREMENTS)) {
        if (!requirements.some(id => result.has(id))) result.delete(Number(top));
    }
    return result;
}
function calculateShelf(size, selected, sales) {
    const faces = normalizeFaces(selected);
    const rent = SHELF_FACES.filter(face => faces.has(face[0])).reduce((sum,face) => sum + face[size === 'large' ? 4 : 3],0);
    return {faces,rent,firstFee:sales * 0.30,regularFee:sales * 0.25};
}
if (typeof document !== 'undefined') {
    const yen = value => `${value.toLocaleString('ja-JP',{maximumFractionDigits:2})}円`;
    const circled = id => String.fromCodePoint(0x245f + id);
    let selected = new Set();
    let size = 'small';
    let planText = '';
    const groups = document.getElementById('face-groups');
    for (const type of ['天面','側面','背面','水平面']) {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'face-group';
        const legend = document.createElement('legend');
        legend.textContent = type;
        fieldset.append(legend);
        const grid = document.createElement('div');
        grid.className = 'face-grid';
        for (const face of SHELF_FACES.filter(face => face[2] === type)) {
            const label = document.createElement('label');
            label.className = 'face-option';
            const id = face[0];
            label.innerHTML = `<input type="checkbox" value="${id}"><span>${circled(id)} ${face[1]}<span class="face-price"></span>${TOP_REQUIREMENTS[id] ? `<small>${TOP_REQUIREMENTS[id].map(circled).join(' または ')}の選択が必要</small>` : ''}</span>`;
            grid.append(label);
        }
        fieldset.append(grid);
        groups.append(fieldset);
    }
    function update() {
        const input = document.getElementById('monthly-sales');
        const sales = Number(input.value);
        const valid = input.value !== '' && input.validity.valid && Number.isFinite(sales) && Number.isInteger(sales);
        input.setAttribute('aria-invalid',String(!valid));
        document.getElementById('sales-error').textContent = valid ? '' : '売上は0〜1,000,000,000円の整数で入力してください。';
        const result = calculateShelf(size,selected,valid ? sales : 0);
        selected = result.faces;
        for (const checkbox of groups.querySelectorAll('input')) {
            const id = Number(checkbox.value);
            checkbox.checked = selected.has(id);
            checkbox.disabled = !!TOP_REQUIREMENTS[id] && !TOP_REQUIREMENTS[id].some(required => selected.has(required));
            const face = SHELF_FACES.find(face => face[0] === id);
            checkbox.closest('label').querySelector('.face-price').textContent = `${yen(face[size === 'large' ? 4 : 3])} / 月`;
        }
        const names = SHELF_FACES.filter(face => selected.has(face[0])).map(face => `${circled(face[0])}${face[1]}・${face[2]}`);
        document.getElementById('quote').innerHTML = `<p>${size === 'large' ? '大型棚' : '小型棚'} · ${selected.size}面を選択</p><p class="quote-price">${yen(result.rent)}<small> / 月（税込）</small></p><div class="quote-row"><span>新規契約の初月</span><strong>棚代0円 ＋ 売上の30％</strong></div><div class="quote-row"><span>2か月目以降</span><strong>${yen(result.rent)} ＋ 売上の25％</strong></div><p class="selected-summary">${names.length ? names.join('、') : '左の一覧から利用する面を選んでください。'}</p>`;
        document.getElementById('sales-quote').innerHTML = !valid || !selected.size ? '' : `<div class="quote-row"><span>初月の手数料 / 差引額</span><strong>${yen(result.firstFee)} / ${yen(sales-result.firstFee)}</strong></div><div class="quote-row"><span>翌月以降の手数料</span><strong>${yen(result.regularFee)}</strong></div><div class="quote-row"><span>翌月以降の費用合計<br>棚代 ＋ 手数料</span><strong>${yen(result.rent+result.regularFee)}</strong></div><div class="quote-row"><span>翌月以降の差引額<br>売上 − 棚代 − 手数料</span><strong>${yen(sales-result.rent-result.regularFee)}</strong></div>`;
        document.getElementById('copy-plan').disabled = !selected.size || !valid;
        document.getElementById('copy-status').textContent = '';
        planText = `委託棚の相談プラン（税込・参考）\n${size === 'large' ? '大型棚' : '小型棚'}\n利用面：${names.join('、')}\n月額棚代：${yen(result.rent)}\n初月：棚代0円＋販売手数料30％\n2か月目以降：棚代＋販売手数料25％\n想定月間売上：${yen(valid ? sales : 0)}\n初月手数料：${yen(result.firstFee)}\n翌月以降の棚代・手数料合計：${yen(result.rent+result.regularFee)}\n空き状況・配置・契約条件は店舗に確認。`;
        window.shelfState = {size, selected:[...selected]};
        window.dispatchEvent(new CustomEvent('shelf-state-change',{detail:window.shelfState}));
    }
    groups.addEventListener('change',event => {
        if (!event.target.matches('input[type="checkbox"]')) return;
        const id = Number(event.target.value);
        event.target.checked ? selected.add(id) : selected.delete(id);
        update();
    });
    document.querySelectorAll('input[name="shelf-size"]').forEach(input => input.addEventListener('change',() => {size=input.value;update();}));
    document.getElementById('select-all').addEventListener('click',() => {selected=new Set(SHELF_FACES.map(face=>face[0]));update();});
    document.getElementById('clear-faces').addEventListener('click',() => {selected.clear();update();});
    document.getElementById('monthly-sales').addEventListener('input',update);
    document.getElementById('copy-plan').addEventListener('click',async () => {
        try {await navigator.clipboard.writeText(planText);document.getElementById('copy-status').textContent='コピーしました。お問い合わせ本文に貼り付けてご利用ください。';}
        catch {document.getElementById('copy-status').textContent='コピーできませんでした。表示された利用面と料金をお問い合わせ本文にご記入ください。';}
    });
    update();
}
