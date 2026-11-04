
(()=>{
const root=document.getElementById('dw-composer');
const layout=root.querySelector('.dw-layout');
const previewPanel=layout.querySelector('aside');
const basicPanel=layout.querySelector('.dw-panel:not(.dw-product-panel)');
const productPanel=layout.querySelector('.dw-product-panel');
const toolbar=document.createElement('div');toolbar.className='dw-product-toolbar';
for(const selector of ['.dw-section-head','.dw-add-actions','.dw-join']){const control=productPanel.querySelector(selector);if(control)toolbar.append(control);}
productPanel.append(toolbar);

previewPanel.classList.add('dw-preview-column');basicPanel.classList.add('dw-basic-column');
layout.replaceChildren(previewPanel,basicPanel,productPanel);

const todayInKorea=()=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=type=>parts.find(p=>p.type===type).value;return part('year')+'-'+part('month')+'-'+part('day')};
root.querySelector('[data-field="date"]').value=todayInKorea();
const blank=(product='')=>({product,color:'',size:'',qty:'',note:'',label:''});
const state={type:'발주서',mobile:false,spacing:22,groups:[
{rows:[{product:'YA-07E',color:'197',size:'900×2100',qty:'1개',note:'양면엣지, 상부 1142 실타',label:'입구'},{product:'YA-07E',color:'197',size:'833×2049',qty:'1개',note:'양면엣지, 상부 1146 실타',label:'입구'}]},
{rows:[{product:'YA-07E',color:'197',size:'835×2048',qty:'1개',note:'양면엣지, 상부 1146 실타',label:'후면'}]}
]};
const frequentOptions=['식무','식기유','가스켓','완조립','비조립','양면엣지','하부 950 실타','행거홈','좌우다대 심재보강','MDF 프레임몰딩(돌출: )','PVC 프레임몰딩(돌출: )','밀때 좌손','밀때 우손','당길때 좌손','당길때 우손'];
const sampleGroups=JSON.parse(JSON.stringify(state.groups));state.groups=[{rows:[blank()]}];
const labels={product:'제품',color:'색상',size:'사이즈',qty:'수량',note:'비고',label:'라벨'};
const slots=root.querySelector('.dw-items');
const productNav=document.createElement('nav');productNav.className='dw-product-nav';productNav.setAttribute('aria-label','제품 번호로 이동');slots.after(productNav);

const status=root.querySelector('.dw-status');
const selected=new Set();
const showStatus=message=>status.textContent=message;
const rerender=()=>{items();preview()};
let outputPages=[];
const previewTools=document.createElement('div');previewTools.className='dw-preview-tools';
const zoomSelect=document.createElement('select');zoomSelect.setAttribute('aria-label','미리보기 확대 비율');
for(const [value,text] of [['fit','내용 맞춤'],['100','100%'],['125','125%'],['150','150%']]){const option=document.createElement('option');option.value=value;option.textContent=text;zoomSelect.append(option);}zoomSelect.value='fit';
const expandButton=document.createElement('button');expandButton.type='button';expandButton.className='cursor-interaction';expandButton.textContent='크게 보기';
previewTools.append(zoomSelect,expandButton);previewPanel.querySelector('.dw-preview-head').append(previewTools);
function applyPreviewZoom(){root.querySelectorAll('.dw-paper>svg').forEach(page=>page.style.width=zoomSelect.value==='fit'?'100%':(794*Number(zoomSelect.value)/100)+'px');}
zoomSelect.addEventListener('change',applyPreviewZoom);
const previewDialog=document.createElement('dialog');previewDialog.className='dw-preview-dialog';previewDialog.setAttribute('aria-label','발주서 크게 보기');
const dialogHead=document.createElement('div');dialogHead.className='dw-dialog-header';
const dialogTitle=document.createElement('strong');dialogTitle.textContent='A4 문서 미리보기';
const dialogClose=document.createElement('button');dialogClose.type='button';dialogClose.textContent='닫기';dialogClose.className='cursor-interaction';dialogClose.onclick=()=>previewDialog.close();
const dialogBody=document.createElement('div');dialogBody.className='dw-dialog-body';dialogHead.append(dialogTitle,dialogClose);previewDialog.append(dialogHead,dialogBody);root.append(previewDialog);
expandButton.onclick=()=>{dialogBody.replaceChildren(...OrderOutput.draw(getModel(),{vector:true}));previewDialog.showModal();};

function getModel(){const fields={};root.querySelectorAll('[data-field]').forEach(input=>fields[input.dataset.field]=input.value);return {...fields,type:state.type,groups:state.groups};}
function fitOptions(){
root.querySelectorAll('.dw-product-note').forEach(input=>{
 const style=getComputedStyle(input);const line=parseFloat(style.lineHeight)||18;
 const padding=(parseFloat(style.paddingTop)||7)+(parseFloat(style.paddingBottom)||7);
 const border=(parseFloat(style.borderTopWidth)||1)+(parseFloat(style.borderBottomWidth)||1);
 const min=line+padding+border,max=line*2+padding+border;
 input.style.height=min+'px';
 const needed=(input.scrollHeight||min-border)+border;
 input.style.height=Math.min(max,Math.max(min,needed))+'px';
 input.style.overflowY=needed>max?'auto':'hidden';
});
}
function valueCell(value,key){
const td=document.createElement('td');
if(key!=='note'){td.textContent=value;if(key==='product'||key==='size'){td.className='dw-single-line';const text=document.createElement('span');text.textContent=value;td.replaceChildren(text)}return td;}
td.className='dw-option-cell';
const chunks=String(value).match(/[^,]*,|[^,]+$/g)||[];
chunks.forEach((chunk,index)=>{const token=document.createElement('span');token.className='dw-option-token';token.textContent=chunk;td.append(token);if(index<chunks.length-1)td.append(document.createElement('wbr'))});
return td;
}
function preview(){
fitOptions();
[...root.querySelectorAll('[data-field]'),...root.querySelectorAll('.dw-product-fields input'),...root.querySelectorAll('.dw-product-note')].forEach(input=>input.classList.toggle('dw-empty-input',!input.value.trim()));
root.querySelectorAll('[data-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===state.type)));
root.querySelector('.dw-count').textContent=state.groups.length+'개 번호 · '+state.groups.reduce((n,g)=>n+g.rows.length,0)+'개 제품';
try{outputPages=OrderOutput.draw(getModel(),{vector:true,crop:true});root.querySelector('.dw-paper').replaceChildren(...outputPages);applyPreviewZoom();}catch(error){showStatus(error.message);}
}
function button(text,handler){const b=document.createElement('button');b.type='button';b.className='cursor-interaction';b.textContent=text;b.onclick=handler;return b;}
function updateSelection(){const join=root.querySelector('[data-action="join"]');join.disabled=selected.size<2;join.textContent=selected.size?'세트로 묶기 ('+selected.size+'개)':'선택 항목 세트로 묶기';}
function updateRailEndSpace(){
const lastCard=slots.lastElementChild;
if(!lastCard){slots.style.setProperty('--dw-rail-end-space','0px');return;}
const style=getComputedStyle(slots);
const maxHeight=parseFloat(style.maxHeight);
const limit=Number.isFinite(maxHeight)?maxHeight:slots.clientHeight;
const height=lastCard.getBoundingClientRect().height;
const margin=parseFloat(getComputedStyle(lastCard).marginBottom)||0;
// Derive the spacer from the fixed rail limit, not its own resulting height.
const value=Number.isFinite(limit)?Math.max(0,limit-height-margin):0;
const spacer=value.toFixed(2)+'px';
if(slots.style.getPropertyValue('--dw-rail-end-space')!==spacer)slots.style.setProperty('--dw-rail-end-space',spacer);
}
function highlightProductNav(){
const cards=[...slots.children];if(!cards.length)return;
const viewport=slots.getBoundingClientRect();
let nearestGroup=0,nearestRow=0,distance=Infinity;
cards.forEach((card,index)=>{const d=Math.abs(card.getBoundingClientRect().top-viewport.top);if(d<distance){distance=d;nearestGroup=index;}});
const members=cards[nearestGroup].querySelector('.dw-members');
if(members){const left=members.getBoundingClientRect().left;let closest=Infinity;[...members.children].forEach((part,index)=>{const d=Math.abs(part.getBoundingClientRect().left-left);if(d<closest){closest=d;nearestRow=index}});}
[...productNav.children].forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.group)===nearestGroup&&(b.dataset.row===undefined||Number(b.dataset.row)===nearestRow))));
}
function goToProduct(groupIndex,rowIndex=0){
const card=slots.children[groupIndex];if(!card)return;
const members=card.querySelector('.dw-members');
const target=members?.children[rowIndex];if(!target)return;
updateRailEndSpace();
const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
const viewport=slots.getBoundingClientRect(),box=card.getBoundingClientRect();
slots.scrollTo({top:Math.max(0,slots.scrollTop+box.top-viewport.top-slots.clientTop),left:0,behavior});
const memberViewport=members.getBoundingClientRect(),partBox=target.getBoundingClientRect();
members.scrollTo({left:Math.max(0,members.scrollLeft+partBox.left-memberViewport.left-members.clientLeft),top:0,behavior});
const input=target.querySelector('input');if(input)input.focus({preventScroll:true});
}
function moveProduct(fromGroup,fromRow,toGroup,toRow){
const member=fromRow!==undefined;
if(member&&(fromGroup!==toGroup||toRow===undefined))return false;
if(!member&&toRow!==undefined)return false;
const list=member?state.groups[fromGroup]?.rows:state.groups;
const from=member?fromRow:fromGroup,to=member?toRow:toGroup;
if(!list||from===to||from<0||to<0||from>=list.length||to>=list.length)return false;
const [entry]=list.splice(from,1);list.splice(to,0,entry);
rerender();goToProduct(member?fromGroup:to,member?to:0);
showStatus(member?'세트 구성품 순서를 변경했습니다.':'제품 순서를 변경했습니다.');
return true;
}
function enableProductReorder(b,groupIndex,rowIndex){
let drag=null,blockClick=false;
const member=rowIndex!==undefined;
b.title=member?'끌어서 같은 세트 안의 순서 변경 · Alt+방향키로도 이동':'끌어서 제품 순서 변경 · Alt+방향키로도 이동';
b.setAttribute('aria-keyshortcuts','Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown');
b.addEventListener('click',event=>{if(blockClick){event.preventDefault();event.stopImmediatePropagation();blockClick=false;}},true);
b.addEventListener('dragstart',event=>event.preventDefault());
function clear(){
 const previous=drag;drag=null;
 b.classList.toggle('dw-nav-dragging',false);
 productNav.querySelectorAll('.dw-nav-drop').forEach(target=>target.classList.toggle('dw-nav-drop',false));
 if(previous&&b.hasPointerCapture?.(previous.id))b.releasePointerCapture(previous.id);
}
function targetAt(x,y){
 const target=document.elementFromPoint(x,y)?.closest('.dw-product-nav-button');
 if(!target||!Array.from(productNav.children).includes(target))return null;
 const targetMember=target.dataset.row!==undefined;
 if(member!==targetMember||member&&Number(target.dataset.group)!==groupIndex)return null;
 return target;
}
b.addEventListener('pointerdown',event=>{
 if(event.button!==0||event.isPrimary===false)return;
 blockClick=false;drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,target:null};
 b.setPointerCapture(event.pointerId);
});
b.addEventListener('pointermove',event=>{
 if(!drag||event.pointerId!==drag.id)return;
 if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
 drag.moved=true;blockClick=true;event.preventDefault();b.classList.toggle('dw-nav-dragging',true);
 const bounds=productNav.getBoundingClientRect();
 if(event.clientY<bounds.top+12)productNav.scrollTop-=12;
 else if(event.clientY>bounds.bottom-12)productNav.scrollTop+=12;
 const target=targetAt(event.clientX,event.clientY);drag.target=target;
 productNav.querySelectorAll('.dw-product-nav-button').forEach(item=>item.classList.toggle('dw-nav-drop',item===target&&item!==b));
});
b.addEventListener('pointerup',event=>{
 if(!drag||event.pointerId!==drag.id)return;
 const moved=drag.moved,target=moved?targetAt(event.clientX,event.clientY):null;
 clear();
 if(moved){event.preventDefault();if(target)moveProduct(groupIndex,rowIndex,Number(target.dataset.group),target.dataset.row===undefined?undefined:Number(target.dataset.row));}
});
b.addEventListener('pointercancel',clear);b.addEventListener('lostpointercapture',clear);
b.addEventListener('keydown',event=>{
 if(event.key==='Escape'){clear();return;}
 if(!event.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
 event.preventDefault();const delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;
 const next=member?rowIndex+delta:groupIndex+delta;
 if(moveProduct(groupIndex,rowIndex,member?groupIndex:next,member?next:undefined)){
  const target=Array.from(productNav.children).find(item=>Number(item.dataset.group)===(member?groupIndex:next)&&(member?Number(item.dataset.row)===next:item.dataset.row===undefined));
  target?.focus({preventScroll:true});
 }
});
}
function renderProductNav(){
productNav.replaceChildren();
function addNavigation(groupIndex,rowIndex){
const text=String(groupIndex+1)+(rowIndex===undefined?'':'-'+(rowIndex+1));
const navButton=button(text,()=>goToProduct(groupIndex,rowIndex===undefined?0:rowIndex));
navButton.dataset.group=groupIndex;
if(rowIndex!==undefined){navButton.dataset.row=rowIndex;navButton.classList.add('dw-subproduct-nav');}
navButton.setAttribute('aria-label','제품 '+text+'번 입력칸으로 이동. 끌거나 Alt와 방향키로 순서 변경');navButton.classList.add('dw-product-nav-button');enableProductReorder(navButton,groupIndex,rowIndex);productNav.append(navButton);
}
state.groups.forEach((group,index)=>{addNavigation(index);if(group.rows.length>1)group.rows.forEach((row,rowIndex)=>addNavigation(index,rowIndex));});highlightProductNav();
}
slots.addEventListener('scroll',highlightProductNav,{passive:true});
let railFrame=0;
function scheduleRailLayout(){
if(railFrame)return;
railFrame=requestAnimationFrame(()=>{railFrame=0;fitOptions();updateRailEndSpace();highlightProductNav();});
}
if(globalThis.ResizeObserver){new ResizeObserver(scheduleRailLayout).observe(slots);}
window.addEventListener('resize',scheduleRailLayout);
function items(){
const savedScroll=slots.scrollTop;
const memberScroll=[...slots.children].map(card=>card.querySelector('.dw-members')?.scrollLeft||0);
slots.replaceChildren();
state.groups.forEach((group,index)=>{
const isSet=group.rows.length>1;
const card=document.createElement('section');card.className='dw-item'+(isSet?' dw-set':'');card.style.setProperty('--dw-members',group.rows.length);
const top=document.createElement('div');top.className='dw-item-top';
const title=document.createElement('span');const no=document.createElement('em');no.textContent=String(index+1).padStart(2,'0');title.append(no,document.createTextNode('제품 항목'));
{const label=document.createElement('label');label.className='dw-pick';const check=document.createElement('input');check.type='checkbox';check.checked=selected.has(group);check.setAttribute('aria-label',(index+1)+'번 '+(isSet?'세트 전체':'단품')+'를 세트로 묶기 위해 선택');check.onchange=()=>{if(check.checked)selected.add(group);else selected.delete(group);updateSelection()};label.append(check,document.createTextNode('선택'));title.append(label)}
const actions=document.createElement('div');actions.className='dw-item-actions';
if(isSet)actions.append(button('+ 제품 추가',()=>{const row=blank();row.label=group.rows[0].label;group.rows.push(row);rerender();goToProduct(index,group.rows.length-1)}));
if(isSet)actions.append(button('세트 해제',()=>{state.groups.splice(index,1,...group.rows.map(row=>({rows:[row]})));selected.clear();rerender()}));
actions.append(button(isSet?'세트 삭제':'삭제',()=>{selected.delete(group);state.groups.splice(index,1);rerender()}));
top.append(title,actions);card.append(top);
const members=document.createElement('div');members.className='dw-members';members.setAttribute('role','group');members.setAttribute('aria-label',(index+1)+'번 제품 입력');members.addEventListener('scroll',highlightProductNav,{passive:true});card.append(members);
group.rows.forEach((row,rowIndex)=>{
const part=document.createElement('div');part.className='dw-part';

const grid=document.createElement('div');grid.className='dw-product-fields';
['product','color','qty','size','label','note'].forEach(key=>{const label=document.createElement('label');label.textContent=labels[key];if(key==='size')label.className='dw-span2';if(key==='note')label.className='dw-wide';if(key==='label'&&isSet&&rowIndex>0)return;const input=document.createElement(key==='note'?'textarea':'input');if(key==='note'){input.className='dw-product-note';input.rows=1;input.setAttribute('rows','1');}input.value=row[key];input.setAttribute('aria-label',(index+1)+'번 '+(isSet?(rowIndex+1)+'번째 제품 ':'')+labels[key]);input.placeholder=key==='qty'?'예: 1개, 2박스':key==='size'?'예: 833×2049':labels[key]+' 입력';input.oninput=()=>{row[key]=input.value;if(key==='label')group.rows.forEach(r=>r.label=input.value);preview()};label.append(input);grid.append(label);
if(key==='note'){
const options=document.createElement('div');options.className='dw-quick-options dw-wide';options.setAttribute('role','group');options.setAttribute('aria-label',(index+1)+'번 '+(rowIndex+1)+'번째 제품 자주 쓰는 비고 옵션');
const optionButtons=[];
const syncOptions=()=>{const values=row.note.split(',').map(v=>v.trim());optionButtons.forEach(b=>b.setAttribute('aria-pressed',String(values.includes(b.textContent))))};
let optionRow;
frequentOptions.forEach((option,optionIndex)=>{
if([0,5,7,9,11].includes(optionIndex)){optionRow=document.createElement('div');optionRow.className='dw-option-row';options.append(optionRow);}
const chip=button(option,()=>{
const values=row.note.split(',').map(v=>v.trim()).filter(Boolean);
const exists=values.includes(option);
row.note=(exists?values.filter(v=>v!==option):[...values,option]).join(', ');
input.value=row.note;syncOptions();preview();
});
chip.classList.add('dw-option-button');optionButtons.push(chip);optionRow.append(chip);
});
input.addEventListener('input',syncOptions);syncOptions();grid.append(options);
}
});
part.append(grid);members.append(part);
});slots.append(card);members.scrollLeft=memberScroll[index]||0;
});updateRailEndSpace();slots.scrollTop=savedScroll;updateSelection();renderProductNav();
}
root.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('input',preview));
root.querySelectorAll('[data-type]').forEach(el=>el.onclick=()=>{state.type=el.dataset.type;preview()});
root.querySelector('[data-action="add"]').onclick=()=>{state.groups.push({rows:[blank()]});rerender();goToProduct(state.groups.length-1)};
root.querySelector('[data-action="add-set"]').onclick=()=>{state.groups.push({rows:[blank(),blank()]});rerender();goToProduct(state.groups.length-1)};
root.querySelector('[data-action="join"]').onclick=()=>{
if(selected.size<2)return;
const indices=state.groups.map((g,i)=>selected.has(g)?i:-1).filter(i=>i>=0);
if(indices.length<2)return;
const rows=indices.flatMap(i=>state.groups[i].rows);
const distinctLabels=[...new Set(rows.map(row=>row.label).filter(Boolean))];
const commonLabel=distinctLabels.join(' / ');rows.forEach(row=>row.label=commonLabel);
const first=indices[0];
for(let i=indices.length-1;i>0;i--)state.groups.splice(indices[i],1);
state.groups.splice(first,1,{rows});selected.clear();showStatus('');rerender();goToProduct(first);
};
let resetting=false;
root.querySelector('[data-action="reset"]').onclick=()=>{if(!resetting){resetting=true;root.querySelector('[data-action="reset"]').textContent='초기화 확인';showStatus('작성 내용이 지워집니다. 초기화 확인을 누르면 새 문서를 작성합니다.');return;}root.querySelectorAll('[data-field]').forEach(el=>{el.value=el.dataset.field==='date'?todayInKorea():''});state.groups=[{rows:[blank()]}];selected.clear();resetting=false;root.querySelector('[data-action="reset"]').textContent='새로 작성';showStatus('');rerender()};
let exporting=false;
root.querySelectorAll('[data-export]').forEach(el=>el.onclick=async()=>{
if(exporting||el.disabled)return;
exporting=true;el.disabled=true;
try{
if(el.dataset.export==='이미지 복사'){showStatus('이미지를 복사하고 있습니다…');showStatus(await OrderOutput.copyImage(getModel()));return;}
await document.fonts.ready;const model=getModel();const pages=OrderOutput.draw(model);
if(el.dataset.export==='JPG 저장'){showStatus(await OrderOutput.saveJpg(pages,model));}
else if(el.dataset.export==='Word 저장'){const blob=WordWriter.build(model);OrderOutput.download(blob,OrderOutput.filename(model)+'.docx');showStatus('Word 파일(.docx) 다운로드를 시작했습니다.');}
else if(el.dataset.export==='종이 인쇄'){showStatus('인쇄창에서 프린터와 용지 설정을 확인하세요.');await OrderOutput.print(pages,model);}
}catch(error){showStatus(el.dataset.export==='이미지 복사'&&['NotAllowedError','SecurityError'].includes(error.name)?'이미지 복사 권한이 필요합니다. 브라우저에서 허용하거나 JPG 저장을 이용해 주세요.':error.message||'출력 중 오류가 발생했습니다.');}finally{exporting=false;el.disabled=false;}
});
root.querySelector('[data-action="sample"]').onclick=()=>{
if(!window.confirm('현재 입력 내용을 예시로 바꾸시겠습니까?'))return;
const example={recipient:'영림임업',person:'',phone:'',site:'',delivery:'협의',note:''};
root.querySelectorAll('[data-field]').forEach(el=>{if(el.dataset.field!=='date')el.value=example[el.dataset.field]||''});
state.groups=JSON.parse(JSON.stringify(sampleGroups));selected.clear();rerender();
};
rerender();
window.addEventListener('beforeunload',event=>{const model=getModel();const hasData=['recipient','person','phone','site','delivery','note'].some(k=>model[k])||model.groups.some(g=>g.rows.some(row=>Object.values(row).some(Boolean)));if(hasData){event.preventDefault();event.returnValue='';}});
if(document.fonts)document.fonts.ready.then(preview);
function appearance(){root.classList.toggle('dw-mobile',state.mobile);root.style.setProperty('--dw-space',state.spacing+'px')}
appearance();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
})();
