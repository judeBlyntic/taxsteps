(function(){
const P = s => s; // path string
const icons = {
  home:["M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8","M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  receipt:["M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z","M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8","M12 17.5v-11"],
  scan:["M3 7V5a2 2 0 0 1 2-2h2","M17 3h2a2 2 0 0 1 2 2v2","M21 17v2a2 2 0 0 1-2 2h-2","M7 21H5a2 2 0 0 1-2-2v-2","M7 12h10"],
  chart:["M3 3v16a2 2 0 0 0 2 2h16","M18 17V9","M13 17V5","M8 17v-3"],
  settings:["M20 7h-9","M14 17H5",["circle",{cx:17,cy:17,r:3}],["circle",{cx:7,cy:7,r:3}]],
  bell:["M10.268 21a2 2 0 0 0 3.464 0","M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"],
  search:[["circle",{cx:11,cy:11,r:8}],"m21 21-4.3-4.3"],
  plus:["M5 12h14","M12 5v14"],
  left:["m15 18-6-6 6-6"], right:["m9 18 6-6-6-6"], down:["m6 9 6 6 6-6"],
  arrowLeft:["m12 19-7-7 7-7","M19 12H5"], arrowRight:["M5 12h14","m12 5 7 7-7 7"],
  check:["M20 6 9 17l-5-5"],
  alert:["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3","M12 9v4","M12 17h.01"],
  shield:["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z","m9 12 2 2 4-4"],
  download:["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
  upload:["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","m17 8-5-5-5 5","M12 3v12"],
  file:["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z","M14 2v4a2 2 0 0 0 2 2h4","M10 9H8","M16 13H8","M16 17H8"],
  sheet:[["rect",{x:3,y:3,width:18,height:18,rx:2}],"M3 9h18","M3 15h18","M9 3v18"],
  zap:["M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"],
  image:[["rect",{x:3,y:3,width:18,height:18,rx:2}],["circle",{cx:9,cy:9,r:2}],"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"],
  x:["M18 6 6 18","m6 6 12 12"],
  sparkles:["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"],
  trash:["M3 6h18","M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6","M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"],
  pencil:["M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"],
  sync:["M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8","M21 3v5h-5","M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16","M8 16H3v5"],
  card:[["rect",{x:2,y:5,width:20,height:14,rx:2}],"M2 10h20"],
  user:[["circle",{cx:12,cy:8,r:5}],"M20 21a8 8 0 0 0-16 0"],
  lock:[["rect",{x:3,y:11,width:18,height:11,rx:2}],"M7 11V7a5 5 0 0 1 10 0v4"],
  tag:["M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",["circle",{cx:7.5,cy:7.5,r:.5}]],
  building:[["rect",{x:4,y:2,width:16,height:20,rx:2}],"M9 22v-4h6v4","M8 6h.01","M16 6h.01","M12 6h.01","M12 10h.01","M12 14h.01","M16 10h.01","M16 14h.01","M8 10h.01","M8 14h.01"],
  wrench:["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
  fuel:["M3 22h12","M4 9h10","M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18","M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"],
  briefcase:["M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",["rect",{x:2,y:6,width:20,height:14,rx:2}]],
  plane:["M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"],
  utensils:["M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2","M7 2v20","M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"],
  monitor:[["rect",{x:2,y:3,width:20,height:14,rx:2}],"M8 21h8","M12 17v4"],
  cart:[["circle",{cx:8,cy:21,r:1}],["circle",{cx:19,cy:21,r:1}],"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"],
  logout:["m16 17 5-5-5-5","M21 12H9","M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"]
};
const cats = {
  "Tools & Equipment":{icon:"wrench",bg:"var(--color-accent-2-300)",fg:"var(--color-accent-2-900)"},
  "Fuel":{icon:"fuel",bg:"var(--color-accent-300)",fg:"var(--color-accent-900)"},
  "Office":{icon:"briefcase",bg:"var(--color-neutral-300)",fg:"var(--color-neutral-900)"},
  "Groceries":{icon:"cart",bg:"var(--color-accent-200)",fg:"var(--color-accent-900)"},
  "Travel":{icon:"plane",bg:"var(--color-accent-2-200)",fg:"var(--color-accent-2-900)"},
  "Software":{icon:"monitor",bg:"var(--color-neutral-200)",fg:"var(--color-neutral-900)"},
  "Meals":{icon:"utensils",bg:"var(--color-accent-100)",fg:"var(--color-accent-900)"}
};
const R = (id,vendor,cat,date,subtotal,gst,total,type,pay,num)=>({id,vendor,cat,date,subtotal,gst,total,type,pay,num,deductible:type==='business'});
const receipts = [
  R('r1','Mitre 10','Tools & Equipment','2026-09-25',100.00,15.00,115.00,'business','Visa','548921'),
  R('r2','BP Connect','Fuel','2026-09-24',71.65,10.75,82.40,'business','Mastercard','BP-22817'),
  R('r3','OfficeMax','Office','2026-09-22',56.51,8.48,64.99,'business','Visa','OM-90412'),
  R('r4','Countdown','Groceries','2026-09-21',127.13,19.07,146.20,'personal','EFTPOS','41-7730'),
  R('r5','Air New Zealand','Travel','2026-09-18',251.30,37.70,289.00,'business','Visa','NZ5R2K'),
  R('r6','Bunnings','Tools & Equipment','2026-09-16',108.26,16.24,124.50,'business','Mastercard','BN-66120'),
  R('r7','Z Energy','Fuel','2026-09-12',79.39,11.91,91.30,'business','Visa','Z-44019'),
  R('r8','Xero','Software','2026-09-10',65.22,9.78,75.00,'business','Visa','INV-3381'),
  R('r9','Hell Pizza','Meals','2026-09-08',37.22,5.58,42.80,'personal','EFTPOS','HP-1207'),
  R('r10','Noel Leeming','Tools & Equipment','2026-09-05',433.91,65.09,499.00,'business','Visa','NL-80551')
];
const scanDraft = {vendor:'PlaceMakers',date:'01/10/2026',num:'PM-772104',subtotal:'186.96',gst:'28.04',total:'215.00',pay:'Visa',cat:'Tools & Equipment',type:'business'};
const categoryTotals = [
  {name:'Tools & Equipment',amt:1240.00},{name:'Travel',amt:1190.00},{name:'Fuel',amt:850.00},{name:'Office',amt:620.00},{name:'Meals',amt:385.70}
];
const months = [{m:'Apr',v:3120},{m:'May',v:3580},{m:'Jun',v:2940},{m:'Jul',v:3870},{m:'Aug',v:3410},{m:'Sep',v:4285.70}];
const bizDays=[1,2,3,4,5,8,10,12,15,16,18,19,22,23,24,25,29,30], persDays=[6,9,14,21,27];
// Sept 2026 starts on a Tuesday (Mon-first grid offset 1)
function calendar(){
  const cells=[]; for(let i=0;i<1;i++) cells.push({d:'',bg:'transparent',fg:'transparent',bd:'transparent'});
  for(let d=1;d<=30;d++){
    const b=bizDays.includes(d), p=persDays.includes(d);
    cells.push({d, bg:b?'var(--color-accent-2-400)':p?'var(--color-accent-400)':'var(--color-neutral-100)', fg:'var(--color-text)', bd:b||p?'transparent':'var(--color-neutral-300)'});
  }
  return cells;
}
const money = n => '$'+Number(n).toLocaleString('en-NZ',{minimumFractionDigits:2,maximumFractionDigits:2});
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dlabel = iso => { const [y,m,d]=iso.split('-'); return (+d)+' '+MON[+m-1]; };
function mkIcons(React){
  const out={};
  for(const k in icons){
    out[k]=React.createElement('svg',{viewBox:'0 0 24 24',width:'100%',height:'100%',fill:'none',stroke:'currentColor',strokeWidth:2.75,strokeLinecap:'round',strokeLinejoin:'round',style:{display:'block'}},
      icons[k].map((p,i)=>typeof p==='string'?React.createElement('path',{key:i,d:p}):React.createElement(p[0],Object.assign({key:i},p[1]))));
  }
  return out;
}
window.TR={icons,cats,receipts,scanDraft,categoryTotals,months,calendar,money,dlabel,mkIcons};
})();
