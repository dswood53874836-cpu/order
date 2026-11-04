/* HWP 5.x binary writer. Formatting is derived from the user-supplied form. */
(function(global){
'use strict';
const T=global.HwpTemplate;
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function concat(parts){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;}
const view=a=>new DataView(a.buffer,a.byteOffset,a.byteLength);
const put16=(a,o,v)=>view(a).setUint16(o,v,true);
const put32=(a,o,v)=>view(a).setUint32(o,v>>>0,true);
function utf16(text){const a=new Uint8Array(text.length*2);for(let i=0;i<text.length;i++)put16(a,i*2,text.charCodeAt(i));return a;}
function record(tag,level,data){const extended=data.length>=4095,h=new Uint8Array(extended?8:4);put32(h,0,tag|(level<<10)|((extended?4095:data.length)<<20));if(extended)put32(h,4,data.length);return concat([h,data]);}
function records(raw){const out=[];let off=0;while(off+4<=raw.length){const h=view(raw).getUint32(off,true);off+=4;let length=h>>>20;if(length===4095){length=view(raw).getUint32(off,true);off+=4;}out.push({tag:h&1023,level:(h>>>10)&1023,data:raw.slice(off,off+length)});off+=length;}return out;}
const encodeRecords=rows=>concat(rows.map(r=>record(r.tag,r.level,r.data)));
function compound(streams){
 const END=0xfffffffe,FREE=0xffffffff,FAT=0xfffffffd,sector=512;
 const entries=[{name:'Root Entry',type:5,children:[]},{name:'FileHeader',type:2},{name:'DocInfo',type:2},{name:'BodyText',type:1,children:[4]},{name:'Section0',type:2},{name:'PrvText',type:2}];
 entries[0].children=[1,2,3,5];
 for(const e of entries){e.left=FREE;e.right=FREE;e.child=FREE;e.color=1;e.sid=END;e.size=0;}
 function tree(ids){ids.sort((a,b)=>entries[a].name.length-entries[b].name.length||entries[a].name.toUpperCase().localeCompare(entries[b].name.toUpperCase(),'en'));const build=(from,to,depth=0)=>{if(from>=to)return FREE;const mid=(from+to)>>1,id=ids[mid];entries[id].left=build(from,mid,depth+1);entries[id].right=build(mid+1,to,depth+1);entries[id].depth=depth;return id;};const root=build(0,ids.length);const max=Math.max(...ids.map(id=>entries[id].depth));if(ids.length>1)for(const id of ids)if(entries[id].depth===max)entries[id].color=0;return root;}
 for(const e of entries)if(e.children)e.child=tree([...e.children]);
 const blocks=[],chains=[],miniParts=[],miniFat=[];let miniCount=0;
 function regular(data){const sid=blocks.length,count=Math.ceil(data.length/sector);for(let i=0;i<count;i++){const block=new Uint8Array(sector);block.set(data.subarray(i*sector,(i+1)*sector));blocks.push(block);chains.push(i===count-1?END:sid+i+1);}return count?sid:END;}
 for(const e of entries.filter(e=>e.type===2)){
  const data=streams[e.name]||new Uint8Array();e.size=data.length;
  if(data.length>=4096)e.sid=regular(data);
  else if(data.length){e.sid=miniCount;const count=Math.ceil(data.length/64),padded=new Uint8Array(count*64);padded.set(data);miniParts.push(padded);for(let i=0;i<count;i++)miniFat.push(i===count-1?END:miniCount+i+1);miniCount+=count;}
 }
 const miniStream=concat(miniParts);entries[0].sid=regular(miniStream);entries[0].size=miniStream.length;
 let miniFatSid=END,miniFatSectors=0;
 if(miniFat.length){miniFatSectors=Math.ceil(miniFat.length*4/sector);const data=new Uint8Array(miniFatSectors*sector).fill(255);miniFat.forEach((v,i)=>put32(data,i*4,v));miniFatSid=regular(data);}
 const dir=new Uint8Array(Math.ceil(entries.length*128/sector)*sector);
 entries.forEach((e,i)=>{const off=i*128,name=utf16(e.name+'\0');dir.set(name,off);put16(dir,off+64,name.length);dir[off+66]=e.type;dir[off+67]=e.color;put32(dir,off+68,e.left);put32(dir,off+72,e.right);put32(dir,off+76,e.child);put32(dir,off+116,e.sid);put32(dir,off+120,e.size);});
 const dirSid=regular(dir);let fatSectors=1;while(Math.ceil((blocks.length+fatSectors)/128)>fatSectors)fatSectors++;
 if(fatSectors>109)throw new Error('HWP 문서가 너무 큽니다. 제품을 나누어 작성해 주세요.');
 const fatIds=[];for(let i=0;i<fatSectors;i++){fatIds.push(blocks.length);blocks.push(new Uint8Array(sector));chains.push(FAT);}
 const fat=new Uint8Array(fatSectors*sector).fill(255);chains.forEach((next,i)=>put32(fat,i*4,next));fatIds.forEach((id,i)=>blocks[id].set(fat.subarray(i*sector,(i+1)*sector)));
 const header=new Uint8Array(sector);header.set([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]);put16(header,24,0x3e);put16(header,26,3);put16(header,28,0xfffe);put16(header,30,9);put16(header,32,6);put32(header,44,fatSectors);put32(header,48,dirSid);put32(header,56,4096);put32(header,60,miniFatSid);put32(header,64,miniFatSectors);put32(header,68,END);header.fill(255,76);fatIds.forEach((id,i)=>put32(header,76+i*4,id));
 return concat([header,...blocks]);
}
function build(model){
 const ctx=document.createElement('canvas').getContext('2d');
 const plan=OrderOutput.paginate(ctx,model);
 const doc=records(bytes(T.docInfo));
 const charRecords=doc.filter(r=>r.tag===21);
 const newShapes=[];const shapeIds=new Map();
 function shape(size=1000){size=Math.max(100,Math.round(size));if(shapeIds.has(size))return shapeIds.get(size);const data=charRecords[2].data.slice();put32(data,42,size);const id=charRecords.length+newShapes.length;newShapes.push({tag:21,level:1,data});shapeIds.set(size,id);return id;}
 let paragraphId=1;
 function paragraph(text,level=0,options={}){
  text=String(text??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const data=bytes(T.paragraph),run=new Uint8Array(8),line=bytes(T.lineSeg);
  const payload=utf16(text.replace(/\r\n?/g,'\n')+'\r');
  put32(data,0,(payload.length/2)|(level>0?0x80000000:0));put32(data,4,text.includes('\n')?1<<10:0);put16(data,8,options.center?20:0);data[10]=0;data[11]=options.pageBreak?4:0;put16(data,12,1);put16(data,14,0);put16(data,16,1);put32(data,18,paragraphId++);put32(run,4,shape(options.size||1000));
  // Line segments are caches; provide the correct available width and let Hanword reflow.
  put32(line,0,0);put32(line,4,0);put32(line,28,options.width||52724);
  return [record(66,level,data),record(67,level+1,payload),record(68,level+1,run),record(69,level+1,line)];
 }
 const output=[];
 const unit=59528/794;const widths=[40,105,64,113,56,220,106].map(w=>Math.round(w*unit));widths[6]=52724-widths.slice(0,6).reduce((a,b)=>a+b,0);
 function cell(text,col,row,rowSpan,height,size=1000){
  const data=bytes(T.cell);put16(data,8,col);put16(data,10,row);put16(data,12,1);put16(data,14,rowSpan);put32(data,16,widths[col]);put32(data,20,height);put32(data,34,widths[col]);
  for(const off of [24,26,28,30])put16(data,off,180);
  return [record(72,2,data),...paragraph(text,2,{center:true,size,width:widths[col]-360})];
 }
 plan.pages.forEach((chunks,pageIndex)=>{
  if(pageIndex===0){
   const prefix=T.records.map(r=>({...r,data:bytes(r.data)}));
   const title=utf16(model.type+'\r');prefix[1].data=concat([prefix[1].data,title]);put32(prefix[0].data,0,prefix[1].data.length/2);put16(prefix[0].data,8,0);prefix[0].data[11]=0;put32(prefix[2].data,4,shape(1000));
   const page=prefix.find(r=>r.tag===73).data;put32(page,8,3402);put32(page,12,3402);put32(page,16,3402);put32(page,20,3402);
   output.push(encodeRecords(prefix));
  }else output.push(...paragraph(model.type,0,{pageBreak:true}));
  output.push(...paragraph('수신처: '+(model.recipient||'—')+'     발신처: 안양 대산우드'));
  output.push(...paragraph('발주일: '+model.date+'    현장명: '+(model.site||'—')+'    담당자: '+(model.person||'—')+'    납기일: '+(model.delivery||'—')));
  output.push(...paragraph('연락처: '+(model.phone||'—')));
  output.push(...paragraph('비고: '+(model.note||'')));
  const rows=1+chunks.reduce((n,c)=>n+c.rows.length,0);
  const tableHeight=Math.round((30+chunks.reduce((n,c)=>n+c.heights.reduce((a,b)=>a+b,0),0))*unit);
  const para=bytes(T.tableParagraph);put32(para,0,9|(pageIndex===plan.pages.length-1?0x80000000:0));put32(para,18,paragraphId++);const line=bytes(T.lineSeg);put32(line,4,0);put32(line,28,52724);
  const tableRun=new Uint8Array(8);put32(tableRun,4,shape(1000));output.push(record(66,0,para),record(67,1,bytes(T.tableText)),record(68,1,tableRun),record(69,1,line));
  const ctrl=bytes(T.tableCtrl);put32(ctrl,8,0);put32(ctrl,12,0);put32(ctrl,16,52724);put32(ctrl,20,tableHeight);put32(ctrl,36,pageIndex+1);output.push(record(71,1,ctrl));
  const property=new Uint8Array(18+rows*2+4);property.set(bytes(T.tableProperties).subarray(0,18));put16(property,4,rows);put16(property,6,7);
  const cellCounts=[7];for(const c of chunks)c.rows.forEach((r,i)=>cellCounts.push(i===0?7:5));cellCounts.forEach((count,i)=>put16(property,18+i*2,count));put16(property,18+rows*2,3);put16(property,20+rows*2,0);output.push(record(77,2,property));
  const headings=['No.','제품','색상','사이즈','수량','비고','라벨'];headings.forEach((label,col)=>output.push(...cell(label,col,0,1,2250,900)));
  let y=1;
  for(const chunk of chunks){
   const total=Math.round(chunk.heights.reduce((a,b)=>a+b,0)*unit);
   chunk.rows.forEach((row,i)=>{
    const height=Math.round(chunk.heights[i]*unit);
    if(i===0)output.push(...cell(String(chunk.number),0,y,chunk.rows.length,total));
    ['product','color','size','qty','note'].forEach((key,j)=>{
     let text=String(row[key]||''),size=1000;
     if(key==='product'||key==='size')size=Math.min(1000,OrderOutput.fitSize(ctx,text,[40,105,64,113,56,220,106][j+1]-12,11)/11*1000);
     if(key==='note'){const note=OrderOutput.noteLayout(ctx,text,208);text=note.lines.join('\n');size=note.size/11*1000;}
     output.push(...cell(text,j+1,y,1,height,size));
    });
    if(i===0)output.push(...cell(chunk.label,6,y,chunk.rows.length,total));y++;
   });
  }
 });
 const mapping=doc.find(r=>r.tag===17);put32(mapping.data,36,charRecords.length+newShapes.length);
 const lastShape=doc.map(r=>r.tag).lastIndexOf(21);doc.splice(lastShape+1,0,...newShapes);
 const props=doc.find(r=>r.tag===16);put16(props.data,0,1);
 const fileHeader=bytes(T.fileHeader);put32(fileHeader,36,0); // uncompressed, editable, no embedded scripts.
 const previewText=utf16([model.type,'수신처 '+model.recipient,'안양 대산우드',model.date,model.site,...model.groups.flatMap(g=>g.rows.map(row=>Object.values(row).join(' ')))].join('\r\n'));
 const result=compound({FileHeader:fileHeader,DocInfo:encodeRecords(doc),Section0:concat(output),PrvText:previewText});
 return new Blob([result],{type:'application/x-hwp'});
}
global.HwpWriter={build,compound,records};
})(globalThis);
