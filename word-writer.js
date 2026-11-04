/* Editable, standards-based Office Open XML document. No external service. */
(function(global){
'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const widths=[604,1587,967,1708,846,3325,1602];
const escape=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function paragraph(text,size=17,align='center',bold=false,keep=false){
 const runs=String(text??'').split('\n').map((line,i)=>(i?'<w:r><w:br/></w:r>':'')+'<w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="맑은 고딕"/>'+(bold?'<w:b/>':'')+'<w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/></w:rPr><w:t xml:space="preserve">'+escape(line)+'</w:t></w:r>').join('');
 return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="'+align+'"/>'+(keep?'<w:keepNext/>':'')+'</w:pPr>'+runs+'</w:p>';
}
function cell(text,width,options={}){
 return '<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+(options.span?'<w:gridSpan w:val="'+options.span+'"/>':'')+(options.merge?'<w:vMerge w:val="'+options.merge+'"/>':'')+(options.header?'<w:shd w:fill="F0F4EF"/>':'')+(options.nowrap?'<w:noWrap/><w:tcFitText/>':'')+'<w:vAlign w:val="center"/></w:tcPr>'+paragraph(text,options.size||17,options.align||'center',options.header,options.keep)+'</w:tc>';
}
function table(grid,rows){
 const borders=['top','left','bottom','right','insideH','insideV'].map(side=>'<w:'+side+' w:val="single" w:sz="4" w:color="A9B8AC"/>').join('');
 return '<w:tbl><w:tblPr><w:tblW w:w="'+grid.reduce((a,b)=>a+b,0)+'" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+borders+'</w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="85" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+grid.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+rows.join('')+'</w:tbl>';
}
function row(cells,header=false){return '<w:tr><w:trPr><w:cantSplit/>'+(header?'<w:tblHeader/>':'')+'</w:trPr>'+cells.join('')+'</w:tr>';}
function build(model){
 const ctx=document.createElement('canvas').getContext('2d');
 const fit=(text,width)=>Math.max(2,Math.floor(OrderOutput.fitSize(ctx,text,width-12,11)*1.5));
 const title='<w:p><w:pPr><w:pStyle w:val="Title"/><w:keepNext/><w:spacing w:after="160"/></w:pPr><w:r><w:t>'+escape(model.type)+'</w:t></w:r></w:p>';
 const parties=paragraph('수신처  '+(model.recipient||'—')+'     발신처  안양 대산우드',17,'left',false,true);
 const metaWidths=[2205,2418,3415,2601];
 const meta=table(metaWidths,[row([cell('발주일\n'+(model.date||'—'),metaWidths[0],{keep:true}),cell('현장명\n'+(model.site||'—'),metaWidths[1],{keep:true}),cell('담당자  '+(model.person||'—')+'\n연락처  '+(model.phone||'—'),metaWidths[2],{keep:true}),cell('납기일\n'+(model.delivery||'—'),metaWidths[3],{keep:true})]),row([cell('비고  '+(model.note||'—'),10639,{span:4,align:'left',keep:true})])]);
 const productRows=[row(['No.','제품','색상','사이즈','수량','비고','라벨'].map((v,i)=>cell(v,widths[i],{header:true})),true)];
 model.groups.forEach((group,index)=>group.rows.forEach((item,member)=>{
  const merge=group.rows.length>1?(member?'continue':'restart'):null;
  const note=OrderOutput.noteLayout(ctx,item.note,208);
  const cells=[cell(member?'':index+1,widths[0],{merge})];
  ['product','color','size','qty','note'].forEach((key,i)=>cells.push(cell(key==='note'?note.lines.join('\n'):item[key],widths[i+1],{nowrap:['product','size'].includes(key),size:key==='note'?Math.max(2,Math.floor(note.size*1.5)):['product','size'].includes(key)?fit(item[key],[105,64,113,56,220][i]):17})));
  cells.push(cell(member?'':group.rows[0].label,widths[6],{merge}));productRows.push(row(cells));
 }));
 const body=title+parties+meta+paragraph('',4)+table(widths,productRows)+paragraph('',2)+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="680" w:right="634" w:bottom="680" w:left="633" w:header="0" w:footer="0"/></w:sectPr>';
 const files={
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/_rels/document.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'word/styles.xml':'<w:styles xmlns:w="'+NS+'"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="맑은 고딕"/><w:sz w:val="17"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>',
  'word/document.xml':'<w:document xmlns:w="'+NS+'"><w:body>'+body+'</w:body></w:document>'
 };
 const archive=OrderOutput.zip(Object.entries(files).map(([name,text])=>({name,bytes:new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+text)})));
 return new Blob([archive],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
global.WordWriter={build};
})(globalThis);
