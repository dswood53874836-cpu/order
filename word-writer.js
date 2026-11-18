/* Editable Office Open XML. Page and product measurements come from OrderOutput. */
(function(global){
'use strict';
const WORD_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_NS='http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_NS='http://schemas.openxmlformats.org/package/2006/content-types';
const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const INK='24382D', MUTED='67776B', GRID='A9B8AC', GROUP_RULE='435B4A';
const FONT='<w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic" w:cs="Malgun Gothic"/>';
const twips=px=>Math.round(px*15);
const escape=value=>String(value??'')
 .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu,'')
 .replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

function run(text,{size=11,color=INK,bold=false}={}){
 const halfPoints=Math.max(2,Math.floor(size*1.5));
 const props=FONT+(bold?'<w:b/>':'')+'<w:color w:val="'+color+'"/><w:spacing w:val="0"/>'
  +'<w:sz w:val="'+halfPoints+'"/><w:szCs w:val="'+halfPoints+'"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/>';
 return '<w:r><w:rPr>'+props+'</w:rPr><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r>';
}
function paragraph(content,{align='left',line=16,after=0,title=false,newPage=false}={}){
 const properties=(title?'<w:pStyle w:val="Title"/><w:keepNext/>':'')+(newPage?'<w:pageBreakBefore/>':'')
  +'<w:widowControl w:val="0"/><w:snapToGrid w:val="0"/>'
  +'<w:spacing w:before="0" w:after="'+twips(after)+'" w:line="'+twips(line)+'" w:lineRule="exact"/>'
  +'<w:contextualSpacing w:val="0"/><w:jc w:val="'+align+'"/>';
 return '<w:p><w:pPr>'+properties+'</w:pPr>'+content+'</w:p>';
}
function textBlock(lines,{align='center',size=11,line=Math.max(13,size*1.45),color=INK}={}){
 return paragraph(lines.map(text=>run(text,{size,color})).join('<w:r><w:br/></w:r>'),{align,line:Math.max(12,line)});
}
function edge(side,size,color){
 return '<w:'+side+' w:val="single" w:sz="'+size+'" w:space="0" w:color="'+color+'"/>';
}
function margins({top=0,left=0,bottom=0,right=left}={}){
 return Object.entries({top,left,bottom,right}).map(([side,px])=>'<w:'+side+' w:w="'+twips(px)+'" w:type="dxa"/>').join('');
}
function cell(content,width,{span=1,merge,border=false,fill,padding,vertical='center'}={}){
 const properties='<w:tcW w:w="'+twips(width)+'" w:type="dxa"/>'
  +(span>1?'<w:gridSpan w:val="'+span+'"/>':'')+(merge?'<w:vMerge w:val="'+merge+'"/>':'')
  +(border?'<w:tcBorders>'+edge('top',21,GROUP_RULE)+'</w:tcBorders>':'')
  +(fill?'<w:shd w:val="clear" w:fill="'+fill+'"/>':'')
  +(padding?'<w:tcMar>'+margins(padding)+'</w:tcMar>':'')+'<w:vAlign w:val="'+vertical+'"/>';
 return '<w:tc><w:tcPr>'+properties+'</w:tcPr>'+content+'</w:tc>';
}
function row(cells,height,header=false){
 return '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="'+twips(height)+'" w:hRule="atLeast"/>'
  +(header?'<w:tblHeader/>':'')+'</w:trPr>'+cells.join('')+'</w:tr>';
}
function table(widths,rows,{bordered=true,padding={left:6}}={}){
 const sides=['top','left','bottom','right','insideH','insideV'];
 const borders=sides.map(side=>bordered?edge(side,4,GRID):'<w:'+side+' w:val="nil"/>').join('');
 const width=widths.reduce((sum,value)=>sum+value,0);
 return '<w:tbl><w:tblPr><w:tblW w:w="'+twips(width)+'" w:type="dxa"/><w:jc w:val="center"/>'
  +'<w:tblBorders>'+borders+'</w:tblBorders><w:tblLayout w:type="fixed"/>'
  +'<w:tblCellMar>'+margins(padding)+'</w:tblCellMar></w:tblPr><w:tblGrid>'
  +widths.map(value=>'<w:gridCol w:w="'+twips(value)+'"/>').join('')+'</w:tblGrid>'+rows.join('')+'</w:tbl>';
}

function buildPage(model,layout,chunks,pageIndex,ctx,output){
 const {columns,metaColumns,columnNames,metaFields,width,margin,bottom}=output.geometry;
 const contentWidth=width-2*margin;
 const fit=(text,max,base)=>output.fitSize(ctx,text,max-2,base);
 const display=value=>value||'—';
 const title=paragraph(run(model.type,{size:15,color:'000000',bold:true}),{line:20,after:7,title:true,newPage:pageIndex>0});
 const partyWidths=[contentWidth*.65,contentWidth*.35];
 const recipient=display(model.recipient);
 const recipientSize=fit(recipient,partyWidths[0]-54,11);
 const parties=table(partyWidths,[row([
  cell(paragraph(run('수신처  ',{size:13})+run(recipient,{size:recipientSize}),{line:18}),partyWidths[0]),
  cell(textBlock(['발신처  안양 대산우드'],{align:'right',size:13,line:18}),partyWidths[1])
 ],22)],{bordered:false,padding:{}});
 const infoCells=metaFields.map(([label,key],index)=>{
  const col=metaColumns[index], value=display(model[key]);
  let content=textBlock([label],{align:'left',size:11,line:17,color:MUTED})
   +textBlock([value],{align:'left',size:fit(value,col-14,11),line:19});
  if(key==='person'){
   const phone=display(model.phone);
   content+=textBlock([phone],{align:'left',size:fit(phone,col-14,10),line:15,color:'54685A'});
  }
  return cell(content,col,{span:index===0?2:1,padding:{top:5,left:7},vertical:'top'});
 });
 const noteGrid=[43,metaColumns[0]-43,...metaColumns.slice(1)];
 const meta=table(noteGrid,[
  row(infoCells,63),
  row([
   cell(textBlock(['비고'],{align:'left',line:15,color:MUTED}),43,{padding:{top:7,left:7},vertical:'top'}),
   cell(textBlock(layout.header.general,{align:'left',line:15,size:10}),contentWidth-43,
    {span:4,padding:{top:7,left:0,right:9},vertical:'top'})
  ],layout.header.tableY-146)
 ]);
 const productRows=[row(columnNames.map((name,index)=>cell(textBlock([name],{size:12}),columns[index],{fill:'F0F4EF'})),30,true)];
 let y=layout.start;
 chunks.forEach((chunk,chunkIndex)=>{
  chunk.cells.forEach((itemCells,index)=>{
   const merge=chunk.rows.length>1?(index===0?'restart':'continue'):undefined;
   const border=chunkIndex>0&&index===0;
   const cells=[cell(textBlock(index===0?[chunk.number]:['']),columns[0],{merge,border})];
   itemCells.forEach(({lines,size,line},offset)=>{
    const col=columns[offset+1];
    cells.push(cell(textBlock(lines,{size,line}),col,{border}));
   });
   const {lines,size,line}=chunk.labelText;
   cells.push(cell(textBlock(index===0?lines:[''],{size,line}),columns[6],{merge,border}));
   productRows.push(row(cells,chunk.heights[index]));
   y+=chunk.heights[index];
  });
 });
 if(layout.pages.length===1){
  while(y+37<=Math.min(bottom,layout.start+333)){
   productRows.push(row(columns.map(col=>cell(textBlock(['']),col)),37));
   y+=37;
  }
 }
 return title+parties+paragraph('',{line:1})+meta+paragraph('',{line:1})+table(columns,productRows);
}

function build(model){
 const output=global.OrderOutput;
 const ctx=document.createElement('canvas').getContext('2d');
 const layout=output.paginate(ctx,model);
 const pages=layout.pages.map((chunks,index)=>buildPage(model,layout,chunks,index,ctx,output));
 const section='<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/>'
  +'<w:pgMar w:top="480" w:right="673" w:bottom="735" w:left="673" w:header="0" w:footer="390" w:gutter="0"/></w:sectPr>';
 const field=name=>'<w:fldSimple w:instr="'+name+'">'+run('1',{size:9,color:MUTED})+'</w:fldSimple>';
 const files={
  '[Content_Types].xml':'<Types xmlns="'+CONTENT_NS+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
  '_rels/.rels':'<Relationships xmlns="'+PACKAGE_NS+'"><Relationship Id="rId1" Type="'+REL_NS+'/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/_rels/document.xml.rels':'<Relationships xmlns="'+PACKAGE_NS+'"><Relationship Id="rId1" Type="'+REL_NS+'/styles" Target="styles.xml"/><Relationship Id="rId2" Type="'+REL_NS+'/footer" Target="footer1.xml"/></Relationships>',
  'word/styles.xml':'<w:styles xmlns:w="'+WORD_NS+'"><w:docDefaults><w:rPrDefault><w:rPr>'+FONT+'<w:sz w:val="16"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/></w:style></w:styles>',
  'word/document.xml':'<w:document xmlns:w="'+WORD_NS+'" xmlns:r="'+REL_NS+'"><w:body>'+pages.join('')+section+'</w:body></w:document>',
  'word/footer1.xml':'<w:ftr xmlns:w="'+WORD_NS+'">'+paragraph(field('PAGE')+run(' / ',{size:9,color:MUTED})+field('NUMPAGES'),{align:'right',line:13})+'</w:ftr>'
 };
 const encoder=new TextEncoder();
 const archive=output.zip(Object.entries(files).map(([name,xml])=>({
  name,bytes:encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+xml)
 })));
 return new Blob([archive],{type:MIME});
}
global.WordWriter={build};
})(globalThis);
