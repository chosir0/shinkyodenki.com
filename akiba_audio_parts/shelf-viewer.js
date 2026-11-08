import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { PRODUCT_AREAS, productBounds, inspectProducts } from './shelf-products.js';

const viewport = document.getElementById('shelf-viewport');
const labels = document.getElementById('shelf-labels');
const loading = document.getElementById('viewer-loading');
const status = document.getElementById('viewer-status');
const filter = document.getElementById('viewer-filter');
const colors = {天面:0x84b941,側面:0x009dce,背面:0xe7ac00,水平面:0x49a46a};
const configs = {
    small:{width:700,depth:350,height:1052,levels:[1050,700,350,0],shelf:353},
    large:{width:900,depth:450,height:1050,levels:[1050,700,350,0],shelf:353}
};
let state = window.shelfState || {size:'small',selected:[]};
let currentSize, generation = 0, renderer, scene, camera, controls, model, surfaces;
let faceObjects = [], examples = [], hovered = null, visible = true;
const cache = new Map();
let products = [], productGroup, nextProductId = 1;
const number = id => String.fromCodePoint(0x245f+id);
const checkbox = id => document.querySelector(`#face-groups input[value="${id}"]`);

function toggle(id) {
    const input = checkbox(id);
    if (input.disabled) {
        status.textContent = `${number(id)}は、${input.dataset.requirement}です。`;
        return;
    }
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    status.textContent = `${input.closest('label').innerText.split('\n')[0]}・${input.closest('fieldset').querySelector('legend').textContent}を${input.checked ? '選択しました' : '解除しました'}。${input.dataset.usage ? input.dataset.usage+'です。' : ''}料金を更新しました。`;
}

function highlight(id) {
    hovered = id;
    document.querySelectorAll('.face-option').forEach(label => label.classList.toggle('face-highlight',Number(label.querySelector('input').value) === id));
    refresh();
}

function refresh() {
    for (const face of faceObjects) {
        const selected = state.selected.includes(face.id);
        const active = hovered === face.id;
        const shown = filter.value === 'all' || filter.value === face.type;
        face.mesh.visible = shown;
        face.mesh.material.opacity = active ? .7 : selected ? .55 : .12;
        face.outline.visible = shown;
        face.outline.material.opacity = active || selected ? 1 : .45;
        face.button.hidden = !shown;
        face.button.classList.toggle('is-selected',selected);
        face.button.classList.toggle('is-highlighted',active);
        face.button.classList.toggle('is-locked',checkbox(face.id).disabled);
        face.button.setAttribute('aria-pressed',String(selected));
        face.button.setAttribute('aria-disabled',String(checkbox(face.id).disabled));
        face.button.title = `${checkbox(face.id).closest('label').innerText.replace(/\n/g,' ')}・${face.type}`;
        face.button.setAttribute('aria-label',face.button.title);
    }
    for (const example of examples) example.group.visible = document.getElementById('show-examples').checked && (filter.value === 'all' || filter.value === example.type);
}

function dispose(group) {
    group.traverse(object => {
        object.geometry?.dispose();
        if (object.material) {object.material.map?.dispose();object.material.dispose();}
    });
    scene.remove(group);
}

function makeFaces(config) {
    if (surfaces) dispose(surfaces);
    surfaces = new THREE.Group();
    scene.add(surfaces);
    labels.replaceChildren();
    faceObjects = [];
    examples = [];
    const {width:w,depth:d,levels:l,shelf} = config;
    function add(id,type,position,width,height,rotation,labelPosition=position) {
        const geometry = new THREE.PlaneGeometry(width,height);
        const mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:colors[type],transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.userData.faceId = id;
        const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:colors[type],transparent:true,opacity:.45}));
        outline.position.copy(mesh.position);
        outline.rotation.copy(mesh.rotation);
        surfaces.add(mesh,outline);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'shelf-number';
        button.style.setProperty('--face-color',`#${colors[type].toString(16).padStart(6,'0')}`);
        button.textContent = number(id);
        button.addEventListener('click',() => toggle(id));
        button.addEventListener('pointerenter',() => highlight(id));
        button.addEventListener('pointerleave',() => highlight(null));
        button.addEventListener('focus',() => highlight(id));
        button.addEventListener('blur',() => highlight(null));
        labels.append(button);
        faceObjects.push({id,type,mesh,outline,button,anchor:new THREE.Vector3(...labelPosition)});
    }
    // Front is +Z, left is -X. Top and shelf are split into left/right halves.
    add(1,'天面',[-w/4,l[0]+6,0],w/2,d,[-Math.PI/2,0,0]);
    add(2,'天面',[ w/4,l[0]+6,0],w/2,d,[-Math.PI/2,0,0]);
    for(let row=0;row<3;row++) {
        const y=(l[row]+l[row+1])/2,h=l[row]-l[row+1];
        add(3+row*2,'側面',[-w/2-6,y,0],d,h,[0,Math.PI/2,0]);
        add(4+row*2,'側面',[ w/2+6,y,0],d,h,[0,Math.PI/2,0]);
        add(9+row*2,'背面',[-w/4,y,-d/2-6],w/2,h,[0,0,0]);
        add(10+row*2,'背面',[w/4,y,-d/2-6],w/2,h,[0,0,0]);
    }
    add(15,'水平面',[-w/4,shelf+5,0],w/2,d,[-Math.PI/2,0,0],[-w/4,shelf+10,d*.32]);
    add(16,'水平面',[w/4,shelf+5,0],w/2,d,[-Math.PI/2,0,0],[w/4,shelf+10,d*.32]);
    // Illustrative products: suspended below the top, resting above the shelf board.
    for (const x of [-w/4,w/4]) {
        for (const type of ['天面','水平面']) {
            const group = new THREE.Group();
            const hanging = type === '天面';
            const boxHeight = hanging ? 120 : 85;
            const bottom = hanging ? l[0]-265 : shelf+8;
            const box = new THREE.Mesh(new THREE.BoxGeometry(110,boxHeight,75),new THREE.MeshStandardMaterial({color:hanging?0xe48643:0x478bbe,roughness:.85,transparent:true,opacity:.9}));
            box.position.set(x,bottom+boxHeight/2,0);
            group.add(box);
            if (hanging) for (const dx of [-35,35]) {
                const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x+dx,l[0]-3,0),new THREE.Vector3(x+dx,bottom+boxHeight,0)]),new THREE.LineBasicMaterial({color:0x795733}));
                group.add(line);
            }
            surfaces.add(group);
            examples.push({group,type});
        }
    }
    faceObjects.sort((a,b)=>a.id-b.id);
    for (const face of faceObjects) labels.append(face.button);
    refresh();
}

async function geometryFor(size) {
    if (!cache.has(size)) cache.set(size,(async () => {
        const response = await fetch(size === 'large' ? 'models/large-1050.bin' : 'models/small.bin');
        if (!response.ok) throw Error(`Model HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const header = new Uint32Array(buffer,0,2);
        if (buffer.byteLength !== 8+(header[0]+header[1])*4) throw Error('Invalid model');
        return {positions:new Float32Array(buffer,8,header[0]),indices:new Uint32Array(buffer,8+header[0]*4,header[1])};
    })().catch(error => {cache.delete(size);throw error;}));
    return cache.get(size);
}

function view(direction='perspective') {
    const h=configs[state.size].height;
    const target = new THREE.Vector3(0,h/2,0);
    const positions = {perspective:[h*1.15,h*1.05,h*1.7],front:[0,h/2,h*2.4],back:[0,h/2,-h*2.4],top:[0,h*2.8,1]};
    camera.position.set(...positions[direction]);
    controls.target.copy(target);
    controls.update();
}

async function setSize(size) {
    const request = ++generation;
    currentSize = size;
    if (model) {dispose(model);model=null;}
    makeFaces(configs[size]);
    renderProducts();
    view();
    loading.hidden = false;
    loading.textContent = `${size==='large'?'大型棚':'小型棚'}の3Dデータを読み込んでいます…`;
    try {
        const data = await geometryFor(size);
        if (request !== generation) return;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
        geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
        geometry.computeVertexNormals();
        model = new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x717b78,roughness:.75,metalness:.25,side:THREE.DoubleSide}));
        scene.add(model);
        loading.hidden = true;
        status.textContent = `${size==='large'?'大型棚':'小型棚'}を表示中。番号を押して面を選べます。`;
    } catch(error) {
        if (request !== generation) return;
        loading.textContent = '棚本体を読み込めませんでした。色付きの面と番号図で位置をご確認ください。';
        console.error('Shelf model:',error);
    }
}

function renderProducts() {
    if (productGroup) dispose(productGroup);
    productGroup = new THREE.Group();
    scene.add(productGroup);
    const config=configs[state.size];
    const {warnings,bounds}=inspectProducts(products,config,state.selected);
    const summary=document.getElementById('product-summary');
    summary.replaceChildren();
    const plan=[];
    products.forEach((product,i)=>{
        const b=bounds[i],area=PRODUCT_AREAS[product.area];
        const warning=warnings.get(product.id);
        const color=warning.length?0xc17825:0x326fba;
        const box=new THREE.Mesh(new THREE.BoxGeometry(b.width,product.height,b.depth),new THREE.MeshStandardMaterial({color,transparent:true,opacity:.85,roughness:.8}));
        box.userData.productId=product.id;
        box.position.set(...b.min.map((v,axis)=>(v+b.max[axis])/2));
        productGroup.add(box);
        const edges=new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry),new THREE.LineBasicMaterial({color:0x244039}));
        edges.position.copy(box.position);
        productGroup.add(edges);
        if(area.hanging)for(const x of [b.min[0]+b.width*.25,b.min[0]+b.width*.75]) {
            productGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,config.levels[0],box.position.z),new THREE.Vector3(x,b.max[1],box.position.z)]),new THREE.LineBasicMaterial({color:0x795733})));
        }
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,128,64);ctx.fillStyle='#244039';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText(`P${product.id}`,64,45);
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));
        sprite.position.set(box.position.x,b.max[1]+22,box.position.z);sprite.scale.set(65,32,1);productGroup.add(sprite);
        const row=document.createElement('div');row.className='product-record';
        const title=document.createElement('strong');title.textContent=`P${product.id} ${product.name}`;row.append(title);
        const text=document.createElement('p');text.textContent=`${product.width} × ${product.depth} × ${product.height}mm（幅・奥行・高さ）${product.rotated?'／90度回転':''}｜${area.label}｜区画左端から${product.x}mm・手前から${product.z}mm${area.hanging?'・吊り長さ'+product.gap+'mm':''}`;row.append(text);
        for(const message of warning){const note=document.createElement('p');note.className='product-warning';note.textContent=message;row.append(note);}
        if(!warning.length){const note=document.createElement('p');note.textContent='目安の区画内に収まっています。設置可否は店舗へご確認ください。';row.append(note);}
        summary.append(row);
        plan.push(`${title.textContent}\n${text.textContent}\n${warning.length?warning.join('\n'):'目安の区画内'}`);
    });
    window.shelfProductsText=products.length?'\n\n商品配置（参考・mm）\n'+plan.join('\n\n'):'';
    document.getElementById('copy-status').textContent='';
}

function setupProducts() {
    const form=document.getElementById('product-form'),edit=document.getElementById('product-edit');
    const field=name=>document.getElementById('product-'+name);
    const message=document.getElementById('product-message');
    function updateArea(){field('gap').disabled=!PRODUCT_AREAS[Number(field('area').value)].hanging;}
    function fillEditor() {
        const product=products.find(p=>p.id===Number(edit.value));
        for(const name of ['name','width','depth','height','area','x','z','gap'])field(name).value=product?product[name]:({name:'',width:150,depth:100,height:100,area:15,x:20,z:20,gap:50})[name];
        field('rotated').checked=!!product?.rotated;
        field('save').textContent=product?'変更を反映':'3Dに追加';field('delete').disabled=!product;
        updateArea();
    }
    function updateEditorOptions(id) {
        edit.replaceChildren(new Option('新しい商品を追加','new'));
        for(const product of products)edit.add(new Option(`P${product.id} ${product.name}`,String(product.id)));
        edit.value=id?String(id):'new';fillEditor();
    }
    edit.addEventListener('change',fillEditor);
    field('area').addEventListener('change',updateArea);
    form.addEventListener('submit',event=>{
        event.preventDefault();
        if(!form.reportValidity())return;
        const previous=products.find(p=>p.id===Number(edit.value));
        if(!previous&&products.length>=40){message.textContent='商品は40件まで追加できます。不要な商品を削除してください。';return;}
        const product={id:previous?previous.id:nextProductId++,name:field('name').value.trim()||'商品',rotated:field('rotated').checked};
        for(const name of ['width','depth','height','area','x','z','gap'])product[name]=Number(field(name).value);
        if(!PRODUCT_AREAS[product.area]||!['width','depth','height','x','z','gap'].every(name=>Number.isFinite(product[name])))return;
        if(previous)products=products.map(p=>p.id===product.id?product:p);else products.push(product);
        document.getElementById('show-examples').checked=false;refresh();
        updateEditorOptions(product.id);renderProducts();
        message.textContent=`P${product.id}を${previous?'更新':'追加'}しました。3Dと下の配置チェックをご確認ください。`;
    });
    field('delete').addEventListener('click',()=>{
        products=products.filter(p=>p.id!==Number(edit.value));updateEditorOptions();renderProducts();message.textContent='選択した商品を削除しました。';
    });
    updateArea();
}

try {
    renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0xf3f7f5,1);
    viewport.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden','true');
    scene = new THREE.Scene();
    setupProducts();
    camera = new THREE.PerspectiveCamera(38,1,1,20000);
    controls = new OrbitControls(camera,renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 650;
    controls.maxDistance = 5000;
    scene.add(new THREE.HemisphereLight(0xffffff,0x798c80,2.5));
    const light = new THREE.DirectionalLight(0xffffff,3);
    light.position.set(600,1700,1300);
    scene.add(light);
    new ResizeObserver(() => {
        const {width,height} = viewport.getBoundingClientRect();
        renderer.setSize(width,height,false);
        camera.aspect = width/height;
        camera.updateProjectionMatrix();
    }).observe(viewport);
    new IntersectionObserver(entries => {visible=entries[0].isIntersecting;}).observe(viewport);
    const projected = new THREE.Vector3();
    const target = new THREE.Vector3();
    renderer.setAnimationLoop(() => {
        if (!visible || document.hidden) return;
        renderer.render(scene,camera);
        const w=viewport.clientWidth,h=viewport.clientHeight;
        for (const face of faceObjects) {
            projected.copy(face.anchor).project(camera);
            const onScreen = projected.z > -1 && projected.z < 1 && Math.abs(projected.x)<1 && Math.abs(projected.y)<1;
            face.button.style.visibility = onScreen ? 'visible' : 'hidden';
            face.button.style.left = `${(projected.x+1)*w/2}px`;
            face.button.style.top = `${(1-projected.y)*h/2}px`;
            face.button.style.zIndex = String(Math.round(1000-camera.position.distanceTo(target.copy(face.anchor))/10));
        }
    });
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let start;
    renderer.domElement.addEventListener('pointerdown',event => {start={x:event.clientX,y:event.clientY};});
    renderer.domElement.addEventListener('pointerup',event => {
        if (!start || Math.hypot(event.clientX-start.x,event.clientY-start.y)>5) return;
        const rect=renderer.domElement.getBoundingClientRect();
        pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
        raycaster.setFromCamera(pointer,camera);
        const hits=raycaster.intersectObjects([...faceObjects.filter(face=>face.mesh.visible).map(face=>face.mesh),...(productGroup?.children.filter(object=>object.isMesh)||[])]);
        if(hits.length) {
            const productId=hits[0].object.userData.productId;
            if(productId){
                const editor=document.getElementById('product-edit');editor.value=String(productId);editor.dispatchEvent(new Event('change'));
                status.textContent=`商品P${productId}を編集対象にしました。下の入力欄で寸法・位置を変更できます。`;
            } else toggle(hits[0].object.userData.faceId);
        }
    });
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>view(button.dataset.view)));
    document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
        const factor=button.dataset.zoom==='in'?.8:1.25;
        const offset=camera.position.clone().sub(controls.target).multiplyScalar(factor);
        offset.setLength(THREE.MathUtils.clamp(offset.length(),controls.minDistance,controls.maxDistance));
        camera.position.copy(controls.target).add(offset);
        controls.update();
    }));
    filter.addEventListener('change',refresh);
    document.getElementById('show-examples').addEventListener('change',refresh);
    document.getElementById('face-groups').addEventListener('pointerover',event=>{const label=event.target.closest('.face-option');if(label)highlight(Number(label.querySelector('input').value));});
    document.getElementById('face-groups').addEventListener('pointerleave',()=>highlight(null));
    window.addEventListener('shelf-state-change',event=>{
        state=event.detail;
        if (state.size!==currentSize) setSize(state.size);
        else {refresh();renderProducts();}
    });
    renderer.domElement.addEventListener('webglcontextlost',event=>{
        event.preventDefault();
        loading.hidden=false;
        loading.textContent='3D表示が中断されました。ページを再読み込みするか、下の番号図をご確認ください。';
    });
    setSize(state.size);
} catch(error) {
    loading.textContent='この環境では3D表示を利用できません。下の番号図をご確認ください。料金計算はそのまま利用できます。';
    document.querySelector('.shelf-viewer details').open=true;
    document.querySelectorAll('.viewer-toolbar button,#viewer-filter,#product-form input,#product-form select,#product-form button,#product-edit').forEach(input=>{input.disabled=true;});
    console.error('Shelf viewer:',error);
}
