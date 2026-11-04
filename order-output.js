/* A single A4 renderer is used by preview, printing and JPEG downloads. */
(function(global){
'use strict';
const W=794,H=1123,M=45,BOTTOM=1065;
const COLS=[40,105,64,113,56,220,106];
const KEYS=['product','color','size','qty','note','label'];
const FONT='"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
function font(ctx,size,weight=400){ctx.font=weight+' '+size+'px '+FONT;}
function textWidth(ctx,text,size){font(ctx,size);return ctx.measureText(String(text)).width;}
function fitSize(ctx,text,width,base=11){const measured=textWidth(ctx,text,base);return measured>width?base*width/measured:base;}
function wrap(ctx,text,width,size=11){
 const result=[];
 for(const paragraph of String(text||'').split('\n')){
  let line='';for(const character of paragraph){if(line&&textWidth(ctx,line+character,size)>width){result.push(line);line=character;}else line+=character;}result.push(line);
 }
 return result;
}
function noteLayout(ctx,note,width){
 const chunks=String(note||'').match(/[^,]*,|[^,]+$/g)||[''];
 let size=11;for(const chunk of chunks)size=Math.min(size,fitSize(ctx,chunk.trim(),width,11));
 const lines=[];let line='';
 for(const raw of chunks){const chunk=raw.trim();const candidate=line?line+' '+chunk:chunk;if(line&&textWidth(ctx,candidate,size)>width){lines.push(line);line=chunk;}else line=candidate;}
 lines.push(line);return {size,lines};
}
function rowHeight(ctx,row){
 const note=noteLayout(ctx,row.note,COLS[5]-12);
 return Math.max(37,note.lines.length*Math.max(13,note.size*1.5)+14,wrap(ctx,row.color,COLS[2]-10).length*15+14,wrap(ctx,row.qty,COLS[4]-10).length*15+14);
}
function getHeader(ctx,model){
 const general=wrap(ctx,model.note,W-2*M-52,10);
 return {general,tableY:178+Math.max(1,general.length)*15};
}
function paginate(ctx,model){
 const header=getHeader(ctx,model);const start=header.tableY+30;
 const usable=BOTTOM-start;const pages=[[]];let used=0;
 for(let groupIndex=0;groupIndex<model.groups.length;groupIndex++){
  const group=model.groups[groupIndex];
  const heights=group.rows.map(row=>rowHeight(ctx,row));
  const label=String(group.rows[0]?.label||'');
  const labelHeight=wrap(ctx,label,COLS[6]-12).length*15+14;
  const total=heights.reduce((a,b)=>a+b,0);
  if(total<labelHeight)heights[heights.length-1]+=labelHeight-total;
  const groupHeight=heights.reduce((a,b)=>a+b,0);
  if(groupHeight<=usable&&used+groupHeight>usable&&used){pages.push([]);used=0;}
  let rowIndex=0;
  while(rowIndex<group.rows.length){
   const chunk={number:groupIndex+1,rows:[],heights:[],label};
   while(rowIndex<group.rows.length){
    const height=heights[rowIndex];
    if(height>usable)throw new Error('제품 '+(groupIndex+1)+'번의 비고가 한 페이지보다 깁니다. 내용을 나누어 입력해 주세요.');
    if(used+height>usable){if(chunk.rows.length)break;pages.push([]);used=0;}
    chunk.rows.push(group.rows[rowIndex]);chunk.heights.push(height);used+=height;rowIndex++;
    if(used>=usable)break;
   }
   if(chunk.rows.length)pages[pages.length-1].push(chunk);
   if(rowIndex<group.rows.length){pages.push([]);used=0;}
  }
 }
 return {pages,header,start,usable};
}
function center(ctx,text,x,y,w,h,size=11,nowrap=false){
 text=String(text||'');ctx.fillStyle='#24382d';
 const actual=nowrap?fitSize(ctx,text,w-12,size):size;
 const lines=nowrap?[text]:wrap(ctx,text,w-12,actual);
 font(ctx,actual);ctx.textAlign='center';ctx.textBaseline='middle';
 const lh=actual*1.45;lines.forEach((line,i)=>ctx.fillText(line,x+w/2,y+h/2+(i-(lines.length-1)/2)*lh));
}
function rect(ctx,x,y,w,h,fill){if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}ctx.strokeStyle='#a9b8ac';ctx.lineWidth=.65;ctx.strokeRect(x,y,w,h);}
function headerCell(ctx,label,value,x,y,w){
 font(ctx,11);ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#67776b';ctx.fillText(label,x+7,y+6);
 font(ctx,fitSize(ctx,value,w-14,11));ctx.fillStyle='#24382d';ctx.fillText(String(value||'—'),x+7,y+23);
}
function svgContext(svg,measurement){
 const NS='http://www.w3.org/2000/svg';
 const context={font:'400 11px '+FONT,fillStyle:'#24382d',strokeStyle:'#a9b8ac',lineWidth:.65,textAlign:'left',textBaseline:'top',scale(){},measureText(value){measurement.font=this.font;return measurement.measureText(value);}};
 function rectangle(x,y,width,height,fill,stroke){const node=document.createElementNS(NS,'rect');for(const[key,value]of Object.entries({x,y,width,height,fill,stroke,'stroke-width':context.lineWidth}))node.setAttribute(key,value);svg.append(node);}
 context.fillRect=(x,y,w,h)=>rectangle(x,y,w,h,context.fillStyle,'none');
 context.strokeRect=(x,y,w,h)=>rectangle(x,y,w,h,'none',context.strokeStyle);
 context.fillText=(value,x,y)=>{const node=document.createElementNS(NS,'text');const parsed=context.font.match(/^(\d+)\s+([\d.]+)px\s+(.+)$/);const attributes={x,y,fill:context.fillStyle,'font-family':parsed?parsed[3]:FONT,'font-size':parsed?parsed[2]:11,'font-weight':parsed?parsed[1]:400,'text-anchor':context.textAlign==='center'?'middle':context.textAlign==='right'?'end':'start','dominant-baseline':context.textBaseline==='middle'?'central':context.textBaseline==='top'?'text-before-edge':'alphabetic','xml:space':'preserve'};for(const[key,val]of Object.entries(attributes))node.setAttribute(key,val);node.textContent=String(value);svg.append(node);};
 return context;
}
function draw(model,options={}){
 const measurement=document.createElement('canvas').getContext('2d');
 const layout=paginate(measurement,model);
 return layout.pages.map((chunks,pageIndex)=>{
  let canvas,ctx;
  if(options.vector){
   canvas=document.createElementNS('http://www.w3.org/2000/svg','svg');
   const contentHeight=layout.start+chunks.reduce((total,chunk)=>total+chunk.heights.reduce((a,b)=>a+b,0),0)+24;
   const visibleHeight=options.crop?Math.min(H,contentHeight):H;
   canvas.setAttribute('viewBox','0 0 '+W+' '+visibleHeight);canvas.setAttribute('width',W);canvas.setAttribute('height',visibleHeight);canvas.setAttribute('xmlns','http://www.w3.org/2000/svg');
   ctx=svgContext(canvas,measurement);
  }else{canvas=document.createElement('canvas');canvas.width=W*3;canvas.height=H*3;ctx=canvas.getContext('2d');ctx.scale(3,3);}
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#24382d';ctx.textAlign='left';ctx.textBaseline='top';font(ctx,15,600);ctx.fillText(model.type,M,32);
  font(ctx,13);ctx.fillText('수신처',M,59);const recipientX=M+ctx.measureText('수신처  ').width;font(ctx,11);ctx.fillText(model.recipient||'—',recipientX,59);font(ctx,13);ctx.textAlign='right';ctx.fillText('발신처  안양 대산우드',W-M,59);
  const widths=[146,160,226,172];let x=M;
  const fields=[['발주일',model.date],['현장명',model.site],['담당자',model.person],['납기일',model.delivery]];
  fields.forEach(([label,value],i)=>{rect(ctx,x,82,widths[i],63);headerCell(ctx,label,value,x,82,widths[i]);if(i===2){font(ctx,fitSize(ctx,model.phone,widths[i]-14,10));ctx.fillStyle='#54685a';ctx.textAlign='left';ctx.fillText(model.phone||'—',x+7,126);}x+=widths[i];});
  const generalHeight=layout.header.tableY-145;
  rect(ctx,M,145,W-2*M,generalHeight);font(ctx,11);ctx.textAlign='left';ctx.fillStyle='#67776b';ctx.fillText('비고',M+7,153);
  font(ctx,10);ctx.fillStyle='#24382d';layout.header.general.forEach((line,i)=>ctx.fillText(line,M+43,153+i*15));
  x=M;const names=['No.','제품','색상','사이즈','수량','비고','라벨'];
  COLS.forEach((w,i)=>{rect(ctx,x,layout.header.tableY,w,30,'#f0f4ef');center(ctx,names[i],x,layout.header.tableY,w,30,12);x+=w;});
  let y=layout.start;const groupSeparators=[];
  chunks.forEach((chunk,chunkIndex)=>{
   if(chunkIndex>0)groupSeparators.push(y);
   const total=chunk.heights.reduce((a,b)=>a+b,0);
   rect(ctx,M,y,COLS[0],total);center(ctx,chunk.number,M,y,COLS[0],total,11,true);
   rect(ctx,W-M-COLS[6],y,COLS[6],total);center(ctx,chunk.label,W-M-COLS[6],y,COLS[6],total);
   chunk.rows.forEach((row,rowIndex)=>{
    let cellX=M+COLS[0];const height=chunk.heights[rowIndex];
    KEYS.slice(0,5).forEach((key,i)=>{const width=COLS[i+1];rect(ctx,cellX,y,width,height);
     if(key==='note'){const n=noteLayout(ctx,row.note,width-12);const lineHeight=Math.max(13,n.size*1.5);font(ctx,n.size);ctx.fillStyle='#24382d';ctx.textAlign='center';ctx.textBaseline='middle';n.lines.forEach((line,lineIndex)=>ctx.fillText(line,cellX+width/2,y+height/2+(lineIndex-(n.lines.length-1)/2)*lineHeight));}
     else center(ctx,row[key],cellX,y,width,height,11,key==='product'||key==='size');cellX+=width;
    });y+=height;
   });
  });
  // Empty guide rows are visual space only and never receive document numbers.
  if(layout.pages.length===1)while(y+37<=Math.min(BOTTOM,layout.start+333)){let cx=M;COLS.forEach(w=>{rect(ctx,cx,y,w,37);cx+=w;});y+=37;}
  // Draw group boundaries last so merged No./label cells and thin cell borders cannot cover them.
  ctx.fillStyle='#65786b';groupSeparators.forEach(boundary=>ctx.fillRect(M,boundary-1,W-2*M,2));
  font(ctx,9);ctx.fillStyle='#6b7c70';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText((pageIndex+1)+' / '+layout.pages.length,W-M,1084);
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label',model.type+' '+(pageIndex+1)+'페이지. 현장 '+(model.site||'미입력')+'. 제품 '+model.groups.reduce((n,g)=>n+g.rows.length,0)+'개.');
  return canvas;
 });
}
function filename(model){return [String(model.date||'').replace(/-/g,''),String(model.recipient||'').trim()||'수신처미입력',String(model.site||'').trim()||'현장미입력'].join('_').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function jpeg(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('JPG 생성에 실패했습니다.')),'image/jpeg',.96));}
// Store-only ZIP: multiple JPG pages are downloaded in one user action.
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function binaryHeader(size){const a=new Uint8Array(size);return {a,v:new DataView(a.buffer)};}
function zip(files){
 const local=[],central=[];let offset=0,centralSize=0;
 for(const file of files){const name=new TextEncoder().encode(file.name),crc=crc32(file.bytes),size=file.bytes.length;
  const h=binaryHeader(30);h.v.setUint32(0,0x04034b50,true);h.v.setUint16(4,20,true);h.v.setUint16(6,0x800,true);h.v.setUint32(14,crc,true);h.v.setUint32(18,size,true);h.v.setUint32(22,size,true);h.v.setUint16(26,name.length,true);local.push(h.a,name,file.bytes);
  const c=binaryHeader(46);c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x800,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,size,true);c.v.setUint32(24,size,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,offset,true);central.push(c.a,name);centralSize+=46+name.length;offset+=30+name.length+size;
 }
 const end=binaryHeader(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,files.length,true);end.v.setUint16(10,files.length,true);end.v.setUint32(12,centralSize,true);end.v.setUint32(16,offset,true);
 return new Blob([...local,...central,end.a],{type:'application/zip'});
}
async function saveJpg(pages,model){
 const base=filename(model);
 if(pages.length===1){download(await jpeg(pages[0]),base+'.jpg');return 'JPG 다운로드를 시작했습니다.';}
 const files=[];for(let i=0;i<pages.length;i++)files.push({name:base+'_'+String(i+1).padStart(2,'0')+'.jpg',bytes:new Uint8Array(await(await jpeg(pages[i])).arrayBuffer())});
 download(zip(files),base+'_JPG.zip');return pages.length+'페이지 JPG를 ZIP 파일로 다운로드합니다.';
}
function png(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('복사할 이미지 생성에 실패했습니다.')),'image/png'));}
function copyImage(model){
 if(!global.navigator?.clipboard?.write||typeof global.ClipboardItem!=='function')throw new Error('이 환경에서는 이미지 복사를 지원하지 않습니다. 온라인 앱을 브라우저로 열거나 JPG 저장을 이용해 주세요.');
 if(typeof global.ClipboardItem.supports==='function'&&!global.ClipboardItem.supports('image/png'))throw new Error('이 브라우저는 이미지 복사를 지원하지 않습니다. JPG 저장을 이용해 주세요.');
 const snapshot=JSON.parse(JSON.stringify(model));let pageCount=1,reduced=false;
 // Start clipboard.write inside the click gesture; create the PNG asynchronously.
 const imagePromise=Promise.resolve(document.fonts?.ready).then(async()=>{
  const pages=draw(snapshot);pageCount=pages.length;
  if(pageCount===1)return png(pages[0]);
  const width=Math.max(...pages.map(page=>page.width));
  const height=pages.reduce((total,page)=>total+page.height,0);
  const ratio=Math.min(1,16384/height,Math.sqrt(32000000/(width*height)));reduced=ratio<1;
  const combined=document.createElement('canvas');combined.width=Math.max(1,Math.floor(width*ratio));combined.height=Math.max(1,Math.floor(height*ratio));
  const context=combined.getContext('2d');if(!context)throw new Error('복사할 이미지 생성에 실패했습니다.');
  context.fillStyle='#fff';context.fillRect(0,0,combined.width,combined.height);
  let y=0;for(const page of pages){context.drawImage(page,0,y,page.width*ratio,page.height*ratio);y+=page.height*ratio;}
  return png(combined);
 });
 imagePromise.catch(()=>{});
 const item=new global.ClipboardItem({'image/png':imagePromise});
 return global.navigator.clipboard.write([item]).then(()=>pageCount===1?'이미지를 복사했습니다. 원하는 곳에 붙여넣기 하세요.':pageCount+'페이지를 세로로 이어 복사했습니다.'+(reduced?' 이미지가 길어 자동 축소했습니다. 원본 해상도가 필요하면 JPG 저장을 이용해 주세요.':''));
}
async function print(pages,model){
 document.querySelector('.dw-print-surface')?.remove();
 const surface=document.createElement('div');surface.className='dw-print-surface';
 for(const page of pages){const image=document.createElement('img');image.src=page.toDataURL('image/png');image.alt=model.type;surface.append(image);}
 document.body.append(surface);await Promise.all([...surface.children].map(img=>img.decode()));
 const oldTitle=document.title;document.title=filename(model);
 const cleanup=()=>{surface.remove();document.title=oldTitle;};window.addEventListener('afterprint',cleanup,{once:true});
 window.print();
}
global.OrderOutput={draw,saveJpg,copyImage,print,filename,download,zip,paginate,noteLayout,fitSize};
})(globalThis);
