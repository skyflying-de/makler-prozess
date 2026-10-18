/* ================= Icons ================= */
const P={home:'<path d="M3 11l9-7 9 7"/><path d="M6 10v10h12V10"/>',obj:'<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/>',cases:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/>',
cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
play:'<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',pause:'<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
stop:'<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',plus:'<path d="M12 5v14M5 12h14"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>',down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
clip:'<path d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 7"/>',bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',swap:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
back:'<path d="M15 6l-6 6 6 6"/>',fwd:'<path d="M9 6l6 6-6 6"/>',print:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',
doc:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',check:'<path d="M5 12l5 5 9-10"/>',folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
bell:'<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'};
const ic=(n,a="")=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${a}>${P[n]}</svg>`;

/* ================= Konstanten & Helfer ================= */
const STAGES=["Neuer Auftrag","Datenaufnahme","Durchführung","Abschluss","Abrechnung"];
const TYPES={sale:"Verkauf",rent:"Vermietung"};
const BILL={courtage:"Courtage (Zeit = Nachweis)",hours:"Stunden nach Leistungskatalog",mixed:"Courtage + Zusatzleistungen",flat:"Pauschale"};
const FTYPES={text:"Text",number:"Zahl",money:"Betrag €",date:"Datum",select:"Auswahl",bool:"Ja/Nein",textarea:"Mehrzeilig",file:"Anhang",section:"Abschnitt"};
const FSCOPE={object:"Objekt",sale:"Fall Verkauf",rent:"Fall Vermietung"};
const DAY=86400000;
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur=v=>(+v||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const hm=ms=>{const m=Math.round(ms/60000);return Math.floor(m/60)+":"+String(m%60).padStart(2,"0")};
const hd=ms=>(ms/3600000).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
const dt=t=>new Date(t).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
const dshort=t=>new Date(t).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
const tm=t=>new Date(t).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
const pad=n=>String(n).padStart(2,"0");
const isoD=t=>{const d=new Date(t);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const isoT=t=>{const d=new Date(t);return pad(d.getHours())+":"+pad(d.getMinutes())};
const dayStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const weekStart=t=>{const d=new Date(dayStart(t));const wd=(d.getDay()+6)%7;return d.getTime()-wd*DAY};
const $=s=>document.querySelector(s);
const num=s=>parseFloat(String(s??"").replace(/\./g,"").replace(",","."))||0;
function toast(t){document.querySelectorAll(".toast").forEach(x=>x.remove());const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2300)}

/* ================= Startkonfiguration ================= */
function F(label,type="text",o={}){return {id:uid(),label,type,options:o.options||"",required:!!o.req,active:o.active!==false}}
function seedSettings(){
  const services=[["Beratung / Gespräch",95],["Besichtigung vor Ort",95],["Fahrtzeit",55],["Objektaufnahme & Vermessung",85],["Fotografie & Grundriss",75],
    ["Exposé & Marketing",75],["Büro / Administration",60],["Telefon & Korrespondenz",60],["Verhandlung",110],["Vertragswesen",110],["Behörden / Notar",95],
    ["Unterlagenbeschaffung",65],["Bonitäts- / Finanzierungsprüfung",80]].map(([n,r])=>({id:uid(),name:n,rate:r,billable:n!=="Fahrtzeit",active:true}));
  const S=n=>services.find(s=>s.name.startsWith(n)).id;
  const fields={
    object:[F("Lage","section"),F("Objektart","select",{options:"Einfamilienhaus;Doppelhaushälfte;Reihenhaus;Eigentumswohnung;Wohnung;Mehrfamilienhaus;Grundstück;Gewerbe",req:1}),F("Adresse","text",{req:1}),F("Etage"),
      F("Eckdaten","section"),F("Wohnfläche (m²)","number",{req:1}),F("Grundstücksfläche (m²)","number"),F("Zimmer","number"),F("Baujahr","number"),
      F("Zustand","select",{options:"Neuwertig;Gepflegt;Renovierungsbedürftig;Sanierungsbedürftig"}),F("Keller","bool"),F("Balkon / Terrasse","bool"),F("Einbauküche","bool"),F("Stellplatz / Garage"),
      F("Energie","section"),F("Energieausweis","select",{options:"Verbrauchsausweis;Bedarfsausweis;liegt nicht vor"}),F("Energiekennwert (kWh/m²a)","number"),F("Effizienzklasse","select",{options:"A+;A;B;C;D;E;F;G;H"}),
      F("Unterlagen","section"),F("Grundbuchauszug","file"),F("Flurkarte","file"),F("Teilungserklärung (ETW)","file"),F("Grundrisse","file"),F("Fotos","file")],
    sale:[F("Eigentümer","section"),F("Name Eigentümer","text",{req:1}),F("Telefon"),F("E-Mail"),F("Maklerauftrag","section"),
      F("Auftragsart","select",{options:"Alleinauftrag;Einfacher Auftrag;Qualifizierter Alleinauftrag",req:1}),F("Auftrag unterschrieben am","date"),F("Laufzeit bis","date"),
      F("Provision Käufer (%)","number"),F("Provision Verkäufer (%)","number"),F("Maklervertrag","file"),
      F("Preis & Abschluss","section"),F("Preisvorstellung Eigentümer","money"),F("Angebotspreis","money",{req:1}),F("Erzielter Kaufpreis","money"),F("Käufer"),F("Notartermin","date"),F("Kaufvertrag","file"),F("Bemerkungen","textarea")],
    rent:[F("Vermieter","section"),F("Name Vermieter","text",{req:1}),F("Telefon"),F("E-Mail"),F("Auftrag","section"),F("Auftrag erteilt am","date"),
      F("Provision (Monatskaltmieten)","number",{req:1}),F("Vermittlungsauftrag","file"),F("Miete","section"),F("Kaltmiete","money",{req:1}),F("Nebenkosten","money"),F("Heizkosten","money"),
      F("Kaution","money"),F("Verfügbar ab","date",{req:1}),F("Haustiere erlaubt","select",{options:"Ja;Nein;Nach Absprache"}),
      F("Mieter","section"),F("Wunsch-Mieterprofil","textarea"),F("Neuer Mieter"),F("E-Mail Mieter"),F("Mietbeginn","date"),F("Mietvertrag","file"),F("Übergabeprotokoll","file")]
  };
  const A=(name,stage,svc)=>({id:uid(),name,stage,services:svc.map(S),def:S(svc[0]),active:true});
  const actions={
    sale:[A("Erstgespräch Eigentümer",0,["Beratung","Fahrtzeit","Telefon"]),A("Objektbesichtigung & Aufnahme",1,["Objektaufnahme","Fotografie","Fahrtzeit"]),
      A("Wertermittlung",1,["Büro"]),A("Unterlagen beschaffen",1,["Unterlagen","Behörden","Telefon"]),A("Exposé erstellen",2,["Exposé","Fotografie"]),
      A("Inserat veröffentlichen",2,["Exposé","Büro"]),A("Interessentenanfrage bearbeiten",2,["Telefon","Büro"]),A("Besichtigung mit Interessent",2,["Besichtigung","Fahrtzeit"]),
      A("Finanzierungsnachweis prüfen",2,["Bonitäts"]),A("Kaufpreisverhandlung",3,["Verhandlung","Telefon"]),A("Notartermin vorbereiten",3,["Vertragswesen","Behörden"]),
      A("Notartermin begleiten",3,["Behörden","Fahrtzeit"]),A("Objektübergabe",3,["Besichtigung","Fahrtzeit"])],
    rent:[A("Auftragsgespräch Vermieter",0,["Beratung","Fahrtzeit","Telefon"]),A("Objektaufnahme",1,["Objektaufnahme","Fotografie","Fahrtzeit"]),A("Mietpreisermittlung",1,["Büro"]),
      A("Exposé & Inserat",2,["Exposé","Büro"]),A("Anfragen bearbeiten",2,["Telefon","Büro"]),A("Besichtigung durchführen",2,["Besichtigung","Fahrtzeit"]),
      A("Selbstauskunft & Bonität prüfen",2,["Bonitäts"]),A("Mietvertrag erstellen",3,["Vertragswesen"]),A("Übergabe & Protokoll",3,["Besichtigung","Fahrtzeit"]),A("Kaution / Abschluss",3,["Büro"])]
  };
  const users=[{id:"u1",name:"Andrea Huber",short:"AH",role:"admin",color:"#2563eb"},{id:"u2",name:"Markus Steiner",short:"MS",role:"user",color:"#0f8a7a"},{id:"u3",name:"Lena Bauer",short:"LB",role:"user",color:"#b45309"}];
  actions.rent.find(a=>a.name.startsWith("Übergabe")).proto=true;
  return {services,fields,actions,users,protocol:seedProtocol(),design:seedDesign()};
}
function seed(){
  const st=seedSettings(),now=Date.now(),H=3600000;
  const fid=(scope,l)=>st.fields[scope].find(f=>f.label===l).id;
  const objects=[],cases=[],entries=[],tasks=[];
  const mkO=(title,data,daysAgo)=>{const o={id:uid(),no:"O-"+String(objects.length+12).padStart(4,"0"),title,data:{},files:{},created:now-daysAgo*DAY};for(const[k,v]of Object.entries(data))o.data[fid("object",k)]=v;objects.push(o);return o};
  const mkC=(o,type,title,stage,client,daysAgo,billing,data,owner)=>{const c={id:uid(),no:"",type,objectId:o.id,title,client,stage,billing,flat:0,extra:[],created:now-daysAgo*DAY,stageDates:{},closed:null,billed:false,data:{},files:{},owner};
    const span=daysAgo/(stage+1.4);for(let i=0;i<=stage;i++)c.stageDates[i]=c.created+Math.round(i*span)*DAY;if(stage>=3)c.closed=c.stageDates[3];
    for(const[k,v]of Object.entries(data))c.data[fid(type,k)]=v;cases.push(c);return c};
  const o1=mkO("EFH Ahornweg 12, Landshut",{"Objektart":"Einfamilienhaus","Adresse":"Ahornweg 12, 84034 Landshut","Wohnfläche (m²)":"148","Grundstücksfläche (m²)":"620","Zimmer":"6","Baujahr":"1994","Zustand":"Gepflegt","Keller":"true","Energieausweis":"Bedarfsausweis","Effizienzklasse":"D"},60);
  const o2=mkO("ETW Altstadt 214, Landshut",{"Objektart":"Eigentumswohnung","Adresse":"Altstadt 214, 84028 Landshut","Wohnfläche (m²)":"86","Zimmer":"3","Etage":"3. OG","Balkon / Terrasse":"true"},400);
  const o3=mkO("Baugrundstück Ergolding",{"Objektart":"Grundstück","Adresse":"Am Feldrain, 84030 Ergolding","Grundstücksfläche (m²)":"780"},3);
  const o4=mkO("RH Lindenstraße 8, Deggendorf",{"Objektart":"Reihenhaus","Adresse":"Lindenstraße 8, 94469 Deggendorf","Wohnfläche (m²)":"121","Zimmer":"5","Baujahr":"2003"},90);
  const o5=mkO("Whg. Nikolastraße 41, Landshut",{"Objektart":"Wohnung","Adresse":"Nikolastraße 41, 84034 Landshut","Wohnfläche (m²)":"58","Zimmer":"2","Etage":"2. OG","Einbauküche":"true"},500);
  const o6=mkO("Gewerbe Achdorfer Weg 3",{"Objektart":"Gewerbe","Adresse":"Achdorfer Weg 3, 84036 Landshut","Wohnfläche (m²)":"120"},6);
  const o7=mkO("DHH Am Bach 5, Kumhausen",{"Objektart":"Doppelhaushälfte","Adresse":"Am Bach 5, 84036 Kumhausen","Wohnfläche (m²)":"112","Zimmer":"4","Balkon / Terrasse":"true"},70);
  const c1=mkC(o1,"sale","Verkauf EFH Ahornweg",2,"Familie Berger",34,"courtage",{"Name Eigentümer":"Thomas Berger","Telefon":"0871 123456","Auftragsart":"Alleinauftrag","Provision Käufer (%)":"3,57","Provision Verkäufer (%)":"3,57","Preisvorstellung Eigentümer":"720.000","Angebotspreis":"689.000"},"u1");
  const c0=mkC(o2,"rent","Vermietung ETW Altstadt (2024)",4,"H. Krämer",380,"courtage",{"Name Vermieter":"Helga Krämer","Provision (Monatskaltmieten)":"2","Kaltmiete":"980","Verfügbar ab":"2024-11-01","Neuer Mieter":"J. Wagner"},"u2");c0.billed=true;
  const c2=mkC(o2,"sale","Verkauf ETW Altstadt",1,"H. Krämer",9,"mixed",{"Name Eigentümer":"Helga Krämer","Auftragsart":"Einfacher Auftrag","Provision Käufer (%)":"3,57"},"u1");
  const c3=mkC(o3,"sale","Verkauf Baugrundstück",0,"Erbengemeinschaft Huber",2,"hours",{"Name Eigentümer":"Erbengemeinschaft Huber"},"u3");
  const c4=mkC(o4,"sale","Verkauf RH Deggendorf",4,"Fam. Schmid",61,"courtage",{"Name Eigentümer":"Markus Schmid","Auftragsart":"Qualifizierter Alleinauftrag","Provision Käufer (%)":"3,57","Provision Verkäufer (%)":"2,38","Angebotspreis":"419.000","Erzielter Kaufpreis":"405.000","Käufer":"Fam. Lorenz"},"u2");
  const c5=mkC(o5,"rent","Neuvermietung Nikolastraße",2,"Hausverwaltung Prell",15,"courtage",{"Name Vermieter":"Hausverwaltung Prell GmbH","Provision (Monatskaltmieten)":"2","Kaltmiete":"690","Nebenkosten":"160","Kaution":"2.070","Verfügbar ab":"2026-11-01"},"u2");
  const c6=mkC(o6,"rent","Vermietung Gewerbefläche",1,"S. Oberhofer",5,"flat",{"Name Vermieter":"Sabine Oberhofer"},"u3");c6.flat=1500;
  const c7=mkC(o7,"rent","Vermietung DHH Kumhausen",3,"Dr. Weiß",48,"hours",{"Name Vermieter":"Dr. Anton Weiß","Provision (Monatskaltmieten)":"2","Kaltmiete":"1.450","Verfügbar ab":"2026-10-01","Neuer Mieter":"Familie Öztürk"},"u3");
  let n=40;cases.forEach(c=>c.no=(c.type==="sale"?"V-":"M-")+(c===c0?"2024-":"2026-")+String(++n).padStart(3,"0"));
  const act=(t,nm)=>st.actions[t].find(a=>a.name.startsWith(nm));
  const add=(c,an,daysAgo,startH,durMin,{pause=0,note="",svc=0,user}={})=>{const a=act(c.type,an);const d=new Date(now-daysAgo*DAY);d.setHours(Math.floor(startH),Math.round((startH%1)*60),0,0);
    const u=user||c.owner;entries.push({id:uid(),caseId:c.id,actionId:a.id,serviceId:a.services[svc]||a.def,userId:u,start:d.getTime(),end:d.getTime()+(durMin+pause)*60000,pause:pause*60000,pauseAt:null,note,createdBy:u,history:[]})};
  add(c0,"Auftragsgespräch",378,10,40);add(c0,"Besichtigung",360,17,90);add(c0,"Mietvertrag",350,9,60);
  add(c1,"Erstgespräch",33,9.5,75,{note:"Vermarktungskonzept vorgestellt"});add(c1,"Erstgespräch",33,11,25,{svc:1});add(c1,"Objektbesichtigung",30,14,120,{pause:10});add(c1,"Objektbesichtigung",30,16.5,45,{svc:1,user:"u3"});
  add(c1,"Wertermittlung",29,10,90);add(c1,"Unterlagen",27,8.5,60,{note:"Grundbuch & Flurkarte angefordert",user:"u3"});add(c1,"Exposé",21,13,150,{pause:15});add(c1,"Inserat",20,9,30);
  add(c1,"Interessentenanfrage",14,10,45,{user:"u3"});add(c1,"Besichtigung mit",12,16,60,{note:"Fam. Lorenz, sehr interessiert",user:"u2"});add(c1,"Besichtigung mit",12,15.5,25,{svc:1,user:"u2"});add(c1,"Besichtigung mit",7,17,45);add(c1,"Finanzierungsnachweis",3,11,30);
  add(c2,"Erstgespräch",8,10,60);add(c2,"Objektbesichtigung",4,15,90);add(c2,"Objektbesichtigung",4,14.5,25,{svc:2});
  add(c3,"Erstgespräch",1,14,45,{note:"3 Erben – Vollmachten klären"});
  add(c4,"Erstgespräch",60,9,60);add(c4,"Objektbesichtigung",57,13,100);add(c4,"Exposé",50,9,120);add(c4,"Besichtigung mit",40,17,60);add(c4,"Besichtigung mit",38,17,60,{user:"u3"});
  add(c4,"Kaufpreisverhandlung",20,10,90,{note:"Einigung bei 405.000 €"});add(c4,"Notartermin vorbereiten",15,9,75);add(c4,"Notartermin begleiten",8,10,120);add(c4,"Notartermin begleiten",8,9.3,40,{svc:1});
  add(c5,"Auftragsgespräch",14,9,45);add(c5,"Objektaufnahme",13,11,60);add(c5,"Exposé",12,14,60);add(c5,"Anfragen",6,9,90,{note:"32 Anfragen gesichtet"});add(c5,"Besichtigung durchführen",2,17,90,{note:"Sammeltermin 6 Parteien",user:"u1"});
  add(c6,"Auftragsgespräch",4,10,40);add(c6,"Objektaufnahme",3,9,75,{user:"u2"});
  add(c7,"Auftragsgespräch",47,10,40);add(c7,"Objektaufnahme",45,14,75);add(c7,"Besichtigung durchführen",30,17,120);add(c7,"Selbstauskunft",25,10,45);add(c7,"Mietvertrag",20,9,90);add(c7,"Übergabe",10,15,60);
  const ra=act("rent","Selbstauskunft");entries.push({id:uid(),caseId:c5.id,actionId:ra.id,serviceId:ra.def,userId:"u1",start:now-38*60000,end:null,pause:0,pauseAt:null,note:"",createdBy:"u1",history:[]});
  const rb=act("sale","Interessentenanfrage");entries.push({id:uid(),caseId:c1.id,actionId:rb.id,serviceId:rb.def,userId:"u3",start:now-12*60000,end:null,pause:0,pauseAt:null,note:"",createdBy:"u3",history:[]});
  const T=(c,kind,title,dayOff,hour,{dur=60,user,action,done=false}={})=>{const d=new Date(dayStart(now)+dayOff*DAY);d.setHours(Math.floor(hour),Math.round((hour%1)*60));
    tasks.push({id:uid(),caseId:c.id,kind,title,due:d.getTime(),dur,userId:user||c.owner,actionId:action?act(c.type,action).id:null,done,note:""})};
  T(c1,"termin","Besichtigung Fam. Lorenz (2. Termin)",0,17,{action:"Besichtigung mit",user:"u2"});T(c1,"wv","Finanzierungsbestätigung Lorenz nachfassen",1,9,{user:"u1"});
  T(c1,"termin","Besichtigung Hr. Demir",2,16.5,{action:"Besichtigung mit",user:"u2"});T(c2,"termin","Fototermin ETW",1,10,{action:"Objektbesichtigung",user:"u1"});
  T(c2,"wv","Teilungserklärung bei Verwaltung anfordern",-2,9,{user:"u3"});T(c3,"wv","Erbschein / Vollmachten anfordern",3,9,{user:"u3"});T(c3,"termin","Ortstermin Grundstück",4,14,{action:"Objektbesichtigung",user:"u3"});
  T(c5,"termin","Besichtigung 3 Parteien",1,17,{action:"Besichtigung durchführen",user:"u2"});T(c5,"wv","Selbstauskünfte vollständig?",2,11,{user:"u2"});
  T(c6,"termin","Exposé-Abstimmung Fr. Oberhofer",3,11,{action:"Auftragsgespräch",user:"u3"});T(c7,"wv","Kautionseingang prüfen",-1,10,{user:"u3"});T(c4,"wv","Leistungsnachweis an Fam. Schmid",0,14,{user:"u1",done:true});
  // Beispiel: unterschriebenes Einzugsprotokoll DHH Kumhausen
  const p=makeProtocol(st,c7,"Einzug","u3");p.date=now-10*DAY;p.created=now-10*DAY;p.no="UP-2026-017";
  const rs=p.sections.find(s=>s.type==="rooms");rs.rooms=rs.rooms.filter(r=>!/Kinderzimmer|WC/.test(r.name));
  rs.rooms.forEach((r,ri)=>rs.items.forEach((it,ii)=>{r.values[it.id]={z:p.states[(ri*7+ii)%11===3?1:0]}}));
  const rr=(room,item,z,note)=>{const r=rs.rooms.find(x=>x.name===room),it=rs.items.find(x=>x.label.startsWith(item));r.values[it.id]={z,note}};
  rr("Wohnzimmer","Boden","Mängel","Kratzer Parkett vor Terrassentür ca. 30 cm");rr("Bad","Sanitär","Mängel","Silikonfuge Dusche verfärbt – Vermieter erneuert bis 15.10.");
  const ph=(room,item,t1,col)=>{const r=rs.rooms.find(x=>x.name===room),it=rs.items.find(x=>x.label.startsWith(item));r.values[it.id].photos=[demoPhoto(t1,col)]};
  ph("Wohnzimmer","Boden","Kratzer Parkett","#9a6b3f");ph("Bad","Sanitär","Silikonfuge Dusche","#7f97a8");rr("Küche","Wände","Gebrauchsspuren","Bohrlöcher gespachtelt");
  p.sections.filter(s=>s.type==="checklist").forEach(s=>s.items.forEach(i=>s.values[i.id]={z:p.states[0]}));
  const ms=p.sections.find(s=>s.type==="meters");[["4711-02",'18.402 kWh'],["G-88123",'7.215 m³'],["W-5521",'412,6 m³'],["W-5522",'188,3 m³'],["",""],["HKV 1–6",'je 0 (neu)']].forEach(([nr,st2],i)=>{if(nr)ms.values[ms.items[i].id]={nr,stand:st2}});
  ms.values[ms.items[0].id].photos=[demoPhoto("Stromzähler 18.402 kWh","#3d4a5c")];
  const ks=p.sections.find(s=>s.type==="keys");[3,3,2,1,1,0].forEach((n,i)=>ks.values[ks.items[i].id]={n:String(n),note:i===1?"Sicherungskarte übergeben":""});
  const gs=p.sections.filter(s=>s.type==="fields")[1];if(gs)gs.items.forEach(i=>{if(i.ftype==="bool")gs.values[i.id]="true";else gs.values[i.id]="Fuge Dusche erneuern (Vermieter), Termin bis 15.10."});
  p.status="signed";p.signMode="print";p.signedAt=now-9*DAY;p.signed=["Uebergabeprotokoll_DHH_Kumhausen_unterschrieben.pdf"];
  const upf=st.fields.rent.find(f=>f.label==="Übergabeprotokoll");c7.files[upf.id]=[...p.signed];
  return {settings:st,objects,cases,entries,tasks,protocols:[p],ui:{user:"u1"}};
}

/* ================= Speicher ================= */
let DB=null,ENV=null,SAVEBLOCK=false,saveT=null,dirty=false;
const MOBILE=!!(window.PLATFORM&&PLATFORM.mobile); // Tablet: Android-App oder Browser-App (PWA)
function migrate(){
// Migration v0.2 -> v0.3
if(!DB.settings.protocol)DB.settings.protocol=seedProtocol();
if(!DB.settings.design)DB.settings.design=seedDesign();
if(!DB.protocols)DB.protocols=[];
{const ua=DB.settings.actions.rent.find(a=>a.name.startsWith("Übergabe"));if(ua&&ua.proto===undefined)ua.proto=true}
// Migration v0.3 -> v0.4
{const rf=DB.settings.fields.rent;if(!rf.some(f=>f.label==="E-Mail Mieter")){const i=rf.findIndex(f=>f.label==="Neuer Mieter");rf.splice(i<0?rf.length:i+1,0,F("E-Mail Mieter"))}}
DB.protocols.forEach(p=>{if(p.status==="signed"&&!p.signMode)p.signMode="print"});
{const pd=DB.settings.design.docs.proto;if(pd.showPhotos===undefined)pd.showPhotos=true;if(pd.photoAppendix===undefined)pd.photoAppendix=true}
  DB.meta=DB.meta||{created:Date.now()};DB.settings.authMode=DB.settings.authMode||"select";
  if(!DB.ui||!DB.settings.users.some(u=>u.id===DB.ui.user))DB.ui={...(DB.ui||{}),user:DB.settings.users[0].id};
}
const save=()=>{if(!DB||SAVEBLOCK)return true;dirty=true;clearTimeout(saveT);saveT=setTimeout(flush,250);return true};
async function flush(){clearTimeout(saveT);if(!dirty||SAVEBLOCK||!DB)return;dirty=false;try{await api.save(JSON.stringify(DB));if(typeof cloudAfterSave==="function")cloudAfterSave()}catch(e){dirty=true;toast("Speichern fehlgeschlagen: "+e.message)}}

/* ================= Zugriff ================= */
const ME=()=>DB.settings.users.find(u=>u.id===DB.ui.user)||DB.settings.users[0];
const isAdmin=()=>ME().role==="admin";
const userBy=id=>DB.settings.users.find(u=>u.id===id)||{name:"?",short:"?",color:"#888"};
const av=id=>{const u=userBy(id);return `<span class="av" style="--c:${u.color}" title="${esc(u.name)}">${u.short}</span>`};
const caseBy=id=>DB.cases.find(c=>c.id===id);
const objBy=id=>DB.objects.find(o=>o.id===id);
const actBy=(t,id)=>DB.settings.actions[t].find(a=>a.id===id)||{name:"(gelöschte Aktion)",services:[],stage:2};
const svcBy=id=>DB.settings.services.find(s=>s.id===id)||{name:"?",rate:0,billable:false};
const net=e=>{const end=e.end||Date.now();const pz=e.pause+(e.pauseAt?(Date.now()-e.pauseAt):0);return Math.max(0,end-e.start-pz)};
const caseEntries=id=>DB.entries.filter(e=>e.caseId===id).sort((a,b)=>b.start-a.start);
const sumNet=E=>E.reduce((a,e)=>a+net(e),0);
const fieldVal=(c,l)=>{const f=DB.settings.fields[c.type].find(x=>x.label===l);return f?c.data[f.id]:""};
const objVal=(o,l)=>{const f=DB.settings.fields.object.find(x=>x.label===l);return f?o.data[f.id]:""};
function completeness(rec,scope){const fs=DB.settings.fields[scope].filter(f=>f.active&&f.required&&f.type!=="section");if(!fs.length)return 1;
  return fs.filter(f=>f.type==="file"?(rec.files[f.id]||[]).length:String(rec.data[f.id]??"").trim()!=="").length/fs.length}
const folderRel=(rec,scope,f)=>{const o=scope==="object"?rec:objBy(rec.objectId);let p=`Objekte/${o.no} ${o.title.split(",")[0]}`;if(scope!=="object")p+=`/${rec.no} ${TYPES[rec.type]}`;return (p+(f?`/${f.label}`:"")).replace(/[<>:"\\|?*]/g,"_")};
const folder=(rec,scope,f)=>(ENV&&ENV.cfg.dataDir?ENV.cfg.dataDir+"\\dateien\\":"")+folderRel(rec,scope,f).replace(/\//g,"\\");

/* ================= Modal ================= */
function modal(title,body,{ok="Speichern",onOk,del,onDel,wide,extra=""}={}){
  const ov=document.createElement("div");ov.className="ov";
  ov.innerHTML=`<div class="modal" style="${wide?"width:min(780px,100%)":""}" role="dialog" aria-label="${esc(title)}"><header>${esc(title)}</header><div class="b">${body}<div class="err"></div></div>
  <footer>${del?`<button class="btn danger l" data-x="del">${ic("trash")}${del}</button>`:""}${extra}<button class="btn" data-x="c">${ok?"Abbrechen":"Schließen"}</button>${ok?`<button class="btn pri" data-x="ok">${ok}</button>`:""}</footer></div>`;
  document.body.appendChild(ov);
  const close=()=>{ov.remove();document.removeEventListener("keydown",k)};ov.close=close;
  const run=f=>{try{if(f(ov)!==false){close();save();render()}}catch(e){ov.querySelector(".err").textContent=e.message}};
  const k=e=>{if(e.key==="Escape")close()};document.addEventListener("keydown",k);
  ov.addEventListener("mousedown",e=>{if(e.target===ov)close()});
  ov.querySelector('[data-x=c]').onclick=close;
  if(ok)ov.querySelector('[data-x=ok]').onclick=()=>run(onOk);
  if(del)ov.querySelector('[data-x=del]').onclick=()=>run(onDel);
  setTimeout(()=>{const f=ov.querySelector("input:not([type=checkbox]):not([type=radio]),select");f&&f.focus()},30);
  return ov;
}
const v=(ov,n)=>{const el=ov.querySelector(`[name="${n}"]`);if(!el)return "";if(el.type==="radio")return ov.querySelector(`[name="${n}"]:checked`)?.value;return el.type==="checkbox"?el.checked:el.value};
function pop(anchor,items){document.querySelectorAll(".pop").forEach(p=>p.remove());const r=anchor.getBoundingClientRect();const p=document.createElement("div");p.className="pop";
  p.style.left=Math.min(r.left,innerWidth-260)+"px";p.style.top=(r.bottom+6)+"px";p.innerHTML=items.map((it,i)=>`<button data-i="${i}" class="${it.cur?"cur":""}">${esc(it.label)}</button>`).join("");
  document.body.appendChild(p);p.querySelectorAll("button").forEach(b=>b.onclick=()=>{p.remove();items[b.dataset.i].fn()});
  setTimeout(()=>document.addEventListener("mousedown",function h(e){if(!p.contains(e.target)){p.remove();document.removeEventListener("mousedown",h)}}),0)}

/* ================= Navigation ================= */
let VIEW="start",ARG=null,TAB="akt",OTAB="daten",SETTAB="fields",SETSCOPE="object",FILTER="all",MODE="board",WEEK=0,RTAB="ma",RPER="week",ROFF=0,RTYPE="sale",ZUSER="me";
const NAV=[["start","Start","home"],["laufend","Laufend","play"],["objekte","Objekte","obj"],["faelle","Fälle","cases"],["kalender","Termine","cal"],["zeiten","Zeiterfassung","clock"],["auswertung","Auswertungen","chart"],null,["einstellungen","Einstellungen","cog"]];
function go(v,a=null){VIEW=v;ARG=a;render();$("main").scrollTop=0}
const navItems=()=>MOBILE?NAV.filter(n=>!n||n[0]!=="auswertung").map(n=>n&&n[0]==="einstellungen"?["einstellungen","Gerät","cog"]:n):NAV;
function renderNav(){
  $("#nav").innerHTML=navItems().map(n=>n?`<button class="${(VIEW===n[0]||(VIEW==="fall"&&n[0]==="faelle")||(VIEW==="objekt"&&n[0]==="objekte"))?"on":""}" onclick="go('${n[0]}')">${ic(n[2])}${n[1]}${n[0]==="laufend"&&running().length?`<span class="nbadge">${running().length}</span>`:""}${n[0]==="einstellungen"&&!isAdmin()&&!MOBILE?ic("lock",'style="width:13px;margin-left:auto"'):""}</button>`:'<div class="sep"></div>').join("");
  renderUserbox();
}

/* ================= Laufleiste ================= */
const running=()=>DB.entries.filter(e=>!e.end).sort((a,b)=>a.start-b.start);
function runCtl(e,{open=true,edit=true}={}){return `${e.pauseAt?`<button class="ib solid" title="Fortsetzen" aria-label="Fortsetzen" onclick="event.stopPropagation();resumeE('${e.id}')">${ic("play")}</button>`:`<button class="ib solid" title="Pause" aria-label="Pause" onclick="event.stopPropagation();pauseE('${e.id}')">${ic("pause")}</button>`}
  <button class="ib solid" title="Leistung wechseln" aria-label="Leistung wechseln" onclick="event.stopPropagation();switchSvc('${e.id}',this)">${ic("swap")}</button>
  <button class="ib solid" title="Stopp" aria-label="Stopp" onclick="event.stopPropagation();stopE('${e.id}')">${ic("stop")}</button>
  ${edit?`<button class="ib solid" title="Buchung bearbeiten" aria-label="Buchung bearbeiten" onclick="event.stopPropagation();editEntry('${e.id}')">${ic("edit")}</button>`:""}
  ${open?`<button class="ib solid" title="Fall öffnen" aria-label="Fall öffnen" onclick="event.stopPropagation();openRun('${e.id}')">${ic("fwd")}</button>`:""}`}
function openRun(eid){const e=DB.entries.find(x=>x.id===eid);if(!e)return;TAB="akt";FLASH=eid;go("fall",e.caseId)}
let FLASH=null;
function renderDock(){
  const all=running(),mine=all.filter(e=>e.userId===DB.ui.user),others=all.filter(e=>e.userId!==DB.ui.user);
  let h=`<span class="lbl">Läuft bei mir</span>`;
  if(!mine.length)h+=`<span class="muted" style="font-size:13px">Keine Aktion aktiv</span>`;
  mine.forEach(e=>{const c=caseBy(e.caseId),a=actBy(c.type,e.actionId);
    h+=`<div class="run click ${e.pauseAt?"paused":""}" onclick="openRun('${e.id}')" title="Klick öffnet den Fall"><span class="dotlive"></span><div class="tt"><div class="t1">${esc(a.name)} · <span class="muted">${esc(svcBy(e.serviceId).name)}</span></div><div class="t2">${c.no} · ${esc(c.title)}</div></div>
    <span class="clk" data-e="${e.id}">${hm(net(e))}</span>${runCtl(e,{open:false,edit:false})}</div>`});
  h+=`<button class="btn ${VIEW==="laufend"?"pri":""}" onclick="go('laufend')" title="Alle laufenden Aktionen im Büro">${others.length?others.slice(0,4).map(e=>av(e.userId)).join(""):ic("play")} <span class="lbl2">Alle laufenden</span> <span class="nbadge" style="margin-left:2px">${all.length}</span></button>`;
  h+=`<div class="sp"></div>${typeof syPillHTML==="function"?syPillHTML():""}<button class="btn pri" onclick="quick()">${ic("bolt")}<span class="lbl2">Aktion erfassen</span></button>${MOBILE?`<button class="userchip" onclick="lockNow()" title="Gerät sperren">${av(DB.ui.user)}${ic("lock")}</button>`:""}<button class="ib solid helpbtn" title="Hilfe (F1)" aria-label="Hilfe" onclick="help()">?</button>`;
  $("#dock").innerHTML=h;
}
setInterval(()=>{document.querySelectorAll("[data-e]").forEach(el=>{const e=DB.entries.find(x=>x.id===el.dataset.e);if(e)el.textContent=hm(net(e))})},1000);

/* ================= Zeitbuchung ================= */
function startAction(caseId,actionId,serviceId,note=""){
  const c=caseBy(caseId),a=actBy(c.type,actionId);
  DB.entries.push({id:uid(),caseId,actionId,serviceId:serviceId||a.def,userId:DB.ui.user,start:Date.now(),end:null,pause:0,pauseAt:null,note,createdBy:DB.ui.user,history:[]});
  if(c.stage<2&&a.stage>=2)setStageRaw(c,2);
  if(a.proto&&c.type==="rent"){VIEW="fall";ARG=c.id;TAB="proto"}
  DB.ui.lastCase=c.id;save();render();toast("Gestartet: "+a.name+(a.proto?" – Übergabeprotokoll geöffnet":""));
}
const foreignOk=(e,what)=>e.userId===DB.ui.user||confirm(`Diese Aktion läuft bei ${userBy(e.userId).name}.\n${what}?`);
function pauseE(id){const e=DB.entries.find(x=>x.id===id);if(!foreignOk(e,"Trotzdem pausieren"))return;e.pauseAt=Date.now();e.history.push({at:Date.now(),by:DB.ui.user,text:"pausiert"});save();render()}
function resumeE(id){const e=DB.entries.find(x=>x.id===id);e.pause+=Date.now()-e.pauseAt;e.pauseAt=null;save();render()}
function finish(e){if(e.pauseAt){e.pause+=Date.now()-e.pauseAt;e.pauseAt=null}e.end=Date.now()}
function stopE(id){const e=DB.entries.find(x=>x.id===id);if(!foreignOk(e,"Trotzdem stoppen"))return;finish(e);if(e.userId!==DB.ui.user)e.history.push({at:Date.now(),by:DB.ui.user,text:"gestoppt durch "+ME().short});save();render();editEntry(id,"Aktion abschließen")}
function switchSvc(id,btn){const e=DB.entries.find(x=>x.id===id),c=caseBy(e.caseId),a=actBy(c.type,e.actionId);
  pop(btn,a.services.map(s=>({label:svcBy(s).name,cur:s===e.serviceId,fn:()=>{if(s===e.serviceId)return;finish(e);
    DB.entries.push({id:uid(),caseId:c.id,actionId:a.id,serviceId:s,userId:e.userId,start:Date.now(),end:null,pause:0,pauseAt:null,note:"",createdBy:DB.ui.user,history:[]});save();render();toast("Leistung gewechselt: "+svcBy(s).name)}})))}

/* Schnellerfassung: starten ODER nachtragen; Auswahl über Fall oder Objekt */
function quick(pre={}){
  const open=DB.cases.filter(c=>c.stage<4);
  let cid=pre.caseId||(DB.ui.lastCase&&caseBy(DB.ui.lastCase)&&caseBy(DB.ui.lastCase).stage<4?DB.ui.lastCase:open[0]?.id);
  const ov=modal("Aktion erfassen",`<div class="seg" style="margin-bottom:12px" id="qm"><button class="on" data-m="start">Jetzt starten</button><button data-m="doc">Erledigte Aktion nachtragen</button></div>
   <div class="form">
    <label>Fall</label><select name="case">${DB.objects.map(o=>{const cs=open.filter(c=>c.objectId===o.id);return cs.length?`<optgroup label="${esc(o.no+" · "+o.title)}">${cs.map(c=>`<option value="${c.id}" ${c.id===cid?"selected":""}>${c.no} · ${TYPES[c.type]} · ${esc(c.title)}</option>`).join("")}</optgroup>`:""}).join("")}</select>
    <label>Aktion</label><select name="action"></select>
    <label>Leistung</label><select name="svc"></select>
    <label class="qd">Mitarbeiter</label><select class="qd" name="user">${DB.settings.users.map(u=>`<option value="${u.id}" ${u.id===DB.ui.user?"selected":""}>${esc(u.name)}</option>`).join("")}</select>
    <label class="qd">Datum</label><input class="qd" type="date" name="date" value="${isoD(Date.now())}">
    <label class="qd">Von / Bis</label><div class="qd" style="display:flex;gap:8px"><input type="time" name="from" value="${isoT(Date.now()-3600000)}"><input type="time" name="to" value="${isoT(Date.now())}"></div>
    <label class="qd">Pause (Min.)</label><input class="qd" type="number" name="pause" value="0" min="0">
    <label>Notiz</label><input name="note" placeholder="z. B. Gespräch mit Interessent Lorenz">
   </div>`,{wide:true,ok:"Starten",onOk:ov=>{
     const c=caseBy(v(ov,"case")),aid=v(ov,"action"),sid=v(ov,"svc");
     DB.ui.lastCase=c.id;
     if(ov.dataset.m==="doc"){const s=new Date(v(ov,"date")+"T"+v(ov,"from")).getTime();let e=new Date(v(ov,"date")+"T"+v(ov,"to")).getTime();if(!(s>0&&e>0))throw new Error("Bitte Datum und Uhrzeiten angeben.");if(e<s)e+=DAY;
       DB.entries.push({id:uid(),caseId:c.id,actionId:aid,serviceId:sid,userId:v(ov,"user"),start:s,end:e,pause:(+v(ov,"pause")||0)*60000,pauseAt:null,note:v(ov,"note"),createdBy:DB.ui.user,history:[]});toast("Nachgetragen")}
     else{startAction(c.id,aid,sid,v(ov,"note"));return false}
   }});
  const setMode=m=>{ov.dataset.m=m;ov.querySelectorAll("#qm button").forEach(b=>b.classList.toggle("on",b.dataset.m===m));ov.querySelectorAll(".qd").forEach(el=>el.style.display=m==="doc"?"":"none");ov.querySelector("[data-x=ok]").textContent=m==="doc"?"Speichern":"Starten"};
  ov.querySelectorAll("#qm button").forEach(b=>b.onclick=()=>setMode(b.dataset.m));setMode(pre.mode||"start");
  const fillA=()=>{const c=caseBy(v(ov,"case"));if(!c)return;const acts=DB.settings.actions[c.type].filter(a=>a.active);
    ov.querySelector("[name=action]").innerHTML=[0,1,2,3].map(st=>`<optgroup label="${STAGES[st]}">${acts.filter(a=>a.stage===st).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("")}</optgroup>`).join("");
    const pa=pre.actionId&&acts.find(a=>a.id===pre.actionId)||acts.find(a=>a.stage===Math.min(c.stage,3));if(pa)ov.querySelector("[name=action]").value=pa.id;fillS()};
  const fillS=()=>{const c=caseBy(v(ov,"case"));const a=actBy(c.type,v(ov,"action"));ov.querySelector("[name=svc]").innerHTML=a.services.map(s=>`<option value="${s}" ${s===a.def?"selected":""}>${esc(svcBy(s).name)}${s===a.def?" (Standard)":""}</option>`).join("")};
  ov.querySelector("[name=case]").onchange=()=>{pre.actionId=null;fillA()};ov.querySelector("[name=action]").onchange=fillS;fillA();
}
function startFromObject(oid){
  const cs=DB.cases.filter(c=>c.objectId===oid&&c.stage<4);
  if(!cs.length){toast("Kein offener Fall – bitte erst einen Auftrag anlegen.");return}
  quick({caseId:cs[0].id});if(cs.length>1)toast("Objekt hat mehrere offene Fälle – bitte Fall wählen.");
}

function editEntry(id,title){
  const e=DB.entries.find(x=>x.id===id),c=caseBy(e.caseId);
  const canEdit=true;
  const ov=modal(title||"Zeitbuchung bearbeiten",`<div class="hint" style="margin-bottom:10px">${c.no} · ${esc(c.title)} · angelegt von ${esc(userBy(e.createdBy).name)}</div><div class="form">
    <label>Aktion</label><select name="action">${DB.settings.actions[c.type].filter(a=>a.active||a.id===e.actionId).map(a=>`<option value="${a.id}" ${a.id===e.actionId?"selected":""}>${esc(a.name)}</option>`).join("")}</select>
    <label>Leistung</label><select name="svc"></select>
    <label>Mitarbeiter</label><select name="user">${DB.settings.users.map(u=>`<option value="${u.id}" ${u.id===e.userId?"selected":""}>${esc(u.name)}</option>`).join("")}</select>
    <label>Datum</label><input type="date" name="date" value="${isoD(e.start)}">
    <label>Von / Bis</label><div style="display:flex;gap:8px"><input type="time" name="from" value="${isoT(e.start)}"><input type="time" name="to" value="${e.end?isoT(e.end):""}"></div>
    <label>Pause (Min.)</label><input type="number" name="pause" min="0" value="${Math.round(e.pause/60000)}">
    <label>Notiz / Ergebnis</label><textarea name="note">${esc(e.note)}</textarea></div>
    ${e.history.length?`<div class="hist"><b>Änderungsprotokoll</b><br>${e.history.map(h=>`${dt(h.at)} ${tm(h.at)} · ${esc(userBy(h.by).name)}: ${esc(h.text)}`).join("<br>")}</div>`:""}`,
  {del:"Löschen",onDel:()=>{DB.entries=DB.entries.filter(x=>x.id!==id)},onOk:ov=>{
    const same=(t,d,hhmm)=>t&&isoD(t)===d&&isoT(t)===hhmm;
    let s=same(e.start,v(ov,"date"),v(ov,"from"))?e.start:new Date(v(ov,"date")+"T"+v(ov,"from")).getTime();
    let en=!v(ov,"to")?null:(e.end&&isoT(e.end)===v(ov,"to")&&same(e.start,v(ov,"date"),v(ov,"from"))?e.end:new Date(v(ov,"date")+"T"+v(ov,"to")).getTime());
    if(!(s>0))throw new Error("Bitte Datum und Uhrzeit prüfen.");if(en&&en<s)en+=DAY;
    const ch=[];const old={a:e.actionId,s:e.serviceId,u:e.userId,st:e.start,en:e.end,p:e.pause};
    e.actionId=v(ov,"action");e.serviceId=v(ov,"svc");e.userId=v(ov,"user");e.start=s;e.end=en;e.pause=(+v(ov,"pause")||0)*60000;e.note=v(ov,"note");
    if(old.a!==e.actionId)ch.push(`Aktion ${actBy(c.type,old.a).name} → ${actBy(c.type,e.actionId).name}`);
    if(old.s!==e.serviceId)ch.push(`Leistung ${svcBy(old.s).name} → ${svcBy(e.serviceId).name}`);
    if(old.u!==e.userId)ch.push(`Mitarbeiter ${userBy(old.u).short} → ${userBy(e.userId).short}`);
    if(old.st!==e.start||old.en!==e.end)ch.push(`Zeit ${tm(old.st)}–${old.en?tm(old.en):"…"} → ${tm(e.start)}–${e.end?tm(e.end):"…"}`);
    if(old.p!==e.pause)ch.push(`Pause ${Math.round(old.p/60000)} → ${Math.round(e.pause/60000)} Min.`);
    if(ch.length&&title!=="Aktion abschließen")e.history.push({at:Date.now(),by:DB.ui.user,text:ch.join("; ")});
    toast("Gespeichert")}});
  const fillS=()=>{const a=actBy(c.type,v(ov,"action"));const list=a.services.includes(e.serviceId)?a.services:[...a.services,e.serviceId];
    ov.querySelector("[name=svc]").innerHTML=list.map(s=>`<option value="${s}" ${s===e.serviceId?"selected":""}>${esc(svcBy(s).name)}</option>`).join("")};
  ov.querySelector("[name=action]").onchange=()=>{const a=actBy(c.type,v(ov,"action"));fillS();ov.querySelector("[name=svc]").value=a.def};fillS();
}

/* ================= Termine & Wiedervorlagen ================= */
function editTask(id,pre={}){
  const t=id?DB.tasks.find(x=>x.id===id):{kind:pre.kind||"termin",title:"",caseId:pre.caseId||DB.ui.lastCase||DB.cases[0].id,due:pre.due||(dayStart(Date.now())+DAY+10*3600000),dur:60,userId:DB.ui.user,actionId:null,done:false,note:""};
  const open=DB.cases.filter(c=>c.stage<4||c.id===t.caseId);
  const ov=modal(id?(t.kind==="termin"?"Termin":"Wiedervorlage"):"Neu: Termin / Wiedervorlage",`<div class="seg" style="margin-bottom:12px" id="tk"><button data-k="termin" class="${t.kind==="termin"?"on":""}">Termin</button><button data-k="wv" class="${t.kind==="wv"?"on":""}">Wiedervorlage</button></div>
   <div class="form"><label>Fall</label><select name="case">${open.map(c=>`<option value="${c.id}" ${c.id===t.caseId?"selected":""}>${c.no} · ${esc(c.title)}</option>`).join("")}</select>
   <label>Betreff</label><input name="title" value="${esc(t.title)}" placeholder="z. B. Besichtigung Fam. Lorenz">
   <label class="tk-t">Geplante Aktion</label><select class="tk-t" name="action"></select>
   <label>Datum / Uhrzeit</label><div style="display:flex;gap:8px"><input type="date" name="date" value="${isoD(t.due)}"><input type="time" name="time" value="${isoT(t.due)}"></div>
   <label class="tk-t">Dauer (Min.)</label><input class="tk-t" type="number" name="dur" min="0" step="15" value="${t.dur}">
   <label>Zuständig</label><select name="user">${DB.settings.users.map(u=>`<option value="${u.id}" ${u.id===t.userId?"selected":""}>${esc(u.name)}</option>`).join("")}</select>
   <label>Notiz</label><input name="note" value="${esc(t.note)}"><label>Erledigt</label><div><input type="checkbox" class="sw" name="done" ${t.done?"checked":""}></div></div>
   <div class="hint" style="margin-top:8px">Outlook-Anbindung ist für eine spätere Ausbaustufe vorgesehen.</div>`,
  {wide:true,del:id?"Löschen":null,onDel:()=>{DB.tasks=DB.tasks.filter(x=>x.id!==id)},
   extra:id&&t.kind==="termin"&&!t.done&&t.actionId?`<button class="btn ok" data-x="go">${ic("play")}Jetzt starten</button>`:"",
   onOk:ov=>{if(!v(ov,"title").trim())throw new Error("Bitte einen Betreff eingeben.");
     const n={...t,id:t.id||uid(),kind:ov.dataset.k,caseId:v(ov,"case"),title:v(ov,"title").trim(),actionId:ov.dataset.k==="termin"?(v(ov,"action")||null):null,
       due:new Date(v(ov,"date")+"T"+(v(ov,"time")||"09:00")).getTime(),dur:+v(ov,"dur")||0,userId:v(ov,"user"),note:v(ov,"note"),done:v(ov,"done")};
     if(id)Object.assign(t,n);else DB.tasks.push(n);toast("Gespeichert")}});
  const setK=k=>{ov.dataset.k=k;ov.querySelectorAll("#tk button").forEach(b=>b.classList.toggle("on",b.dataset.k===k));ov.querySelectorAll(".tk-t").forEach(el=>el.style.display=k==="termin"?"":"none")};
  ov.querySelectorAll("#tk button").forEach(b=>b.onclick=()=>setK(b.dataset.k));setK(t.kind);
  const fillA=()=>{const c=caseBy(v(ov,"case"));ov.querySelector("[name=action]").innerHTML=`<option value="">– keine –</option>`+DB.settings.actions[c.type].filter(a=>a.active).map(a=>`<option value="${a.id}" ${a.id===t.actionId?"selected":""}>${esc(a.name)}</option>`).join("")};
  ov.querySelector("[name=case]").onchange=fillA;fillA();
  const g=ov.querySelector("[data-x=go]");if(g)g.onclick=()=>{ov.close();runTask(id)};
}
function runTask(id){const t=DB.tasks.find(x=>x.id===id);t.done=true;if(t.actionId)startAction(t.caseId,t.actionId,null,t.title);else{save();render()}}
function toggleTask(id){const t=DB.tasks.find(x=>x.id===id);t.done=!t.done;save();render()}
function taskRow(t,showCase=true){const c=caseBy(t.caseId),over=!t.done&&t.due<Date.now()-(t.kind==="wv"?DAY:0);
  return `<div class="task ${t.done?"done":""} ${over?"over":""}"><input type="checkbox" ${t.done?"checked":""} onchange="toggleTask('${t.id}')" aria-label="Erledigt">
   <div class="tt" style="cursor:pointer" onclick="editTask('${t.id}')"><span class="tag ${t.kind==="termin"?"sale":"warn"}">${t.kind==="termin"?"Termin":"Wiedervorlage"}</span> <b>${esc(t.title)}</b>
   <div class="hint"><span class="due">${dshort(t.due)}${t.kind==="termin"?" "+tm(t.due):""}${over?" · überfällig":""}</span>${showCase?` · <a href="#" onclick="TAB='akt';go('fall','${c.id}');return false">${c.no} ${esc(c.title)}</a>`:""}</div></div>
   <div style="display:flex;gap:6px;align-items:center">${av(t.userId)}${t.kind==="termin"&&!t.done&&t.actionId?`<button class="btn sm ok" onclick="runTask('${t.id}')">${ic("play")}Starten</button>`:""}</div></div>`}

/* ================= Start ================= */
function vStart(){
  const me=DB.ui.user,open=DB.cases.filter(c=>c.stage<4),wk=weekStart(Date.now());
  const myWeek=sumNet(DB.entries.filter(e=>e.userId===me&&e.start>=wk));
  const myTasks=DB.tasks.filter(t=>t.userId===me&&!t.done&&t.due<dayStart(Date.now())+2*DAY).sort((a,b)=>a.due-b.due);
  const toBill=DB.cases.filter(c=>c.stage===4&&!c.billed);
  return `<div class="top"><h1>Hallo ${esc(ME().name.split(" ")[0])}</h1><span class="muted">${new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</span><div class="sp"></div>
  <button class="btn" onclick="newObject()">${ic("plus")}Neues Objekt</button><button class="btn pri" onclick="newCase()">${ic("plus")}Neuer Auftrag</button></div>
  <div class="kpis"><div class="kpi"><div class="l">Offene Fälle</div><div class="v">${open.length}</div><div class="s">${open.filter(c=>c.type==="sale").length} Verkauf · ${open.filter(c=>c.type==="rent").length} Vermietung</div></div>
  <div class="kpi"><div class="l">Meine Zeit diese Woche</div><div class="v">${hm(myWeek)} h</div><div class="s">${DB.entries.filter(e=>e.userId===me&&e.start>=wk).length} Buchungen</div></div>
  <div class="kpi"><div class="l">Meine offenen Wiedervorlagen</div><div class="v">${DB.tasks.filter(t=>t.userId===me&&!t.done&&t.kind==="wv").length}</div><div class="s">${DB.tasks.filter(t=>t.userId===me&&!t.done&&t.due<Date.now()&&t.kind==="wv").length} überfällig</div></div>
  <div class="kpi"><div class="l">Zur Abrechnung</div><div class="v">${toBill.length}</div><div class="s">Fälle in Phase 5</div></div></div>
  ${running().length?`<div class="card"><h2>${ic("play",'style="width:15px;color:var(--ok)"')}Gerade aktiv im Büro<span class="sp"></span><button class="btn sm" onclick="go('laufend')">Alle anzeigen</button></h2><div class="rgrid">${running().slice(0,6).map(runCard).join("")}</div></div>`:""}
  <div class="two"><div class="card"><h2>${ic("bell",'style="width:17px"')}Meine Termine & Wiedervorlagen<span class="sp"></span><span class="hint">heute, morgen, überfällig</span></h2>${myTasks.map(t=>taskRow(t)).join("")||'<div class="empty">Nichts fällig.</div>'}
   <div style="margin-top:10px;display:flex;gap:8px"><button class="btn sm" onclick="editTask(null,{kind:'termin'})">${ic("plus")}Termin</button><button class="btn sm" onclick="editTask(null,{kind:'wv'})">${ic("plus")}Wiedervorlage</button><div class="sp"></div><button class="btn sm" onclick="go('kalender')">Wochenansicht</button></div></div>
  <div class="card"><h2>Zuletzt erfasst</h2><div class="timeline">${DB.entries.slice().sort((a,b)=>b.start-a.start).slice(0,7).map(e=>{const c=caseBy(e.caseId);return `<div class="it"><div class="d">${dt(e.start)}<br>${tm(e.start)}</div><div><b>${esc(actBy(c.type,e.actionId).name)}</b><div class="hint">${esc(svcBy(e.serviceId).name)} · <a href="#" onclick="TAB='akt';go('fall','${c.id}');return false">${c.no}</a></div></div><div style="text-align:right">${av(e.userId)}<br><b>${e.end?hm(net(e)):'<span class="tag ok">läuft</span>'}</b></div></div>`}).join("")}</div></div></div>`;
}

/* ================= Objekte ================= */
function newObject(){
  modal("Neues Objekt",`<div class="form"><label>Bezeichnung</label><input name="title" placeholder="EFH Musterweg 1, Landshut"><label>Objektart</label><select name="kind">${DB.settings.fields.object.find(f=>f.label==="Objektart").options.split(";").map(o=>`<option>${o}</option>`).join("")}</select><label>Adresse</label><input name="addr"></div>`,
  {ok:"Anlegen",onOk:ov=>{if(!v(ov,"title").trim())throw new Error("Bitte eine Bezeichnung eingeben.");const o={id:uid(),no:"O-"+String(DB.objects.length+12).padStart(4,"0"),title:v(ov,"title").trim(),data:{},files:{},created:Date.now()};
    const fk=DB.settings.fields.object.find(f=>f.label==="Objektart"),fa=DB.settings.fields.object.find(f=>f.label==="Adresse");if(fk)o.data[fk.id]=v(ov,"kind");if(fa)o.data[fa.id]=v(ov,"addr");
    DB.objects.unshift(o);save();ARG=o.id;VIEW="objekt";OTAB="daten"}});
}
function vObjekte(){
  return `<div class="top"><h1>Objekte</h1><span class="hint">Ein Objekt kann mehrere Fälle haben, z. B. erst Vermietung, später Verkauf</span><div class="sp"></div><button class="btn pri" onclick="newObject()">${ic("plus")}Neues Objekt</button></div>
  <div class="card"><table><tr><th>Nr.</th><th>Objekt</th><th>Art</th><th class="r">Fläche</th><th>Fälle</th><th>Daten</th><th></th></tr>${DB.objects.map(o=>{const cs=DB.cases.filter(c=>c.objectId===o.id);const pc=Math.round(completeness(o,"object")*100);
   return `<tr class="click" onclick="OTAB='daten';go('objekt','${o.id}')"><td>${o.no}</td><td><b>${esc(o.title)}</b><div class="hint">${esc(objVal(o,"Adresse"))}</div></td><td class="muted">${esc(objVal(o,"Objektart"))}</td><td class="r">${objVal(o,"Wohnfläche (m²)")?esc(objVal(o,"Wohnfläche (m²)"))+" m²":""}</td>
   <td><div class="chips">${cs.map(c=>`<span class="tag ${c.type}${c.stage===4?" grey":""}">${c.no}</span>`).join("")}</div></td><td style="width:110px"><div class="progress"><i style="width:${pc}%"></i></div><span class="hint">${pc} % Pflicht</span></td>
   <td class="r" onclick="event.stopPropagation()"><button class="btn sm" onclick="startFromObject('${o.id}')">${ic("play")}Aktion</button></td></tr>`}).join("")}</table></div>`;
}
function vObjekt(){
  const o=objBy(ARG);if(!o)return vObjekte();
  const cs=DB.cases.filter(c=>c.objectId===o.id).sort((a,b)=>b.created-a.created);
  let h=`<div class="top"><button class="ib" onclick="go('objekte')" aria-label="Zurück">${ic("back")}</button><h1>${esc(o.title)}</h1><span class="muted">${o.no}</span><div class="sp"></div>
   <button class="btn" onclick="startFromObject('${o.id}')">${ic("play")}Aktion starten</button><button class="btn" onclick="newCase('rent','${o.id}')">${ic("plus")}Vermietung</button><button class="btn pri" onclick="newCase('sale','${o.id}')">${ic("plus")}Verkauf</button></div>
   <div class="tabs">${[["daten","Objektdaten"],["faelle",`Fälle (${cs.length})`]].map(([k,l])=>`<button class="${OTAB===k?"on":""}" onclick="OTAB='${k}';render()">${l}</button>`).join("")}</div>`;
  if(OTAB==="daten")h+=dataForm(o,"object");
  else h+=`<div class="card">${cs.length?`<table><tr><th>Nr.</th><th>Art</th><th>Fall</th><th>Phase</th><th>Abrechnung</th><th class="r">Zeit</th></tr>${cs.map(c=>`<tr class="click" onclick="TAB='akt';go('fall','${c.id}')"><td>${c.no}</td><td><span class="tag ${c.type}">${TYPES[c.type]}</span></td><td><b>${esc(c.title)}</b><div class="hint">${esc(c.client)}</div></td><td>${STAGES[c.stage]}</td><td class="muted">${BILL[c.billing].split(" (")[0]}</td><td class="r">${hm(sumNet(caseEntries(c.id)))}</td></tr>`).join("")}</table>`:'<div class="empty">Noch keine Fälle zu diesem Objekt.</div>'}</div>`;
  return h;
}

/* ================= Datenformular (Objekt / Fall) ================= */
function dataForm(rec,scope){
  const fs=DB.settings.fields[scope].filter(f=>f.active),pc=Math.round(completeness(rec,scope)*100);
  let h=`<div class="card"><h2>${scope==="object"?"Objektdaten":"Falldaten "+TYPES[scope]}<span class="sp"></span><span class="hint" data-pc>Pflichtfelder ${pc} %</span><div style="width:140px" class="progress"><i data-pcb style="width:${pc}%"></i></div></h2>
   ${MOBILE?"":`<div class="hint" style="margin:-4px 0 10px;display:flex;gap:8px;align-items:center">${ic("folder",'style="width:15px"')}Ablage: <span class="path">${esc(folder(rec,scope))}</span><button class="btn sm" data-rel="${esc(folderRel(rec,scope))}" onclick="openRel(this.dataset.rel)">Ordner öffnen</button></div>`}<div class="form">`;
  fs.forEach(f=>{const val=rec.data[f.id]??"";
    if(f.type==="section"){h+=`<div class="sec">${esc(f.label)}</div>`;return}
    h+=`<label class="${f.required?"req":""}">${esc(f.label)}</label>`;
    const at=`data-scope="${scope}" data-rec="${rec.id}" data-f="${f.id}"`;
    if(f.type==="select")h+=`<select ${at}><option value=""></option>${f.options.split(";").map(o=>`<option ${o===val?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
    else if(f.type==="bool")h+=`<div><input type="checkbox" class="sw" ${at} ${val==="true"?"checked":""}></div>`;
    else if(f.type==="textarea")h+=`<textarea ${at}>${esc(val)}</textarea>`;
    else if(f.type==="file"){const fl=rec.files[f.id]||[];h+=`<div class="att">${fl.map((n,i)=>fileChip(n,`<button class="ib" style="width:20px;height:20px" aria-label="Entfernen" onclick="event.stopPropagation();rmFile('${scope}','${rec.id}','${f.id}',${i})">${ic("x",'style="width:12px"')}</button>`)).join("")}<label class="btn sm">${ic("plus")}Datei<input type="file" multiple hidden onchange="addFiles('${scope}','${rec.id}','${f.id}',this)"></label></div>`}
    else h+=`<input ${at} type="${f.type==="date"?"date":"text"}" inputmode="${f.type==="number"||f.type==="money"?"decimal":"text"}" value="${esc(val)}" ${f.type==="money"?'placeholder="€"':""}>`;
  });
  h+=`</div><div class="hint" style="margin-top:14px">Felder, Reihenfolge, Pflicht und aktiv/inaktiv pflegt der Admin unter Einstellungen → Erfassungsfelder → ${FSCOPE[scope]}. Eingaben werden sofort gespeichert.</div></div>`;
  return h;
}
const recBy=(scope,id)=>scope==="object"?objBy(id):caseBy(id);
async function addFiles(scope,rid,fid,inp){const r=recBy(scope,rid),f=DB.settings.fields[scope].find(x=>x.id===fid);const paths=[...inp.files].map(x=>api.pathOf(x)).filter(Boolean);if(!paths.length)return;
  try{const refs=await api.importFiles({paths,rel:folderRel(r,scope,f)});r.files[fid]=[...(r.files[fid]||[]),...refs];save();render();toast(refs.length>1?`${refs.length} Dateien abgelegt`:"Datei abgelegt")}catch(e){toast("Ablage fehlgeschlagen: "+e.message)}}
function rmFile(scope,rid,fid,i){const r=recBy(scope,rid),x=r.files[fid][i];if(!confirm(`„${fName(x)}“ entfernen?${typeof x==="object"?"\nDie Datei wird auch aus dem Datenordner gelöscht.":""}`))return;
  r.files[fid].splice(i,1);if(typeof x==="object")delFile(x.p).catch(()=>{});save();render()}
document.addEventListener("change",e=>{const d=e.target.dataset;if(!d.f||!d.scope)return;const r=recBy(d.scope,d.rec);r.data[d.f]=e.target.type==="checkbox"?String(e.target.checked):e.target.value;save();
  const pc=Math.round(completeness(r,d.scope)*100);const a=$("[data-pc]"),b=$("[data-pcb]");if(a){a.textContent=`Pflichtfelder ${pc} %`;b.style.width=pc+"%"}});

/* ================= Fälle ================= */
function newCase(type,objectId){
  const ov=modal("Neuer Auftrag",`<div class="seg" style="margin-bottom:12px" id="nt">${["sale","rent"].map(t=>`<button data-t="${t}" class="${(type||"sale")===t?"on":""}">${TYPES[t]}</button>`).join("")}</div>
   <div class="form"><label>Objekt</label><select name="obj"><option value="_new">+ Neues Objekt anlegen</option>${DB.objects.map(o=>`<option value="${o.id}" ${o.id===objectId?"selected":""}>${o.no} · ${esc(o.title)}</option>`).join("")}</select>
   <label class="no">Objektbezeichnung</label><input class="no" name="otitle" placeholder="EFH Musterweg 1, Landshut">
   <label>Fallbezeichnung</label><input name="title" placeholder="z. B. Verkauf EFH Musterweg">
   <label>Auftraggeber</label><input name="client" placeholder="Eigentümer / Vermieter">
   <label>Abrechnungsart</label><select name="billing">${Object.entries(BILL).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select>
   <label>Zuständig</label><select name="owner">${DB.settings.users.map(u=>`<option value="${u.id}" ${u.id===DB.ui.user?"selected":""}>${esc(u.name)}</option>`).join("")}</select></div>`,
  {wide:true,ok:"Anlegen",onOk:ov=>{const t=ov.dataset.t;let oid=v(ov,"obj");
    if(oid==="_new"){if(!v(ov,"otitle").trim())throw new Error("Bitte das neue Objekt bezeichnen.");const o={id:uid(),no:"O-"+String(DB.objects.length+12).padStart(4,"0"),title:v(ov,"otitle").trim(),data:{},files:{},created:Date.now()};DB.objects.unshift(o);oid=o.id}
    const o=objBy(oid);const n=DB.cases.length+41;
    const c={id:uid(),no:(t==="sale"?"V-":"M-")+new Date().getFullYear()+"-"+String(n).padStart(3,"0"),type:t,objectId:oid,title:v(ov,"title").trim()||`${TYPES[t]} ${o.title.split(",")[0]}`,client:v(ov,"client"),
      stage:0,billing:v(ov,"billing"),flat:0,extra:[],created:Date.now(),stageDates:{0:Date.now()},closed:null,billed:false,data:{},files:{},owner:v(ov,"owner")};
    setStageRaw(c,1);DB.cases.unshift(c);save();ARG=c.id;VIEW="fall";TAB="daten"}});
  const setT=t=>{ov.dataset.t=t;ov.querySelectorAll("#nt button").forEach(b=>b.classList.toggle("on",b.dataset.t===t))};ov.querySelectorAll("#nt button").forEach(b=>b.onclick=()=>setT(b.dataset.t));setT(type||"sale");
  const sel=ov.querySelector("[name=obj]"),tog=()=>ov.querySelectorAll(".no").forEach(el=>el.style.display=sel.value==="_new"?"":"none");sel.onchange=tog;if(!objectId&&DB.objects.length)sel.value="_new";tog();
}
function vFaelle(){
  const list=DB.cases.filter(c=>FILTER==="all"||c.type===FILTER);
  let h=`<div class="top"><h1>Fälle</h1><div class="seg">${[["all","Alle"],["sale","Verkauf"],["rent","Vermietung"]].map(([k,l])=>`<button class="${FILTER===k?"on":""}" onclick="FILTER='${k}';render()">${l}</button>`).join("")}</div>
  <div class="seg">${[["board","Phasen"],["list","Liste"]].map(([k,l])=>`<button class="${MODE===k?"on":""}" onclick="MODE='${k}';render()">${l}</button>`).join("")}</div><div class="sp"></div><button class="btn pri" onclick="newCase()">${ic("plus")}Neuer Auftrag</button></div>`;
  if(MODE==="board")h+=`<div class="board">${STAGES.map((s,i)=>{const cs=list.filter(c=>c.stage===i);return `<div class="col"><h3>${s}<span>${cs.length}</span></h3>${cs.map(c=>{const E=caseEntries(c.id),r=E.some(e=>!e.end),wv=DB.tasks.filter(t=>t.caseId===c.id&&!t.done).length;
      return `<div class="cc" style="--c:var(--${c.type})" onclick="TAB='akt';go('fall','${c.id}')"><div class="t">${esc(c.title)}</div><div class="hint">${esc(objBy(c.objectId).no)} · ${esc(c.client)}</div><div class="m"><span>${av(c.owner)} ${c.no}</span><span>${r?'<span class="tag ok">läuft</span> ':""}${wv?`<span class="tag warn">${wv}</span> `:""}${hm(sumNet(E))} h</span></div>${i===1?`<div class="progress" style="margin-top:6px"><i style="width:${Math.round(completeness(c,c.type)*100)}%"></i></div>`:""}</div>`}).join("")||'<div class="hint" style="padding:6px">–</div>'}</div>`}).join("")}</div>`;
  else h+=`<div class="card"><table><tr><th>Nr.</th><th>Art</th><th>Fall</th><th>Objekt</th><th>Phase</th><th>Zuständig</th><th>Abrechnung</th><th class="r">Zeit</th></tr>${list.map(c=>`<tr class="click" onclick="TAB='akt';go('fall','${c.id}')"><td>${c.no}</td><td><span class="tag ${c.type}">${TYPES[c.type]}</span></td><td><b>${esc(c.title)}</b></td><td class="muted">${objBy(c.objectId).no}</td><td>${STAGES[c.stage]}</td><td>${av(c.owner)}</td><td class="muted">${BILL[c.billing].split(" (")[0]}</td><td class="r">${hm(sumNet(caseEntries(c.id)))}</td></tr>`).join("")}</table></div>`;
  return h;
}

/* ================= Fall ================= */
function setStageRaw(c,i){c.stage=i;c.stageDates=c.stageDates||{};c.stageDates[i]=Date.now();for(let k=i+1;k<5;k++)delete c.stageDates[k];c.closed=i>=3?(c.closed||Date.now()):null}
function setStage(id,i){const c=caseBy(id);
  if(c.type==="rent"&&i===4&&!DB.protocols.some(p=>p.caseId===id&&p.status==="signed")&&!confirm("Für diese Vermietung ist noch kein unterschriebenes Übergabeprotokoll hochgeladen.\nTrotzdem zur Abrechnung?"))return;
  setStageRaw(c,i);save();render();toast("Phase: "+STAGES[i])}
function vFall(){
  const c=caseBy(ARG);if(!c)return vFaelle();
  if(MOBILE&&TAB==="abr")TAB="akt";
  DB.ui.lastCase=c.id;const o=objBy(c.objectId);
  const E=caseEntries(c.id),tot=sumNet(E),tasks=DB.tasks.filter(t=>t.caseId===c.id).sort((a,b)=>a.done-b.done||a.due-b.due);
  let h=`<div class="top"><button class="ib" onclick="go('faelle')" aria-label="Zurück">${ic("back")}</button><span class="tag ${c.type}">${TYPES[c.type]}</span><h1>${esc(c.title)}</h1>
   <span class="muted">${c.no} · <a href="#" onclick="OTAB='daten';go('objekt','${o.id}');return false">${o.no} ${esc(o.title)}</a> · ${esc(c.client)}</span>${av(c.owner)}<div class="sp"></div>
   <button class="btn" onclick="quick({caseId:'${c.id}',mode:'doc'})">${ic("doc")}Nachtragen</button><button class="btn" onclick="editTask(null,{caseId:'${c.id}'})">${ic("cal")}Termin / WV</button></div>
   <div class="steps">${STAGES.map((s,i)=>`<button class="step ${i<c.stage?"done":i===c.stage?"cur":""}" onclick="setStage('${c.id}',${i})"><b>${i+1}${c.stageDates&&c.stageDates[i]?" · "+dt(c.stageDates[i]):""}</b>${s}</button>`).join("")}</div>
   <div class="tabs">${[["akt","Aktivitäten"],["termine",`Termine & Wiedervorlagen (${tasks.filter(t=>!t.done).length})`],["daten","Falldaten"],["obj","Objektdaten"],...(c.type==="rent"?[["proto",`Übergabeprotokoll${(()=>{const ps=DB.protocols.filter(p=>p.caseId===c.id);return ps.length?" "+(ps.some(p=>p.status==="signed")?"✓":"("+ps.length+")"):""})()}`]]:[]),...(MOBILE?[]:[["abr","Abschluss & Abrechnung"]])].map(([k,l])=>`<button class="${TAB===k?"on":""}" onclick="TAB='${k}';render()">${l}</button>`).join("")}</div>`;
  if(TAB==="akt"){
    const counts={};E.forEach(e=>counts[e.actionId]=(counts[e.actionId]||0)+1);
    const acts=DB.settings.actions[c.type].filter(a=>a.active);
    h+=`<div class="two"><div class="card"><h2>Aktion starten<span class="sp"></span><span class="hint">Klick = Zeit läuft mit Standardleistung</span></h2>
     ${[0,1,2,3].map(st=>{const as=acts.filter(a=>a.stage===st);if(!as.length)return"";return `<div class="hint" style="margin:10px 0 6px;font-weight:650">${STAGES[st]}</div><div class="acts">${as.map(a=>`<button class="act" onclick="startAction('${c.id}','${a.id}')"><span class="n">${ic("play",'style="width:12px;height:12px;color:var(--acc)"')}${esc(a.name)}${counts[a.id]?`<span class="cnt">${counts[a.id]}×</span>`:""}</span><span class="s">Standard: ${esc(svcBy(a.def).name)}${a.services.length>1?` · +${a.services.length-1} weitere`:""}</span></button>`).join("")}</div>`}).join("")}
     </div><div>${E.filter(e=>!e.end).length?`<div class="card runcard"><h2>${ic("play",'style="width:14px;color:var(--ok)"')}Läuft gerade<span class="sp"></span></h2>${E.filter(e=>!e.end).map(e=>`<div class="rrow ${FLASH===e.id?"flash":""}" data-eid="${e.id}">${av(e.userId)}<div class="tt" style="flex:1;min-width:0"><b>${esc(actBy(c.type,e.actionId).name)}</b><div class="hint">${esc(svcBy(e.serviceId).name)} · seit ${tm(e.start)} · ${esc(userBy(e.userId).name)}${e.pauseAt?' · <span class="tag warn">Pause</span>':""}</div></div><span class="clk" data-e="${e.id}">${hm(net(e))}</span>${runCtl(e,{open:false})}</div>`).join("")}</div>`:""}
     <div class="card"><h2>Verlauf<span class="sp"></span><span class="tag grey">${hm(tot)} h</span></h2><div class="timeline">${E.map(e=>`<div class="it"><div class="d">${dt(e.start)}<br>${tm(e.start)}${e.end?"–"+tm(e.end):""}</div><div><b>${esc(actBy(c.type,e.actionId).name)}</b><div class="hint">${esc(svcBy(e.serviceId).name)}${e.history.length?" · geändert":""}</div>${e.note?`<div class="hint">${esc(e.note)}</div>`:""}</div><div style="text-align:right">${av(e.userId)} ${e.end?`<b>${hm(net(e))}</b>`:`<span class="tag ${e.pauseAt?"warn":"ok"}">${e.pauseAt?"Pause":"läuft"}</span>`}<br><button class="ib" aria-label="Bearbeiten" onclick="editEntry('${e.id}')">${ic("edit")}</button></div></div>`).join("")||'<div class="empty">Noch keine Aktionen. Links eine Aktion starten.</div>'}</div></div></div></div>`;
  }else if(TAB==="termine"){
    h+=`<div class="card"><h2>Termine & Wiedervorlagen<span class="sp"></span><button class="btn sm" onclick="editTask(null,{caseId:'${c.id}',kind:'termin'})">${ic("plus")}Termin</button><button class="btn sm" onclick="editTask(null,{caseId:'${c.id}',kind:'wv'})">${ic("plus")}Wiedervorlage</button></h2>${tasks.map(t=>taskRow(t,false)).join("")||'<div class="empty">Keine Termine oder Wiedervorlagen.</div>'}
     <div class="hint" style="margin-top:10px">Ein Termin mit geplanter Aktion lässt sich mit „Starten“ direkt in eine Zeitbuchung umwandeln.</div></div>`;
  }else if(TAB==="daten"){
    h+=dataForm(c,c.type);
    if(c.stage===1)h+=`<div style="display:flex;justify-content:flex-end"><button class="btn pri" onclick="setStage('${c.id}',2)">Datenaufnahme abschließen → Durchführung</button></div>`;
  }else if(TAB==="obj"){
    const fs=DB.settings.fields.object.filter(f=>f.active&&f.type!=="section"&&f.type!=="file"&&o.data[f.id]);
    h+=`<div class="card"><h2>Objekt ${o.no} · ${esc(o.title)}<span class="sp"></span><button class="btn sm" onclick="OTAB='daten';go('objekt','${o.id}')">${ic("edit")}Objektdaten bearbeiten</button></h2><div class="ro">${fs.map(f=>`<span>${esc(f.label)}</span><span>${f.type==="bool"?(o.data[f.id]==="true"?"Ja":"Nein"):esc(o.data[f.id])}</span>`).join("")||'<span>Noch keine Objektdaten.</span><span></span>'}</div>
    <div class="hint" style="margin-top:12px">Objektdaten gelten für alle Fälle dieses Objekts und werden nur einmal erfasst.</div></div>`;
  }else if(TAB==="proto"&&c.type==="rent")h+=protoView(c);
  else h+=billing(c);
  return h;
}

/* ================= Abrechnung / Leistungsnachweis ================= */
function caseBilling(c){
  const E=caseEntries(c.id).filter(e=>e.end),rows={};
  E.forEach(e=>{rows[e.serviceId]=(rows[e.serviceId]||0)+net(e)});
  const lines=Object.entries(rows).map(([s,ms])=>{const sv=svcBy(s);const billed=c.billing==="hours"?sv.billable:c.billing==="mixed"?c.extra.includes(s):false;
    return {id:s,name:sv.name,h:ms/3600000,rate:sv.rate,billable:sv.billable,billed,amount:billed?ms/3600000*sv.rate:0}}).sort((a,b)=>b.h-a.h);
  const byAct={};E.forEach(e=>{const a=actBy(c.type,e.actionId).name;byAct[a]=byAct[a]||{n:0,ms:0};byAct[a].n++;byAct[a].ms+=net(e)});
  let courtage=0,cText="";
  if(c.type==="sale"){const p=num(fieldVal(c,"Erzielter Kaufpreis"))||num(fieldVal(c,"Angebotspreis"));const pk=num(fieldVal(c,"Provision Käufer (%)")),pv=num(fieldVal(c,"Provision Verkäufer (%)"));courtage=p*(pk+pv)/100;cText=`${eur(p)} × (${pk.toLocaleString("de-DE")} % + ${pv.toLocaleString("de-DE")} %)`}
  else{const m=num(fieldVal(c,"Kaltmiete")),k=num(fieldVal(c,"Provision (Monatskaltmieten)"));courtage=m*k;cText=`${eur(m)} Kaltmiete × ${k.toLocaleString("de-DE")}`}
  const svcSum=lines.reduce((a,l)=>a+l.amount,0);
  const total=c.billing==="courtage"?courtage:c.billing==="hours"?svcSum:c.billing==="mixed"?courtage+svcSum:+c.flat||0;
  return {E,lines,byAct,courtage,cText,svcSum,total,hours:lines.reduce((a,l)=>a+l.h,0)};
}
function billing(c){
  const b=caseBilling(c),o=objBy(c.objectId);
  return `<div class="card noprint"><h2>Abrechnungsart<span class="sp"></span>${c.stage===4?`<button class="btn sm ${c.billed?"":"ok"}" onclick="caseBy('${c.id}').billed=!caseBy('${c.id}').billed;save();render()">${ic("check")}${c.billed?"Als offen markieren":"Als abgerechnet markieren"}</button>`:`<button class="btn sm pri" onclick="setStage('${c.id}',${c.stage<3?3:4})">${c.stage<3?"Abschluss melden":"Zur Abrechnung"}</button>`}</h2>
   <div class="form"><label>Art</label><select onchange="caseBy('${c.id}').billing=this.value;save();render()">${Object.entries(BILL).map(([k,l])=>`<option value="${k}" ${k===c.billing?"selected":""}>${l}</option>`).join("")}</select>
   ${c.billing==="flat"?`<label>Pauschale (€)</label><input type="number" min="0" step="50" value="${c.flat}" onchange="caseBy('${c.id}').flat=+this.value;save();render()">`:""}
   ${c.billing==="mixed"?`<label>Zusätzlich berechnen</label><div class="checks">${b.lines.map(l=>`<label><input type="checkbox" ${c.extra.includes(l.id)?"checked":""} onchange="toggleExtra('${c.id}','${l.id}',this.checked)">${esc(l.name)}</label>`).join("")||'<span class="hint">Noch keine Leistungen erfasst.</span>'}</div>`:""}</div></div>
  <div class="card" id="rep"><h2>Leistungsnachweis ${c.no}<span class="sp"></span><button class="btn sm noprint" onclick="printReport('${c.id}')">${ic("print")}Drucken / PDF (Firmendesign)</button></h2>
   <div class="hint" style="margin-bottom:10px">${esc(c.title)} · ${TYPES[c.type]} · Objekt ${o.no} ${esc(o.title)} · Auftraggeber ${esc(c.client)} · ${c.closed?"Abschluss "+dt(c.closed):"noch nicht abgeschlossen"} · Abrechnung: ${BILL[c.billing]}</div>
   <div class="kpis"><div class="kpi"><div class="l">Erfasste Zeit</div><div class="v">${hd(b.hours*3600000)} h</div><div class="s">${b.E.length} Buchungen</div></div>
   ${c.billing!=="hours"&&c.billing!=="flat"?`<div class="kpi"><div class="l">Courtage</div><div class="v">${eur(b.courtage)}</div><div class="s">${esc(b.cText)}</div></div>`:""}
   ${c.billing==="hours"||c.billing==="mixed"?`<div class="kpi"><div class="l">${c.billing==="mixed"?"Zusatzleistungen":"Leistungswert"}</div><div class="v">${eur(b.svcSum)}</div><div class="s">nach Stundensätzen</div></div>`:""}
   <div class="kpi"><div class="l">Abrechnungsbetrag (netto)</div><div class="v" style="color:var(--acc)">${eur(b.total)}</div><div class="s">${c.billing==="courtage"?"Zeiten nur als Nachweis":c.billing==="flat"?"Pauschale":""}</div></div></div>
   <table><tr><th>Leistung</th><th class="r">Stunden</th>${c.billing==="courtage"||c.billing==="flat"?"":`<th class="r">Satz</th><th class="r">Betrag</th>`}</tr>${b.lines.map(l=>`<tr><td>${esc(l.name)}${(c.billing==="hours"&&!l.billable)||(c.billing==="mixed"&&!l.billed)?' <span class="tag grey">nicht berechnet</span>':""}</td><td class="r">${l.h.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>${c.billing==="courtage"||c.billing==="flat"?"":`<td class="r">${eur(l.rate)}</td><td class="r"><b>${eur(l.amount)}</b></td>`}</tr>`).join("")}
   <tr><td><b>Summe</b></td><td class="r"><b>${b.hours.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}</b></td>${c.billing==="courtage"||c.billing==="flat"?"":`<td></td><td class="r"><b>${eur(b.svcSum)}</b></td>`}</tr></table>
   <h2 style="margin-top:18px">Tätigkeitsnachweis</h2><table><tr><th>Datum</th><th>Aktion</th><th>Leistung</th><th>MA</th><th class="r">Zeit</th></tr>${b.E.slice().reverse().map(e=>`<tr><td>${dt(e.start)}</td><td>${esc(actBy(c.type,e.actionId).name)}${e.note?`<div class="hint">${esc(e.note)}</div>`:""}</td><td class="muted">${esc(svcBy(e.serviceId).name)}</td><td>${userBy(e.userId).short}</td><td class="r">${hm(net(e))}</td></tr>`).join("")}</table></div>`;
}
function toggleExtra(cid,sid,on){const c=caseBy(cid);c.extra=on?[...new Set([...c.extra,sid])]:c.extra.filter(x=>x!==sid);save();render()}

/* ================= Termine (Wochenansicht) ================= */
function vKalender(){
  const ws=weekStart(Date.now())+WEEK*7*DAY,today=dayStart(Date.now());
  const items=DB.tasks.filter(t=>t.due>=ws&&t.due<ws+7*DAY);
  return `<div class="top"><h1>Termine & Wiedervorlagen</h1><div class="seg"><button onclick="WEEK--;render()" aria-label="Vorwoche">${ic("back",'style="width:14px"')}</button><button class="on">KW ${kw(ws)} · ${dt(ws)}</button><button onclick="WEEK++;render()" aria-label="Nächste Woche">${ic("fwd",'style="width:14px"')}</button></div><button class="btn sm" onclick="WEEK=0;render()">Heute</button>
   <div class="sp"></div><button class="btn" onclick="editTask(null,{kind:'wv'})">${ic("plus")}Wiedervorlage</button><button class="btn pri" onclick="editTask(null,{kind:'termin'})">${ic("plus")}Termin</button></div>
   <div class="week">${[0,1,2,3,4,5,6].map(i=>{const d=ws+i*DAY,its=items.filter(t=>t.due>=d&&t.due<d+DAY).sort((a,b)=>a.due-b.due);
    return `<div class="day ${d===today?"td":""}"><h4>${new Date(d).toLocaleDateString("de-DE",{weekday:"short"})}<span>${new Date(d).getDate()}.${new Date(d).getMonth()+1}.</span></h4>${its.map(t=>{const c=caseBy(t.caseId);return `<div class="ev ${t.done?"done":""}" style="--c:${t.kind==="termin"?"var(--"+c.type+")":"var(--warn)"}" onclick="editTask('${t.id}')"><b>${t.kind==="termin"?tm(t.due):"WV"} · ${esc(t.title)}</b><span class="hint">${c.no} · ${userBy(t.userId).short}</span></div>`}).join("")}
     <button class="btn sm" style="margin-top:4px;opacity:.7" onclick="editTask(null,{kind:'termin',due:${d+10*3600000}})" aria-label="Termin anlegen">${ic("plus")}</button></div>`}).join("")}</div>
   <div class="hint" style="margin-top:10px"><span class="tag sale">Termin Verkauf</span> <span class="tag rent">Termin Vermietung</span> <span class="tag warn">Wiedervorlage</span> · Outlook-Synchronisation folgt in einer späteren Ausbaustufe.</div>`;
}
function kw(t){const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const w=new Date(d.getFullYear(),0,4);return 1+Math.round(((d-w)/DAY-3+(w.getDay()+6)%7)/7)}

/* ================= Zeiterfassung ================= */
function vZeiten(){
  let E=DB.entries.slice().sort((a,b)=>b.start-a.start);if(ZUSER==="me")E=E.filter(e=>e.userId===DB.ui.user);
  return `<div class="top"><h1>Zeiterfassung</h1><div class="seg"><button class="${ZUSER==="me"?"on":""}" onclick="ZUSER='me';render()">Meine</button><button class="${ZUSER==="all"?"on":""}" onclick="ZUSER='all';render()">Alle</button></div><div class="sp"></div>
   <button class="btn" onclick="quick({mode:'doc'})">${ic("doc")}Nachtragen</button><button class="btn pri" onclick="quick()">${ic("play")}Starten</button></div>
  <div class="card"><table><tr><th>Datum</th><th>Zeit</th><th>MA</th><th>Fall</th><th>Aktion</th><th>Leistung</th><th class="r">Pause</th><th class="r">Netto</th></tr>
  ${E.map(e=>{const c=caseBy(e.caseId);return `<tr class="click" onclick="editEntry('${e.id}')"><td>${dt(e.start)}</td><td class="muted">${tm(e.start)}–${e.end?tm(e.end):"…"}</td><td>${av(e.userId)}</td><td><span class="tag ${c.type}">${c.no}</span> ${esc(c.title)}</td><td><b>${esc(actBy(c.type,e.actionId).name)}</b>${e.history.length?' <span class="tag grey">geändert</span>':""}</td><td class="muted">${esc(svcBy(e.serviceId).name)}</td><td class="r muted">${e.pause?hm(e.pause):""}</td><td class="r"><b>${e.end?hm(net(e)):'<span class="tag ok">läuft</span>'}</b></td></tr>`}).join("")||'<tr><td colspan="8" class="empty">Keine Buchungen.</td></tr>'}</table></div>`;
}

/* ================= Auswertungen ================= */
function hbars(rows,max){return rows.map(r=>`<div class="hbar"><div>${r.label}</div><div class="bar">${(r.parts||[{v:r.v,c:r.c}]).map(p=>`<i style="--c:${p.c};width:${max?p.v/max*100:0}%" title="${esc(p.t||"")}"></i>`).join("")}</div><div class="h">${r.text}</div></div>`).join("")}
function vAuswertung(){
  let h=`<div class="top"><h1>Auswertungen</h1></div><div class="tabs">${[["ma","Zeiten je Mitarbeiter"],["akt","Aufwand je Aktion / Leistung"],["pipe","Pipeline"],["fall","Leistungsnachweise"]].map(([k,l])=>`<button class="${RTAB===k?"on":""}" onclick="RTAB='${k}';render()">${l}</button>`).join("")}</div>`;
  if(RTAB==="ma"){
    let from,to,label;
    if(RPER==="week"){from=weekStart(Date.now())+ROFF*7*DAY;to=from+7*DAY;label=`KW ${kw(from)} · ${dt(from)} – ${dt(to-DAY)}`}
    else{const d=new Date();d.setDate(1);d.setHours(0,0,0,0);d.setMonth(d.getMonth()+ROFF);from=d.getTime();const e=new Date(d);e.setMonth(e.getMonth()+1);to=e.getTime();label=d.toLocaleDateString("de-DE",{month:"long",year:"numeric"})}
    const E=DB.entries.filter(e=>e.start>=from&&e.start<to);
    const per=DB.settings.users.map(u=>{const ue=E.filter(e=>e.userId===u.id);return {u,ms:sumNet(ue),sale:sumNet(ue.filter(e=>caseBy(e.caseId).type==="sale")),rent:sumNet(ue.filter(e=>caseBy(e.caseId).type==="rent")),n:ue.length,ue}});
    const max=Math.max(...per.map(p=>p.ms),1);
    h+=`<div class="top"><div class="seg"><button class="${RPER==="week"?"on":""}" onclick="RPER='week';ROFF=0;render()">Woche</button><button class="${RPER==="month"?"on":""}" onclick="RPER='month';ROFF=0;render()">Monat</button></div>
     <div class="seg"><button onclick="ROFF--;render()" aria-label="Zurück">${ic("back",'style="width:14px"')}</button><button class="on">${label}</button><button onclick="ROFF++;render()" aria-label="Weiter">${ic("fwd",'style="width:14px"')}</button></div></div>
     <div class="card"><h2>Erfasste Zeit<span class="sp"></span><span class="hint"><span class="tag sale">Verkauf</span> <span class="tag rent">Vermietung</span></span></h2>${hbars(per.map(p=>({label:`${av(p.u.id)} ${esc(p.u.name)}`,parts:[{v:p.sale,c:"var(--sale)",t:"Verkauf "+hm(p.sale)},{v:p.rent,c:"var(--rent)",t:"Vermietung "+hm(p.rent)}],text:hm(p.ms)+" h"})),max)}</div>
     <div class="card"><h2>Details je Mitarbeiter und Leistung</h2><table><tr><th>Mitarbeiter</th>${DB.settings.services.filter(s=>E.some(e=>e.serviceId===s.id)).map(s=>`<th class="r" style="font-size:11px">${esc(s.name.split(" ")[0])}</th>`).join("")}<th class="r">Summe</th></tr>
     ${per.map(p=>`<tr><td>${av(p.u.id)} ${esc(p.u.name)}</td>${DB.settings.services.filter(s=>E.some(e=>e.serviceId===s.id)).map(s=>{const ms=sumNet(p.ue.filter(e=>e.serviceId===s.id));return `<td class="r ${ms?"":"muted"}">${ms?hm(ms):"–"}</td>`}).join("")}<td class="r"><b>${hm(p.ms)}</b></td></tr>`).join("")}</table></div>`;
  }else if(RTAB==="akt"){
    const cs=DB.cases.filter(c=>c.type===RTYPE&&caseEntries(c.id).length),E=DB.entries.filter(e=>e.end&&caseBy(e.caseId).type===RTYPE),n=Math.max(1,cs.length),done=cs.filter(c=>c.stage>=3);
    const byA={},byS={};E.forEach(e=>{byA[e.actionId]=(byA[e.actionId]||0)+net(e);byS[e.serviceId]=(byS[e.serviceId]||0)+net(e)});
    const aRows=Object.entries(byA).sort((a,b)=>b[1]-a[1]),sRows=Object.entries(byS).sort((a,b)=>b[1]-a[1]),max=Math.max(...aRows.map(r=>r[1]),1),maxS=Math.max(...sRows.map(r=>r[1]),1);
    const avgDone=done.length?sumNet(done.flatMap(c=>caseEntries(c.id)))/done.length:0;
    h+=`<div class="top"><div class="seg">${["sale","rent"].map(t=>`<button class="${RTYPE===t?"on":""}" onclick="RTYPE='${t}';render()">${TYPES[t]}</button>`).join("")}</div><span class="hint">${cs.length} Fälle mit Buchungen, davon ${done.length} abgeschlossen</span></div>
    <div class="kpis"><div class="kpi"><div class="l">Gesamtzeit ${TYPES[RTYPE]}</div><div class="v">${hm(sumNet(E))} h</div></div><div class="kpi"><div class="l">Ø je Fall (alle)</div><div class="v">${hm(sumNet(E)/n)} h</div></div>
     <div class="kpi"><div class="l">Ø je abgeschlossenem Fall</div><div class="v">${done.length?hm(avgDone)+" h":"–"}</div><div class="s">Richtwert für Kalkulation</div></div><div class="kpi"><div class="l">Ø Buchungen je Fall</div><div class="v">${(E.length/n).toLocaleString("de-DE",{maximumFractionDigits:1})}</div></div></div>
    <div class="two"><div class="card"><h2>Je Aktion<span class="sp"></span><span class="hint">Summe · Ø je Fall</span></h2>${hbars(aRows.map(([a,ms])=>({label:esc(actBy(RTYPE,a).name),v:ms,c:`var(--${RTYPE})`,text:`${hm(ms)} · ${hm(ms/n)}`})),max)}</div>
    <div class="card"><h2>Je Leistung<span class="sp"></span><span class="hint">Summe · Ø je Fall</span></h2>${hbars(sRows.map(([s,ms])=>({label:esc(svcBy(s).name),v:ms,c:"var(--acc)",text:`${hm(ms)} · ${hm(ms/n)}`})),maxS)}</div></div>`;
  }else if(RTAB==="pipe"){
    const stageAvg=i=>{const ds=DB.cases.filter(c=>c.stageDates&&c.stageDates[i]&&c.stageDates[i+1]).map(c=>(c.stageDates[i+1]-c.stageDates[i])/DAY);return ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:null};
    const closed=t=>DB.cases.filter(c=>c.type===t&&c.stageDates&&c.stageDates[3]).map(c=>(c.stageDates[3]-c.stageDates[0])/DAY);
    const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length)+" Tage":"–";
    const maxN=Math.max(...STAGES.map((s,i)=>DB.cases.filter(c=>c.stage===i).length),1);
    h+=`<div class="kpis"><div class="kpi"><div class="l">Ø Dauer bis Abschluss Verkauf</div><div class="v">${avg(closed("sale"))}</div><div class="s">${closed("sale").length} Fälle</div></div>
     <div class="kpi"><div class="l">Ø Dauer bis Abschluss Vermietung</div><div class="v">${avg(closed("rent"))}</div><div class="s">${closed("rent").length} Fälle</div></div>
     <div class="kpi"><div class="l">Offen gesamt</div><div class="v">${DB.cases.filter(c=>c.stage<4).length}</div></div><div class="kpi"><div class="l">Abgerechnet</div><div class="v">${DB.cases.filter(c=>c.billed).length}</div></div></div>
    <div class="two"><div class="card"><h2>Fälle je Phase</h2>${hbars(STAGES.map((s,i)=>{const cs=DB.cases.filter(c=>c.stage===i);return {label:s,parts:[{v:cs.filter(c=>c.type==="sale").length,c:"var(--sale)"},{v:cs.filter(c=>c.type==="rent").length,c:"var(--rent)"}],text:cs.length}}),maxN)}</div>
    <div class="card"><h2>Ø Verweildauer je Phase</h2>${STAGES.slice(0,4).map((s,i)=>{const a=stageAvg(i);return `<div class="hbar"><div>${s}</div><div class="bar"><i style="--c:var(--acc);width:${a?Math.min(100,a/30*100):0}%"></i></div><div class="h">${a===null?"–":Math.round(a)+" T"}</div></div>`}).join("")}<div class="hint" style="margin-top:8px">Gemessen über die Phasenwechsel aller Fälle.</div></div></div>`;
  }else{
    const cs=DB.cases.filter(c=>c.stage>=3);
    h+=`<div class="card"><table><tr><th>Nr.</th><th>Fall</th><th>Abrechnungsart</th><th class="r">Zeit</th><th class="r">Betrag</th><th>Status</th></tr>${cs.map(c=>{const b=caseBilling(c);return `<tr class="click" onclick="TAB='abr';go('fall','${c.id}')"><td>${c.no}</td><td><span class="tag ${c.type}">${TYPES[c.type]}</span> <b>${esc(c.title)}</b></td><td class="muted">${BILL[c.billing].split(" (")[0]}</td><td class="r">${hd(b.hours*3600000)} h</td><td class="r"><b>${eur(b.total)}</b></td><td>${c.billed?'<span class="tag ok">abgerechnet</span>':c.stage===4?'<span class="tag warn">offen</span>':'<span class="tag grey">Abschluss</span>'}</td></tr>`}).join("")}</table></div>`;
  }
  return h;
}

/* ================= Einstellungen (nur Admin) ================= */
function vEinst(){
  if(!isAdmin())return `<div class="top"><h1>Einstellungen</h1></div><div class="card lock">${ic("lock",'style="width:22px"')}Nur für Admins. Bitte als Admin anmelden bzw. links unten einen Admin wählen.</div>`;
  let h=`<div class="top"><h1>Einstellungen</h1></div><div class="tabs">${[["fields","Erfassungsfelder"],["actions","Aktionen"],["services","Leistungskatalog"],["proto","Übergabeprotokoll"],["design","Design & Dokumente"],["users","Mitarbeiter"],["daten","Daten & Sicherung"],["info","Info"]].map(([k,l])=>`<button class="${SETTAB===k?"on":""}" onclick="SETTAB='${k}';render()">${l}</button>`).join("")}</div>`;
  if(SETTAB==="fields"){
    const fs=DB.settings.fields[SETSCOPE];
    h+=`<div class="top"><div class="seg">${Object.entries(FSCOPE).map(([k,l])=>`<button class="${SETSCOPE===k?"on":""}" onclick="SETSCOPE='${k}';render()">${l}</button>`).join("")}</div><span class="hint">Welche Daten in welcher Reihenfolge abgefragt werden</span><div class="sp"></div><button class="btn pri" onclick="editField(null)">${ic("plus")}Feld</button></div>
    <div class="card"><div class="cfg head"><span></span><span>Bezeichnung</span><span>Typ</span><span>Pflicht</span><span>Aktiv</span><span></span></div>
    ${fs.map((f,i)=>`<div class="cfg ${f.active?"":"off"} ${f.type==="section"?"secrow":""}"><span class="muted" style="text-align:right">${i+1}</span><span style="${f.type==="section"?"font-weight:650":""}">${esc(f.label)}${f.type==="select"?` <span class="hint">(${f.options.split(";").length} Optionen)</span>`:""}</span><span class="muted">${FTYPES[f.type]}</span>
     <span>${f.type==="section"?"":`<input type="checkbox" class="sw" ${f.required?"checked":""} onchange="DB.settings.fields['${SETSCOPE}'][${i}].required=this.checked;save()" aria-label="Pflicht">`}</span>
     <span><input type="checkbox" class="sw" ${f.active?"checked":""} onchange="DB.settings.fields['${SETSCOPE}'][${i}].active=this.checked;save();render()" aria-label="Aktiv"></span>
     <span><button class="ib" aria-label="Nach oben" onclick="mv(${i},-1)">${ic("up")}</button><button class="ib" aria-label="Nach unten" onclick="mv(${i},1)">${ic("down")}</button><button class="ib" aria-label="Bearbeiten" onclick="editField(${i})">${ic("edit")}</button></span></div>`).join("")}</div>`;
  }else if(SETTAB==="actions"){
    const t=SETSCOPE==="rent"?"rent":"sale";if(SETSCOPE==="object")SETSCOPE="sale";const as=DB.settings.actions[t];
    h+=`<div class="top"><div class="seg">${["sale","rent"].map(k=>`<button class="${t===k?"on":""}" onclick="SETSCOPE='${k}';render()">${TYPES[k]}</button>`).join("")}</div><span class="hint">Je Aktion: erlaubte Leistungen (1:n) und eine Standardleistung</span><div class="sp"></div><button class="btn pri" onclick="editAction(null)">${ic("plus")}Aktion</button></div>
    <div class="card"><table><tr><th>Aktion</th><th>Phase</th><th>Leistungen</th><th>Aktiv</th><th></th></tr>${as.map((a,i)=>`<tr style="${a.active?"":"opacity:.5"}"><td><b>${esc(a.name)}</b>${a.proto?' <span class="tag rent">Protokoll</span>':""}</td><td class="muted">${STAGES[a.stage]}</td><td><div class="chips">${a.services.map(s=>`<span class="chip" style="${s===a.def?"border-color:var(--acc);color:var(--acc);font-weight:600":""}">${esc(svcBy(s).name)}${s===a.def?" ★":""}</span>`).join("")}</div></td>
     <td><input type="checkbox" class="sw" ${a.active?"checked":""} onchange="DB.settings.actions['${t}'][${i}].active=this.checked;save();render()" aria-label="Aktiv"></td><td class="r"><button class="ib" aria-label="Bearbeiten" onclick="editAction(${i})">${ic("edit")}</button></td></tr>`).join("")}</table><div class="hint" style="margin-top:8px">★ = Standardleistung beim Start</div></div>`;
  }else if(SETTAB==="daten"){h+=vDaten();
  }else if(SETTAB==="info"){h+=vInfo();
  }else if(SETTAB==="proto"){h+=vProtoSettings();
  }else if(SETTAB==="design"){h+=vDesign();
  }else if(SETTAB==="services"){
    const ss=DB.settings.services;
    h+=`<div class="top"><span class="hint">Frei erweiterbarer Katalog für Verkauf und Vermietung</span><div class="sp"></div><button class="btn pri" onclick="editService(null)">${ic("plus")}Leistung</button></div>
    <div class="card"><table><tr><th>Leistung</th><th class="r">Stundensatz</th><th>Abrechenbar</th><th>Aktiv</th><th>Verwendet in</th><th></th></tr>${ss.map((s,i)=>{const used=[...DB.settings.actions.sale,...DB.settings.actions.rent].filter(a=>a.services.includes(s.id)).length;
      return `<tr style="${s.active?"":"opacity:.5"}"><td><b>${esc(s.name)}</b></td><td class="r">${eur(s.rate)}</td><td><input type="checkbox" class="sw" ${s.billable?"checked":""} onchange="DB.settings.services[${i}].billable=this.checked;save()" aria-label="Abrechenbar"></td><td><input type="checkbox" class="sw" ${s.active?"checked":""} onchange="DB.settings.services[${i}].active=this.checked;save();render()" aria-label="Aktiv"></td><td class="muted">${used} Aktionen</td><td class="r"><button class="ib" aria-label="Bearbeiten" onclick="editService(${i})">${ic("edit")}</button></td></tr>`}).join("")}</table></div>`;
  }else{
    h+=`<div class="card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><b>Anmeldung</b><div class="seg"><button class="${DB.settings.authMode!=="pin"?"on":""}" onclick="setAuth(false)">Benutzerauswahl</button><button class="${DB.settings.authMode==="pin"?"on":""}" onclick="setAuth(true)">Mitarbeiter + PIN</button></div><span class="hint">Für PIN-Anmeldung braucht jeder Mitarbeiter eine PIN (4–6 Ziffern).</span></div>
    <div class="top"><span class="hint">Admin pflegt Einstellungen, Mitarbeiter arbeiten mit allen Fällen</span><div class="sp"></div><button class="btn pri" onclick="editUser(null)">${ic("plus")}Mitarbeiter</button></div>
    <div class="card"><table><tr><th>Name</th><th>Kürzel</th><th>Rolle</th><th>PIN</th><th class="r">Buchungen</th><th></th></tr>${DB.settings.users.map((u,i)=>`<tr><td>${av(u.id)} <b>${esc(u.name)}</b></td><td>${u.short}</td><td>${u.role==="admin"?'<span class="tag sale">Admin</span>':'<span class="tag grey">Mitarbeiter</span>'}</td><td>${u.pinHash?'<span class="tag ok">gesetzt</span>':'<span class="tag warn">fehlt</span>'}</td><td class="r">${DB.entries.filter(e=>e.userId===u.id).length}</td><td class="r"><button class="ib" aria-label="Bearbeiten" onclick="editUser(${i})">${ic("edit")}</button></td></tr>`).join("")}</table></div>`;
  }
  return h;
}
function mv(i,d){const a=DB.settings.fields[SETSCOPE],j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];save();render()}
function editField(i){
  const f=i===null?{label:"",type:"text",options:"",required:false,active:true}:DB.settings.fields[SETSCOPE][i];
  modal(i===null?`Neues Feld – ${FSCOPE[SETSCOPE]}`:"Feld bearbeiten",`<div class="form"><label>Bezeichnung</label><input name="label" value="${esc(f.label)}">
   <label>Typ</label><select name="type">${Object.entries(FTYPES).map(([k,l])=>`<option value="${k}" ${k===f.type?"selected":""}>${l}</option>`).join("")}</select>
   <label>Optionen</label><input name="options" value="${esc(f.options)}" placeholder="nur bei Auswahl, getrennt mit ;">
   <label>Pflichtfeld</label><div><input type="checkbox" class="sw" name="required" ${f.required?"checked":""}></div>
   <label>Aktiv</label><div><input type="checkbox" class="sw" name="active" ${f.active?"checked":""}></div></div>
   <div class="hint" style="margin-top:8px">Inaktive Felder behalten ihre Werte, werden aber nicht mehr abgefragt. Neue Felder erscheinen am Ende und lassen sich mit den Pfeilen einsortieren.</div>`,
  {del:i===null?null:"Löschen",onDel:()=>{DB.settings.fields[SETSCOPE].splice(i,1)},onOk:ov=>{if(!v(ov,"label").trim())throw new Error("Bitte eine Bezeichnung eingeben.");
    const n={...f,id:f.id||uid(),label:v(ov,"label").trim(),type:v(ov,"type"),options:v(ov,"options"),required:v(ov,"required"),active:v(ov,"active")};
    if(i===null)DB.settings.fields[SETSCOPE].push(n);else DB.settings.fields[SETSCOPE][i]=n}});
}
function editAction(i){
  const t=SETSCOPE==="rent"?"rent":"sale";
  const a=i===null?{name:"",stage:2,services:[],def:null,active:true}:DB.settings.actions[t][i];
  modal(i===null?`Neue Aktion – ${TYPES[t]}`:"Aktion bearbeiten",`<div class="form"><label>Name</label><input name="name" value="${esc(a.name)}">
   <label>Phase</label><select name="stage">${STAGES.slice(0,4).map((s,k)=>`<option value="${k}" ${k===a.stage?"selected":""}>${s}</option>`).join("")}</select>
   <label>Leistungen</label><div><table><tr><th>Erlaubt</th><th>Standard</th><th>Leistung</th></tr>${DB.settings.services.filter(s=>s.active||a.services.includes(s.id)).map(s=>`<tr><td><input type="checkbox" name="s_${s.id}" ${a.services.includes(s.id)?"checked":""}></td><td><input type="radio" name="def" value="${s.id}" ${s.id===a.def?"checked":""}></td><td>${esc(s.name)}</td></tr>`).join("")}</table></div>
   ${t==="rent"?`<label>Öffnet Übergabeprotokoll</label><div><input type="checkbox" class="sw" name="proto" ${a.proto?"checked":""}> <span class="hint">Start der Aktion öffnet das Protokoll am Fall</span></div>`:""}
   <label>Aktiv</label><div><input type="checkbox" class="sw" name="active" ${a.active?"checked":""}></div></div>`,
  {wide:true,del:i===null?null:"Löschen",onDel:()=>{DB.settings.actions[t].splice(i,1)},onOk:ov=>{if(!v(ov,"name").trim())throw new Error("Bitte einen Namen eingeben.");
    const svc=DB.settings.services.filter(s=>ov.querySelector(`[name="s_${s.id}"]`)?.checked).map(s=>s.id);if(!svc.length)throw new Error("Bitte mindestens eine Leistung erlauben.");
    let def=v(ov,"def");if(!def||!svc.includes(def))def=svc[0];
    const n={...a,id:a.id||uid(),name:v(ov,"name").trim(),stage:+v(ov,"stage"),services:svc,def,active:v(ov,"active"),proto:t==="rent"?!!v(ov,"proto"):false};
    if(i===null)DB.settings.actions[t].push(n);else DB.settings.actions[t][i]=n}});
}
function editService(i){
  const s=i===null?{name:"",rate:75,billable:true,active:true}:DB.settings.services[i];
  modal(i===null?"Neue Leistung":"Leistung bearbeiten",`<div class="form"><label>Bezeichnung</label><input name="name" value="${esc(s.name)}"><label>Stundensatz (€)</label><input name="rate" type="number" min="0" step="5" value="${s.rate}">
   <label>Abrechenbar</label><div><input type="checkbox" class="sw" name="billable" ${s.billable?"checked":""}></div><label>Aktiv</label><div><input type="checkbox" class="sw" name="active" ${s.active?"checked":""}></div></div>`,
  {onOk:ov=>{if(!v(ov,"name").trim())throw new Error("Bitte eine Bezeichnung eingeben.");const n={...s,id:s.id||uid(),name:v(ov,"name").trim(),rate:+v(ov,"rate")||0,billable:v(ov,"billable"),active:v(ov,"active")};
    if(i===null)DB.settings.services.push(n);else DB.settings.services[i]=n}});
}
function editUser(i){
  const u=i===null?{name:"",short:"",role:"user",color:"#7c3aed"}:DB.settings.users[i];
  modal(i===null?"Neuer Mitarbeiter":"Mitarbeiter bearbeiten",`<div class="form"><label>Name</label><input name="name" value="${esc(u.name)}"><label>Kürzel</label><input name="short" maxlength="3" value="${esc(u.short)}">
   <label>Rolle</label><select name="role"><option value="user" ${u.role==="user"?"selected":""}>Mitarbeiter</option><option value="admin" ${u.role==="admin"?"selected":""}>Admin</option></select><label>Farbe</label><input type="color" name="color" value="${u.color}" style="width:60px;padding:2px">
   <label>PIN</label><div><input name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="${u.pinHash?"unverändert lassen":"4–6 Ziffern (für PIN-Anmeldung)"}" style="max-width:220px"></div></div>`,
  {onOk:ov=>{if(!v(ov,"name").trim())throw new Error("Bitte einen Namen eingeben.");const n={...u,id:u.id||uid(),name:v(ov,"name").trim(),short:(v(ov,"short")||v(ov,"name").split(" ").map(x=>x[0]).join("")).toUpperCase().slice(0,3),role:v(ov,"role"),color:v(ov,"color")};
    const pin=v(ov,"pin").trim();if(pin&&!/^\d{4,6}$/.test(pin))throw new Error("Die PIN muss aus 4 bis 6 Ziffern bestehen.");
    if(DB.settings.authMode==="pin"&&!pin&&!n.pinHash)throw new Error("Bei PIN-Anmeldung braucht jeder Mitarbeiter eine PIN.");
    if(i===null)DB.settings.users.push(n);else DB.settings.users[i]=n;if(!DB.settings.users.some(x=>x.role==="admin"))throw new Error("Mindestens ein Admin ist nötig.");
    if(pin)api.hash(pin+":"+n.id).then(hh=>{n.pinHash=hh;save();render()})}});
}

/* ================= Übergabeprotokoll: Vorlage ================= */
const PTYPES={fields:"Angaben (Felder)",rooms:"Räume mit Prüfpunkten",checklist:"Checkliste mit Zustand",meters:"Zählerstände",keys:"Schlüssel"};
const PSTAT={draft:["Entwurf","grey"],ready:["Bereit zur Unterschrift","warn"],signed:["Unterschrieben","ok"]};
function parseItem(line){const m=line.match(/^(.*?)\s*\[(.+)\]\s*$/);let label=line.trim(),ftype="text",options="";
  if(m){label=m[1].trim();const t=m[2].trim().toLowerCase();if(t==="ja/nein")ftype="bool";else if(t==="datum")ftype="date";else if(t==="text lang")ftype="textarea";else if(t==="zahl")ftype="number";
    else if(t.startsWith("auswahl:")){ftype="select";options=m[2].slice(m[2].indexOf(":")+1).trim()}}
  return {label,ftype,options}}
function itemLine(it){return it.label+({bool:" [ja/nein]",date:" [datum]",textarea:" [text lang]",number:" [zahl]"}[it.ftype]||(it.ftype==="select"?` [auswahl: ${it.options}]`:""))}
function seedProtocol(){
  const S=(title,type,items,rooms=[])=>({id:uid(),title,type,active:true,items:items.map(l=>({id:uid(),...parseItem(l)})),rooms});
  return {states:["in Ordnung","Gebrauchsspuren","Mängel","nicht vorhanden"],sections:[
    S("Allgemeines","fields",["Anwesend Vermieter / Vertreter","Anwesend Mieter","Anwesend Makler","Mietbeginn / Mietende [datum]","Neue Anschrift Mieter (bei Auszug)"]),
    S("Räume","rooms",["Wände / Tapeten","Decke","Boden / Belag","Fenster & Rahmen","Türen & Zargen","Heizkörper","Steckdosen & Schalter","Beleuchtung","Sanitär / Armaturen"],
      ["Flur","Küche","Bad","WC","Wohnzimmer","Schlafzimmer","Kinderzimmer","Balkon / Terrasse","Keller / Abstellraum"]),
    S("Einbauküche & Geräte","checklist",["Herd / Kochfeld","Backofen","Kühlschrank","Geschirrspüler","Dunstabzug","Spüle & Armatur","Schränke & Arbeitsplatte"]),
    S("Zählerstände","meters",["Strom","Gas","Wasser kalt","Wasser warm","Wärmemengenzähler","Heizkostenverteiler"]),
    S("Schlüssel","keys",["Haustür","Wohnungstür","Briefkasten","Keller","Garage / Tiefgarage","Sonstige"]),
    S("Unterlagen & Vereinbarungen","fields",["Rauchwarnmelder geprüft [ja/nein]","Bedienungsanleitungen übergeben [ja/nein]","Energieausweis vorgelegt [ja/nein]","Fotodokumentation erstellt [ja/nein]","Vereinbarte Nacharbeiten / Mängelbeseitigung [text lang]"])
  ]};
}
function seedDesign(){
  return {company:"Muster Immobilien GmbH",address:"Altstadt 100\n84028 Landshut",contact:"Tel. 0871 123 45 67\ninfo@muster-immobilien.de\nwww.muster-immobilien.de",
    footer:"Muster Immobilien GmbH · Geschäftsführer: A. Huber · Amtsgericht Landshut HRB 1234\nUSt-IdNr. DE123456789 · Sparkasse Landshut · IBAN DE00 7435 0000 0000 0000 00",
    logo:null,logoPos:"left",logoSize:"M",color:"#1f4e79",font:"segoe",header:"line",table:"zebra",
    docs:{report:{title:"Leistungsnachweis",intro:"Für den unten genannten Vorgang haben wir folgende Leistungen erbracht.",showRates:true,showActivities:true,showNotes:true,closing:"Vielen Dank für Ihr Vertrauen.",sig:false},
      proto:{titleIn:"Wohnungsübergabeprotokoll – Einzug",titleOut:"Wohnungsübergabeprotokoll – Auszug",intro:"Die Mietsache wurde gemeinsam besichtigt. Der Zustand wurde wie folgt festgestellt:",
        legal:"Mit ihrer Unterschrift bestätigen die Parteien den dokumentierten Zustand der Mietsache sowie die Übergabe der aufgeführten Schlüssel. Weitere Mängel wurden nicht festgestellt.",
        sigLabels:"Vermieter / Vertreter\nMieter\nMakler",showDefects:true,onlyFilled:false,showPhotos:true,photoAppendix:true}}};
}
function makeProtocol(st,c,kind,user){
  const tpl=st.protocol,fv=l=>{const f=st.fields[c.type].find(x=>x.label===l);return f?(c.data[f.id]||""):""};
  const p={id:uid(),no:"UP-"+new Date().getFullYear()+"-"+String(Math.floor(Math.random()*900)+100),caseId:c.id,kind,date:Date.now(),status:"draft",created:Date.now(),by:user,states:[...tpl.states],signed:[],signedAt:null,
    sections:tpl.sections.filter(s=>s.active).map(s=>({id:s.id,title:s.title,type:s.type,items:s.items.map(i=>({...i})),rooms:s.type==="rooms"?s.rooms.map(r=>({id:uid(),name:r,values:{}})):[],values:{}}))};
  const g=p.sections.find(s=>s.type==="fields");
  if(g){const set=(lbl,v)=>{const it=g.items.find(i=>i.label.startsWith(lbl));if(it&&v)g.values[it.id]=v};set("Anwesend Vermieter",fv("Name Vermieter"));set("Anwesend Mieter",fv("Neuer Mieter"));
    const u=st.users.find(x=>x.id===user);set("Anwesend Makler",u?u.name:"");if(kind==="Einzug")set("Mietbeginn",fv("Mietbeginn")||fv("Verfügbar ab"))}
  return p;
}
const isDefect=v=>!!(v&&v.z&&/mängel|defekt|beschädigt/i.test(v.z));
function protoStats(p){let tot=0,done=0,def=0;p.sections.forEach(s=>{
  if(s.type==="rooms")s.rooms.forEach(r=>s.items.forEach(i=>{tot++;const v=r.values[i.id];if(v&&v.z)done++;if(isDefect(v))def++}));
  else if(s.type==="checklist")s.items.forEach(i=>{tot++;const v=s.values[i.id];if(v&&v.z)done++;if(isDefect(v))def++});
  else if(s.type==="meters")s.items.forEach(i=>{tot++;if(s.values[i.id]&&s.values[i.id].stand)done++});
  else if(s.type==="keys")s.items.forEach(i=>{tot++;if(s.values[i.id]&&s.values[i.id].n!==undefined&&s.values[i.id].n!=="")done++})});
  return {tot,done,def,pc:tot?Math.round(done/tot*100):0}}

/* ================= Übergabeprotokoll: am Fall ================= */
let PSEL=null;
const protoAction=c=>DB.settings.actions[c.type].find(a=>a.active&&a.proto);
function addProto(cid,kind){const c=caseBy(cid);const p=makeProtocol(DB.settings,c,kind,DB.ui.user);DB.protocols.push(p);PSEL=p.id;save();render();toast(`${kind}sprotokoll angelegt – Erfassung geöffnet`);openCapture(p.id)}
function delProto(pid){if(!confirm("Protokoll löschen?"))return;DB.protocols=DB.protocols.filter(p=>p.id!==pid);PSEL=null;save();render()}
function setProto(pid,fn){const p=DB.protocols.find(x=>x.id===pid);fn(p);save();render()}
async function uploadSigned(pid,inp){const p=DB.protocols.find(x=>x.id===pid),c=caseBy(p.caseId);const paths=[...inp.files].map(x=>api.pathOf(x)).filter(Boolean);if(!paths.length)return;
  const f=DB.settings.fields[c.type].find(x=>x.label==="Übergabeprotokoll");
  try{const refs=await api.importFiles({paths,rel:folderRel(c,c.type,f||{label:"Übergabeprotokoll"})});
    p.signed.push(...refs);p.status="signed";p.signedAt=Date.now();cloudLock(p.id);if(f)c.files[f.id]=[...(c.files[f.id]||[]),...refs];
    save();render();toast("Unterschriebenes Protokoll abgelegt")}catch(e){toast("Ablage fehlgeschlagen: "+e.message)}}
function printProto(pid){const p=DB.protocols.find(x=>x.id===pid);if(p.status==="draft"){p.status="ready";save();render()}printDoc(buildProtoDoc(p),`${p.no}_${p.kind}.pdf`)}
function addRoom(pid,sid){const inp=document.getElementById("nr_"+sid);const n=inp.value.trim();if(!n)return;setProto(pid,p=>p.sections.find(s=>s.id===sid).rooms.push({id:uid(),name:n,values:{}}))}
function rmRoom(pid,sid,rid){if(!confirm("Raum aus diesem Protokoll entfernen?"))return;setProto(pid,p=>{const s=p.sections.find(x=>x.id===sid);s.rooms=s.rooms.filter(r=>r.id!==rid)})}
function allOk(pid,sid,rid){setProto(pid,p=>{const s=p.sections.find(x=>x.id===sid),tg=rid?s.rooms.find(r=>r.id===rid).values:s.values;s.items.forEach(i=>{tg[i.id]={...(tg[i.id]||{}),z:tg[i.id]?.z||p.states[0]}})})}
document.addEventListener("change",e=>{const d=e.target.dataset;if(!d.pp)return;const p=DB.protocols.find(x=>x.id===d.pp);if(!p)return;const s=p.sections.find(x=>x.id===d.s);
  const tg=d.r?s.rooms.find(r=>r.id===d.r).values:s.values;const val=e.target.type==="checkbox"?String(e.target.checked):e.target.value;
  if(d.k==="v")tg[d.i]=val;else tg[d.i]={...(tg[d.i]||{}),[d.k]:val};
  if(d.k==="z"){const tr=e.target.closest("tr");if(tr)tr.classList.toggle("defect",isDefect(tg[d.i]))}
  save();const st=protoStats(p),el=document.getElementById("pstat");if(el)el.innerHTML=statHTML(st)});
const statHTML=st=>`${st.done}/${st.tot} Punkte erfasst${st.def?` · <b style="color:var(--bad)">${st.def} Mängel</b>`:""}<div class="progress" style="width:160px"><i style="width:${st.pc}%"></i></div>`;
function protoView(c){
  const ps=DB.protocols.filter(p=>p.caseId===c.id).sort((a,b)=>a.created-b.created);
  const p=ps.find(x=>x.id===PSEL)||ps[ps.length-1];
  let h=`<div class="card"><h2>Übergabeprotokolle<span class="sp"></span><button class="btn sm" onclick="addProto('${c.id}','Einzug')">${ic("plus")}Einzug</button><button class="btn sm" onclick="addProto('${c.id}','Auszug')">${ic("plus")}Auszug</button></h2>`;
  if(!ps.length)h+=`<div class="pflow">${["Protokoll anlegen (aus Vorlage)","Beim Übergabetermin ausfüllen","Drucken & unterschreiben lassen","Unterschriebenes Exemplar hochladen"].map((t,i)=>`<div><b>${i+1}</b>${t}</div>`).join("")}</div>`;
  else h+=`<div class="chips">${ps.map(x=>`<button class="pchip ${x===p?"on":""}" onclick="PSEL='${x.id}';render()">${x.no} · ${x.kind} · ${dt(x.date)} <span class="tag ${PSTAT[x.status][1]}">${PSTAT[x.status][0]}</span></button>`).join("")}</div>`;
  h+=`</div>`;if(!p)return h;
  const lock=p.status==="signed",dis=lock?"disabled":"",st=protoStats(p),pa=protoAction(c);
  const stepI=p.status==="signed"?(p.signMode==="digital"&&!p.sent&&!p.sendDeclined?2:3):p.status==="ready"?1:0;
  h+=`<div class="card"><h2>${esc(p.no)} · ${p.kind}<span class="tag ${PSTAT[p.status][1]}">${PSTAT[p.status][0]}</span><span class="sp"></span><span class="hint" id="pstat" style="display:flex;gap:8px;align-items:center">${statHTML(st)}</span></h2>
   <div class="steps" style="margin-bottom:12px">${["Erfassen",p.signMode==="digital"?"Digital unterschreiben":p.signMode==="print"?"Drucken & auf Papier unterschreiben":"Unterschrift: digital oder Papier",p.signMode==="digital"?"Versand an Mieter":p.signMode==="print"?"Unterschriebenes Exemplar hochladen":"Abschluss"].map((s,i)=>`<div class="step ${i<stepI?"done":i===stepI?"cur":""}" style="cursor:default"><b>${i+1}</b>${s}</div>`).join("")}</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    ${pa?`<button class="btn" onclick="startAction('${c.id}','${pa.id}')">${ic("play")}Zeit starten: ${esc(pa.name)}</button>`:""}
    ${p.status!=="signed"?`<button class="btn pri big2" onclick="openCapture('${p.id}')">${ic("edit")}Erfassung öffnen (Touch)</button>`:""}
    ${p.status==="draft"?`<button class="btn" onclick="chooseSign('${p.id}')">${ic("check")}Erfassung abschließen → Unterschrift</button><button class="btn" onclick="printDoc(buildProtoDoc(DB.protocols.find(x=>x.id==='${p.id}')))">${ic("print")}Vorschau</button>`:""}
    ${p.status==="ready"&&p.signMode==="print"?`<button class="btn" onclick="printProto('${p.id}')">${ic("print")}Drucken / PDF</button><label class="btn ok">${ic("clip")}Unterschriebenes Exemplar hochladen<input type="file" accept=".pdf,image/*" multiple hidden onchange="uploadSigned('${p.id}',this)"></label><button class="btn sm" onclick="chooseSign('${p.id}')">Unterschriftsart ändern</button>`:""}
    ${p.status==="ready"&&p.signMode==="digital"?`<button class="btn ok" onclick="signDigital('${p.id}')">${ic("edit")}Jetzt digital unterschreiben</button><button class="btn sm" onclick="chooseSign('${p.id}')">Unterschriftsart ändern</button>`:""}
    ${p.status==="ready"&&!p.signMode?`<button class="btn pri" onclick="chooseSign('${p.id}')">${ic("check")}Unterschrift wählen</button>`:""}
    ${p.status==="signed"?`<button class="btn" onclick="printProto('${p.id}')">${ic("print")}Protokoll drucken / PDF</button>${p.sent?"":`<button class="btn pri" onclick="askSend('${p.id}')">${ic("bolt")}Per E-Mail an Mieter senden</button>`}`:""}
    <span class="sp"></span><label class="hint">Datum <input type="date" value="${isoD(p.date)}" ${dis} style="width:auto" onchange="setProto('${p.id}',x=>x.date=new Date(this.value+'T10:00').getTime())"></label>
    ${lock&&isAdmin()?`<button class="btn sm" onclick="setProto('${p.id}',x=>x.status='ready')">${ic("lock")}Sperre aufheben</button>`:""}${!lock?`<button class="btn sm danger" onclick="delProto('${p.id}')">${ic("trash")}</button>`:""}</div>
   ${p.sigs&&p.sigs.length?`<div class="hint" style="margin-top:10px">${ic("edit",'style="width:14px;vertical-align:-2px"')} Digital unterschrieben ${dt(p.signedAt)} ${tm(p.signedAt)}: ${p.sigs.map(x=>`<b>${esc(x.name)}</b> (${esc(x.label)})`).join(", ")}</div>`:""}
   ${p.sent?`<div class="hint" style="margin-top:6px;color:var(--ok)">${ic("check",'style="width:14px;vertical-align:-2px"')} Per E-Mail an <b>${esc(p.sent.to)}</b> versendet am ${dt(p.sent.at)} ${tm(p.sent.at)} (${esc(userBy(p.sent.by).short)})</div>`:p.sendDeclined?`<div class="hint" style="margin-top:6px">Kein E-Mail-Versand an den Mieter (${dt(p.sendDeclined)}).</div>`:""}
   ${p.signed.length?`<div class="hint" style="margin-top:10px">${ic("folder",'style="width:14px;vertical-align:-2px"')} Abgelegt ${dt(p.signedAt)}: ${p.signed.map(n=>fileChip(n)).join(" ")}${MOBILE?"":` <button class="btn sm" data-rel="${esc(folderRel(c,c.type,{label:"Übergabeprotokoll"}))}" onclick="openRel(this.dataset.rel)">${ic("folder")}Ordner</button>`}</div>`:""}
   ${lock?`<div class="banner" style="margin:12px 0 0">${ic("lock",'style="width:16px"')}Unterschrieben – das Protokoll ist gesperrt. Änderungen nur nach Aufheben der Sperre (Admin) oder über ein neues Protokoll.</div>`:""}</div>`;
  const zSel=(p,s,i,v,r)=>`<select ${dis} data-pp="${p.id}" data-s="${s.id}" ${r?`data-r="${r}"`:""} data-i="${i.id}" data-k="z"><option value=""></option>${p.states.map(o=>`<option ${v&&v.z===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  const note=(p,s,i,v,r,k="note",ph="Bemerkung")=>`<input ${dis} data-pp="${p.id}" data-s="${s.id}" ${r?`data-r="${r}"`:""} data-i="${i.id}" data-k="${k}" value="${esc(v&&v[k]||"")}" placeholder="${ph}">`;
  const chk=(s,vals,r)=>`<table class="ptab"><tr><th style="width:30%">Prüfpunkt</th><th style="width:180px">Zustand</th><th>Bemerkung / Mangel</th><th style="width:150px">Fotos</th></tr>${s.items.map(i=>{const val=vals[i.id];return `<tr class="${isDefect(val)?"defect":""}"><td>${esc(i.label)}</td><td>${zSel(p,s,i,val,r)}</td><td>${note(p,s,i,val,r)}</td><td>${photoCell(p,s,i,val,r,lock)}</td></tr>`}).join("")}</table>`;
  p.sections.forEach(s=>{
    h+=`<div class="card"><h2>${esc(s.title)}<span class="sp"></span>${!lock&&s.type==="checklist"?`<button class="btn sm" onclick="allOk('${p.id}','${s.id}')">${ic("check")}Rest „${esc(p.states[0])}“</button>`:""}</h2>`;
    if(s.type==="fields")h+=`<div class="form">${s.items.map(i=>{const val=s.values[i.id]??"",at=`${dis} data-pp="${p.id}" data-s="${s.id}" data-i="${i.id}" data-k="v"`;
      return `<label>${esc(i.label)}</label>`+(i.ftype==="bool"?`<div><input type="checkbox" class="sw" ${at} ${val==="true"?"checked":""}></div>`:i.ftype==="textarea"?`<textarea ${at}>${esc(val)}</textarea>`:i.ftype==="select"?`<select ${at}><option></option>${i.options.split(";").map(o=>`<option ${o.trim()===val?"selected":""}>${esc(o.trim())}</option>`).join("")}</select>`:`<input ${at} type="${i.ftype==="date"?"date":"text"}" value="${esc(val)}">`)}).join("")}</div>`;
    else if(s.type==="rooms"){delete s._o;h+=s.rooms.map(r=>{const d=s.items.filter(i=>isDefect(r.values[i.id])).length,f=s.items.filter(i=>r.values[i.id]&&r.values[i.id].z).length;
      const op=!lock&&f<s.items.length&&!s._o;if(op)s._o=1;return `<details class="room" ${op?"open":""}><summary><b>${esc(r.name)}</b><span class="hint">${f}/${s.items.length}${d?` · <span style="color:var(--bad)">${d} Mängel</span>`:""}</span><span class="sp"></span>${!lock?`<button class="btn sm" onclick="event.preventDefault();allOk('${p.id}','${s.id}','${r.id}')">${ic("check")}Rest „${esc(p.states[0])}“</button><button class="ib" aria-label="Raum entfernen" onclick="event.preventDefault();rmRoom('${p.id}','${s.id}','${r.id}')">${ic("x")}</button>`:""}</summary>${chk(s,r.values,r.id)}</details>`}).join("");
      delete s._o;if(!lock)h+=`<div style="display:flex;gap:8px;margin-top:10px;max-width:420px"><input id="nr_${s.id}" placeholder="Weiteren Raum hinzufügen, z. B. Gäste-WC"><button class="btn" onclick="addRoom('${p.id}','${s.id}')">${ic("plus")}Raum</button></div>`}
    else if(s.type==="checklist")h+=chk(s,s.values);
    else if(s.type==="meters")h+=`<table class="ptab"><tr><th style="width:30%">Zähler</th><th>Zählernummer</th><th>Stand</th><th style="width:150px">Fotos</th></tr>${s.items.map(i=>`<tr><td>${esc(i.label)}</td><td>${note(p,s,i,s.values[i.id],null,"nr","Zählernummer")}</td><td>${note(p,s,i,s.values[i.id],null,"stand","Zählerstand")}</td><td>${photoCell(p,s,i,s.values[i.id],null,lock)}</td></tr>`).join("")}</table>`;
    else if(s.type==="keys")h+=`<table class="ptab"><tr><th style="width:34%">Schlüssel</th><th style="width:110px">Anzahl</th><th>Bemerkung / Schlüsselnummer</th></tr>${s.items.map(i=>`<tr><td>${esc(i.label)}</td><td>${note(p,s,i,s.values[i.id],null,"n","0")}</td><td>${note(p,s,i,s.values[i.id],null,"note","")}</td></tr>`).join("")}</table>`;
    h+=`</div>`;
  });
  return h+`<div class="hint">Struktur, Räume, Prüfpunkte und Zustandswerte pflegt der Admin unter Einstellungen → Übergabeprotokoll. Logo und Layout des Ausdrucks unter Einstellungen → Design & Dokumente.</div>`;
}

/* ================= Dokument-Renderer (gemeinsames Design) ================= */
const FONTS={segoe:["'Segoe UI',Arial,sans-serif","Segoe UI (modern)"],calibri:["Calibri,Carlito,Arial,sans-serif","Calibri (sachlich)"],georgia:["Georgia,'Times New Roman',serif","Georgia (klassisch)"],arial:["Arial,Helvetica,sans-serif","Arial (neutral)"]};
const LOGOH={S:44,M:64,L:90};
const nl=s=>esc(s).replace(/\n/g,"<br>");
function docShell(title,meta,body,sig){
  const d=DB.settings.design,col=d.color;
  const logo=d.logo?`<img src="${d.logo}" alt="Logo" style="max-height:${LOGOH[d.logoSize]}px;max-width:260px;display:block">`:`<div style="font-size:${d.logoSize==="L"?24:d.logoSize==="M"?20:17}px;font-weight:700;color:${col}">${esc(d.company)}</div>`;
  const comp=`<div style="font-size:10.5px;line-height:1.45;color:#555;text-align:${d.logoPos==="right"?"left":"right"}"><b style="color:#222">${esc(d.company)}</b><br>${nl(d.address)}<br>${nl(d.contact)}</div>`;
  const head=d.logoPos==="center"?`<div style="text-align:center"><div style="display:inline-block">${logo}</div><div style="font-size:10.5px;color:#555;margin-top:6px">${esc(d.company)} · ${esc(d.address.replace(/\n/g," · "))} · ${esc(d.contact.split("\n")[0]||"")}</div></div>`
    :`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;${d.logoPos==="right"?"flex-direction:row-reverse":""}"><div>${logo}</div>${comp}</div>`;
  const band=d.header==="band"?`<div class="band" style="background:${col}"></div>`:"";
  const line=d.header==="line"?`border-bottom:2px solid ${col};padding-bottom:14px;`:d.header==="band"?"padding-bottom:10px;":"padding-bottom:10px;";
  return `<div class="doc t-${d.table}" style="font-family:${FONTS[d.font][0]};--dc:${col}">${band}<div style="${line}margin-bottom:18px">${head}</div>
   <h1 style="color:${col}">${esc(title)}</h1>
   ${meta.length?`<table class="meta">${meta.reduce((a,m,i)=>a+(i%2===0?"<tr>":"")+`<th>${esc(m[0])}</th><td>${esc(m[1]||"–")}</td>`+(i%2===1||i===meta.length-1?"</tr>":""),"")}</table>`:""}
   ${body}
   ${sig&&sig.length?`<div class="sigs" style="grid-template-columns:repeat(${Math.min(sig.length,3)},1fr)">${sig.map(l=>typeof l==="object"
     ?`<div><div class="sv">${esc(l.place||"")}${l.place?", ":""}${dt(l.at)}</div><div class="sl" style="height:2px"></div><span>Ort, Datum</span><div class="simg"><img src="${l.img}" alt="Unterschrift ${esc(l.name)}"></div><div class="sl" style="height:2px"></div><span>${esc(l.label)} – ${esc(l.name)}</span></div>`
     :`<div><div class="sl"></div><span>Ort, Datum</span><div class="sl" style="margin-top:28px"></div><span>${esc(l)}</span></div>`).join("")}</div>
     ${sig.some(l=>typeof l==="object")?`<div style="font-size:9.5px;color:#666;margin-top:8px">Elektronisch unterschrieben am Gerät des Maklers.</div>`:""}`:""}
   <div class="dfoot">${nl(d.footer)}</div></div>`;
}
function buildReportDoc(c){
  const D=DB.settings.design.docs.report,b=caseBilling(c),o=objBy(c.objectId),E=b.E.slice().reverse();
  const rates=D.showRates&&(c.billing==="hours"||c.billing==="mixed");
  const span=E.length?`${dt(E[0].start)} – ${dt(E[E.length-1].start)}`:"–";
  let body=D.intro?`<p>${nl(D.intro)}</p>`:"";
  body+=`<h2>Leistungen</h2><table class="grid"><tr><th>Leistung</th><th class="r">Stunden</th>${rates?`<th class="r">Satz</th><th class="r">Betrag</th>`:""}</tr>${b.lines.map(l=>`<tr><td>${esc(l.name)}${rates&&!l.billed?" <i>(nicht berechnet)</i>":""}</td><td class="r">${l.h.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>${rates?`<td class="r">${eur(l.rate)}</td><td class="r">${eur(l.amount)}</td>`:""}</tr>`).join("")}
   <tr class="sum"><td>Summe</td><td class="r">${b.hours.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>${rates?`<td></td><td class="r">${eur(b.svcSum)}</td>`:""}</tr></table>`;
  const tot=[];if(c.billing==="courtage"||c.billing==="mixed")tot.push(["Courtage",`${b.cText}`,eur(b.courtage)]);if(c.billing==="mixed")tot.push(["Zusatzleistungen","nach Stundensätzen",eur(b.svcSum)]);if(c.billing==="hours")tot.push(["Leistungen","nach Stundensätzen",eur(b.svcSum)]);if(c.billing==="flat")tot.push(["Pauschale","",eur(c.flat)]);
  body+=`<table class="tot">${tot.map(t=>`<tr><td>${esc(t[0])}<div style="font-size:10px;color:#777">${esc(t[1])}</div></td><td class="r">${t[2]}</td></tr>`).join("")}<tr class="sum"><td>Gesamtbetrag (netto)</td><td class="r">${eur(b.total)}</td></tr></table>`;
  if(D.showActivities)body+=`<h2>Tätigkeitsnachweis</h2><table class="grid"><tr><th>Datum</th><th>Tätigkeit</th><th>Leistung</th><th>MA</th><th class="r">Zeit</th></tr>${E.map(e=>`<tr><td>${dt(e.start)}</td><td>${esc(actBy(c.type,e.actionId).name)}${D.showNotes&&e.note?`<div style="font-size:10px;color:#666">${esc(e.note)}</div>`:""}</td><td>${esc(svcBy(e.serviceId).name)}</td><td>${userBy(e.userId).short}</td><td class="r">${hm(net(e))}</td></tr>`).join("")}</table>`;
  if(D.closing)body+=`<p style="margin-top:16px">${nl(D.closing)}</p>`;
  return docShell(D.title,[["Vorgang",c.no+" · "+TYPES[c.type]],["Datum",dt(Date.now())],["Objekt",o.title],["Auftraggeber",c.client],["Adresse",objVal(o,"Adresse")],["Zeitraum",span],["Abrechnung",BILL[c.billing].split(" (")[0]],["Status",c.closed?"abgeschlossen "+dt(c.closed):"laufend"]],body,D.sig?["Makler","Auftraggeber"]:null);
}
function buildProtoDoc(p){
  const D=DB.settings.design.docs.proto,c=caseBy(p.caseId),o=objBy(c.objectId);
  const fv=l=>fieldVal(c,l)||"";
  const show=v=>!D.onlyFilled||(v&&(v.z||v.note));
  let body=D.intro?`<p>${nl(D.intro)}</p>`:"";const defects=[],photos=[];
  const chk=(s,vals,room)=>{const rows=s.items.filter(i=>show(vals[i.id]));if(!rows.length)return"";rows.forEach(i=>{if(isDefect(vals[i.id]))defects.push([room||s.title,i.label,vals[i.id].note||""])});
    const hasPh=D.showPhotos&&rows.some(i=>vals[i.id]&&vals[i.id].photos&&vals[i.id].photos.length);
    rows.forEach(i=>{const v=vals[i.id];if(D.photoAppendix&&v&&v.photos)v.photos.forEach((ph,k)=>photos.push([`${room||s.title} · ${i.label}`,ph,v.z||"",photos.length+1]))});
    return `<table class="grid"><tr><th style="width:${hasPh?30:36}%">Prüfpunkt</th><th style="width:20%">Zustand</th><th>Bemerkung</th>${hasPh?'<th style="width:150px">Fotos</th>':""}</tr>${rows.map(i=>{const v=vals[i.id]||{};return `<tr${isDefect(v)?' class="def"':""}><td>${esc(i.label)}</td><td>${esc(v.z||"")}</td><td>${esc(v.note||"")}</td>${hasPh?`<td class="thumbs">${(v.photos||[]).map(ph=>`<img src="${psrc(ph)}" alt="">`).join("")}</td>`:""}</tr>`}).join("")}</table>`};
  p.sections.forEach(s=>{
    if(s.type==="fields")body+=`<h2>${esc(s.title)}</h2><table class="grid kv">${s.items.map(i=>{const v=s.values[i.id];return `<tr><th>${esc(i.label)}</th><td>${i.ftype==="bool"?(v==="true"?"☑ ja":"☐ nein"):i.ftype==="date"&&v?dt(v):nl(v||"")}</td></tr>`}).join("")}</table>`;
    else if(s.type==="rooms"){body+=`<h2>${esc(s.title)}</h2>`;s.rooms.forEach(r=>{const t=chk(s,r.values,r.name);if(t)body+=`<h3>${esc(r.name)}</h3>${t}`})}
    else if(s.type==="checklist"){const t=chk(s,s.values);if(t)body+=`<h2>${esc(s.title)}</h2>${t}`}
    else if(s.type==="meters"){const hasPh=D.showPhotos&&s.items.some(i=>s.values[i.id]&&s.values[i.id].photos&&s.values[i.id].photos.length);
      s.items.forEach(i=>{const v=s.values[i.id];if(D.photoAppendix&&v&&v.photos)v.photos.forEach(ph=>photos.push([`Zähler ${i.label}`,ph,v.stand||"",photos.length+1]))});
      body+=`<h2>${esc(s.title)}</h2><table class="grid"><tr><th style="width:30%">Zähler</th><th>Zählernummer</th><th>Stand</th>${hasPh?'<th style="width:150px">Fotos</th>':""}</tr>${s.items.map(i=>{const v=s.values[i.id]||{};return `<tr><td>${esc(i.label)}</td><td>${esc(v.nr||"")}</td><td>${esc(v.stand||"")}</td>${hasPh?`<td class="thumbs">${(v.photos||[]).map(ph=>`<img src="${psrc(ph)}" alt="">`).join("")}</td>`:""}</tr>`}).join("")}</table>`}
    else if(s.type==="keys")body+=`<h2>${esc(s.title)}</h2><table class="grid"><tr><th style="width:36%">Schlüssel</th><th style="width:14%" class="r">Anzahl</th><th>Bemerkung</th></tr>${s.items.map(i=>{const v=s.values[i.id]||{};return `<tr><td>${esc(i.label)}</td><td class="r">${esc(v.n||"")}</td><td>${esc(v.note||"")}</td></tr>`}).join("")}</table>`;
  });
  if(D.showDefects)body+=`<h2>Mängelübersicht</h2>${defects.length?`<table class="grid"><tr><th>Bereich</th><th>Prüfpunkt</th><th>Beschreibung</th></tr>${defects.map(d=>`<tr class="def"><td>${esc(d[0])}</td><td>${esc(d[1])}</td><td>${esc(d[2])}</td></tr>`).join("")}</table>`:"<p>Keine Mängel festgestellt.</p>"}`;
  if(D.legal)body+=`<p class="legal">${nl(D.legal)}</p>`;
  const sigBlock=p.sigs&&p.sigs.length?p.sigs.map(x=>({...x,place:p.place})):D.sigLabels.split("\n").map(s=>s.trim()).filter(Boolean);
  if(D.photoAppendix&&photos.length){const html=docShell(p.kind==="Auszug"?D.titleOut:D.titleIn,[["Protokoll-Nr.",p.no],["Übergabedatum",dt(p.date)],["Objekt",o.title],["Adresse",objVal(o,"Adresse")],["Vermieter",fv("Name Vermieter")],["Mieter",fv("Neuer Mieter")],["Vorgang",c.no],["Lage / Etage",objVal(o,"Etage")]],body,sigBlock);
    return html.replace('<div class="dfoot">',`<div class="photoapp"><h2>Anlage Fotodokumentation (${photos.length})</h2><div class="pgrid">${photos.map(f=>`<figure><img src="${psrc(f[1])}" alt=""><figcaption><b>${f[3]}.</b> ${esc(f[0])}${f[2]?" – "+esc(f[2]):""}</figcaption></figure>`).join("")}</div></div><div class="dfoot">`)}
  return docShell(p.kind==="Auszug"?D.titleOut:D.titleIn,[["Protokoll-Nr.",p.no],["Übergabedatum",dt(p.date)],["Objekt",o.title],["Adresse",objVal(o,"Adresse")],["Vermieter",fv("Name Vermieter")],["Mieter",fv("Neuer Mieter")],["Vorgang",c.no],["Lage / Etage",objVal(o,"Etage")]],body,p.sigs&&p.sigs.length?p.sigs.map(x=>({...x,place:p.place})):D.sigLabels.split("\n").map(s=>s.trim()).filter(Boolean));
}
function printReport(cid){const c=caseBy(cid);printDoc(buildReportDoc(c),`Leistungsnachweis_${c.no}.pdf`)}

/* ================= Einstellungen: Protokollvorlage ================= */
function vProtoSettings(){
  const T=DB.settings.protocol;
  return `<div class="top"><span class="hint">Vorlage für neue Übergabeprotokolle. Bestehende Protokolle bleiben unverändert.</span><div class="sp"></div><button class="btn pri" onclick="editSection(null)">${ic("plus")}Abschnitt</button></div>
  <div><div class="card"><div class="cfg head" style="grid-template-columns:28px minmax(0,1fr) 170px 90px 70px 86px"><span></span><span>Abschnitt</span><span>Art</span><span>Umfang</span><span>Aktiv</span><span></span></div>
   ${T.sections.map((s,i)=>`<div class="cfg ${s.active?"":"off"}" style="grid-template-columns:28px minmax(0,1fr) 170px 90px 70px 86px"><span class="muted" style="text-align:right">${i+1}</span><span><b>${esc(s.title)}</b><div class="hint">${esc(s.items.slice(0,4).map(x=>x.label).join(", "))}${s.items.length>4?" …":""}</div></span><span class="muted">${PTYPES[s.type]}</span>
    <span class="muted">${s.type==="rooms"?`${s.rooms.length} Räume × ${s.items.length}`:`${s.items.length} Punkte`}</span><span><input type="checkbox" class="sw" ${s.active?"checked":""} onchange="DB.settings.protocol.sections[${i}].active=this.checked;save();render()" aria-label="Aktiv"></span>
    <span><button class="ib" aria-label="Nach oben" onclick="mvSec(${i},-1)">${ic("up")}</button><button class="ib" aria-label="Nach unten" onclick="mvSec(${i},1)">${ic("down")}</button><button class="ib" aria-label="Bearbeiten" onclick="editSection(${i})">${ic("edit")}</button></span></div>`).join("")}</div>
   <div class="card" style="max-width:620px"><h2>Zustandswerte</h2><div class="hint" style="margin-bottom:8px">Auswahl je Prüfpunkt, eine Zeile je Wert. Werte mit „Mängel“, „defekt“ oder „beschädigt“ landen automatisch in der Mängelübersicht.</div>
    <textarea style="min-height:130px" onchange="DB.settings.protocol.states=this.value.split('\\n').map(s=>s.trim()).filter(Boolean);save();toast('Gespeichert')">${esc(T.states.join("\n"))}</textarea>
    <div class="hint" style="margin-top:10px">Arten: <b>Angaben</b> (freie Felder), <b>Räume</b> (Raumliste × Prüfpunkte, am Protokoll erweiterbar), <b>Checkliste</b>, <b>Zählerstände</b>, <b>Schlüssel</b>.</div></div></div>`;
}
function mvSec(i,d){const a=DB.settings.protocol.sections,j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];save();render()}
function editSection(i){
  const s=i===null?{title:"",type:"checklist",active:true,items:[],rooms:[]}:DB.settings.protocol.sections[i];
  const ov=modal(i===null?"Neuer Abschnitt":"Abschnitt bearbeiten",`<div class="form"><label>Titel</label><input name="title" value="${esc(s.title)}" placeholder="z. B. Außenanlagen">
   <label>Art</label><select name="type">${Object.entries(PTYPES).map(([k,l])=>`<option value="${k}" ${k===s.type?"selected":""}>${l}</option>`).join("")}</select>
   <label class="rr">Räume</label><textarea class="rr" name="rooms" style="min-height:120px" placeholder="eine Zeile je Raum">${esc(s.rooms.join("\n"))}</textarea>
   <label id="il">Punkte</label><textarea name="items" style="min-height:160px" placeholder="eine Zeile je Punkt">${esc(s.items.map(itemLine).join("\n"))}</textarea>
   <label>Aktiv</label><div><input type="checkbox" class="sw" name="active" ${s.active?"checked":""}></div></div>
   <div class="hint fh" style="margin-top:8px">Bei <b>Angaben</b> lässt sich der Feldtyp anhängen: <code>[ja/nein]</code>, <code>[datum]</code>, <code>[zahl]</code>, <code>[text lang]</code>, <code>[auswahl: A;B;C]</code>. Ohne Angabe wird es ein Textfeld.</div>`,
  {wide:true,del:i===null?null:"Löschen",onDel:()=>{DB.settings.protocol.sections.splice(i,1)},onOk:ov=>{if(!v(ov,"title").trim())throw new Error("Bitte einen Titel eingeben.");
    const lines=v(ov,"items").split("\n").map(x=>x.trim()).filter(Boolean);if(!lines.length)throw new Error("Bitte mindestens einen Punkt eintragen.");
    const items=lines.map(l=>{const p=parseItem(l);const old=s.items.find(x=>x.label===p.label);return {id:old?old.id:uid(),...p}});
    const n={...s,id:s.id||uid(),title:v(ov,"title").trim(),type:v(ov,"type"),items,rooms:v(ov,"rooms").split("\n").map(x=>x.trim()).filter(Boolean),active:v(ov,"active")};
    if(n.type==="rooms"&&!n.rooms.length)throw new Error("Bitte mindestens einen Raum eintragen.");
    if(i===null)DB.settings.protocol.sections.push(n);else DB.settings.protocol.sections[i]=n}});
  const tog=()=>{const t=v(ov,"type");ov.querySelectorAll(".rr").forEach(e=>e.style.display=t==="rooms"?"":"none");ov.querySelector(".fh").style.display=t==="fields"?"":"none";
    ov.querySelector("#il").textContent={rooms:"Prüfpunkte je Raum",meters:"Zähler",keys:"Schlüsselarten",fields:"Felder",checklist:"Prüfpunkte"}[t]};
  ov.querySelector("[name=type]").onchange=tog;tog();
}

/* ================= Einstellungen: Design & Dokumente ================= */
let DDOC="proto";
function vDesign(){
  const d=DB.settings.design,R=d.docs.report,P=d.docs.proto;
  const inp=(k,lbl,ph="")=>`<label>${lbl}</label><input data-d="${k}" value="${esc(k.split(".").reduce((a,x)=>a[x],d))}" placeholder="${ph}">`;
  const ta=(k,lbl,h=60)=>`<label>${lbl}</label><textarea data-d="${k}" style="min-height:${h}px">${esc(k.split(".").reduce((a,x)=>a[x],d))}</textarea>`;
  const sw=(k,lbl)=>`<label>${lbl}</label><div><input type="checkbox" class="sw" data-d="${k}" ${k.split(".").reduce((a,x)=>a[x],d)?"checked":""}></div>`;
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button class="${d[k]===v?"on":""}" onclick="DB.settings.design.${k}='${v}';save();render()">${l}</button>`).join("")}</div>`;
  return `<div class="designer"><div>
   <div class="card"><h2>Vorlagen, Import & Export</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" onclick="importDesign('lugtiv')">${ic("plus")}Vorlage „Lugtiv“ laden</button><button class="btn" onclick="importDesign()">${ic("down")}Importieren</button><button class="btn" onclick="exportDesign()">${ic("up")}Exportieren</button></div>
    <div class="hint" style="margin-top:8px">Austauschformat JSON: Design, Firmendaten, Dokumenttexte, Logo und optional die Protokollvorlage. So lässt sich ein Design sichern oder in ein anderes Büro übertragen.</div></div>
   <div class="card"><h2>Firma & Logo</h2><div class="form">
    <label>Logo</label><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${d.logo?`<img src="${d.logo}" alt="Logo" style="max-height:44px;max-width:160px;border:1px solid var(--line);border-radius:6px;padding:4px;background:#fff">`:'<span class="hint">kein Logo – Firmenname wird als Schriftzug gesetzt</span>'}
     <label class="btn sm">${ic("plus")}${d.logo?"Ersetzen":"Logo hochladen"}<input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onchange="setLogo(this)"></label>${d.logo?`<button class="btn sm danger" onclick="DB.settings.design.logo=null;save();render()">Entfernen</button>`:""}</div>
    <label>Logo-Position</label>${seg("logoPos",[["left","links"],["center","mittig"],["right","rechts"]])}
    <label>Logo-Größe</label>${seg("logoSize",[["S","klein"],["M","mittel"],["L","groß"]])}
    ${inp("company","Firmenname")}${ta("address","Anschrift",50)}${ta("contact","Kontakt",60)}</div></div>
   <div class="card"><h2>Gestaltung</h2><div class="form">
    <label>Hausfarbe</label><div style="display:flex;gap:8px;align-items:center"><input type="color" data-d="color" value="${d.color}" style="width:52px;padding:2px">${["#1f4e79","#2563eb","#0f766e","#7c2d12","#7e22ce","#111827","#b91c1c"].map(c=>`<button class="swc" style="--c:${c}" aria-label="Farbe ${c}" onclick="DB.settings.design.color='${c}';save();render()"></button>`).join("")}</div>
    <label>Schrift</label><select data-d="font">${Object.entries(FONTS).map(([k,f])=>`<option value="${k}" ${d.font===k?"selected":""}>${f[1]}</option>`).join("")}</select>
    <label>Kopfbereich</label>${seg("header",[["line","Linie"],["band","Farbband"],["none","schlicht"]])}
    <label>Tabellen</label>${seg("table",[["zebra","Zebra"],["lines","Linien"],["boxed","Gitter"]])}
    ${ta("footer","Fußzeile",60)}</div></div>
   <div class="card"><h2>Dokumente<span class="sp"></span><div class="seg"><button class="${DDOC==="proto"?"on":""}" onclick="DDOC='proto';render()">Übergabeprotokoll</button><button class="${DDOC==="report"?"on":""}" onclick="DDOC='report';render()">Leistungsnachweis</button></div></h2><div class="form">
    ${DDOC==="proto"?`${inp("docs.proto.titleIn","Titel Einzug")}${inp("docs.proto.titleOut","Titel Auszug")}${ta("docs.proto.intro","Einleitung")}${ta("docs.proto.legal","Schlusstext / Bestätigung",80)}
      ${ta("docs.proto.sigLabels","Unterschriften (je Zeile)",70)}${sw("docs.proto.showDefects","Mängelübersicht")}${sw("docs.proto.onlyFilled","Nur ausgefüllte Punkte drucken")}${sw("docs.proto.showPhotos","Foto-Miniaturen in Tabellen")}${sw("docs.proto.photoAppendix","Anlage Fotodokumentation")}`
    :`${inp("docs.report.title","Titel")}${ta("docs.report.intro","Einleitung")}${sw("docs.report.showRates","Stundensätze/Beträge (bei Stunden)")}${sw("docs.report.showActivities","Tätigkeitsnachweis")}${sw("docs.report.showNotes","Notizen zu Tätigkeiten")}
      ${ta("docs.report.closing","Schlusstext")}${sw("docs.report.sig","Unterschriftenfeld")}`}</div></div>
   </div>
   <div class="pvwrap"><div class="pvhead"><b>Vorschau</b><span class="hint">${DDOC==="proto"?"mit Beispielprotokoll":"mit Beispielfall"} · A4</span><span class="sp"></span><button class="btn sm" onclick="printDoc(sampleDoc())">${ic("print")}Testdruck</button></div><div class="paper" id="paper"><div id="pv"></div></div></div></div>`;
}
function sampleDoc(){
  if(DDOC==="report"){const c=DB.cases.find(x=>x.stage>=3&&caseEntries(x.id).length)||DB.cases.find(x=>caseEntries(x.id).length)||DB.cases[0];return buildReportDoc(c)}
  let p=DB.protocols.find(x=>x.status==="signed")||DB.protocols[0];
  if(!p){const c=DB.cases.find(x=>x.type==="rent");p=makeProtocol(DB.settings,c,"Einzug",DB.ui.user)}
  return buildProtoDoc(p);
}
function drawPreview(){const pv=document.getElementById("pv"),paper=document.getElementById("paper");if(!pv)return;pv.innerHTML=sampleDoc();
  const s=paper.clientWidth/794;pv.style.transform=`scale(${s})`;paper.style.height=Math.max(pv.firstElementChild.scrollHeight*s,paper.clientWidth*297/210)+"px"}
function setLogo(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{
  if(f.type==="image/svg+xml"){DB.settings.design.logo=r.result;save();render();return}
  const img=new Image();img.onload=()=>{const sc=Math.min(1,600/img.width,240/img.height),cv=document.createElement("canvas");cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);DB.settings.design.logo=cv.toDataURL("image/png");const dc=dominantColor(cv);if(dc)DB.settings.design.color=dc;save();render();toast(dc?`Logo übernommen – Hausfarbe ${dc} aus dem Logo gesetzt`:"Logo übernommen")};img.src=r.result};r.readAsDataURL(f)}
document.addEventListener("input",e=>{const k=e.target.dataset.d;if(!k||e.target.type==="checkbox")return;const path=k.split("."),last=path.pop();path.reduce((a,x)=>a[x],DB.settings.design)[last]=e.target.value;save();drawPreview()});
document.addEventListener("change",e=>{const k=e.target.dataset.d;if(!k)return;const path=k.split("."),last=path.pop();path.reduce((a,x)=>a[x],DB.settings.design)[last]=e.target.type==="checkbox"?e.target.checked:e.target.value;save();drawPreview()});
window.addEventListener("resize",()=>{if(VIEW==="einstellungen"&&SETTAB==="design")drawPreview()});

/* ================= v0.4: Unterschrift (digital / Papier) & Versand ================= */
const sigLabels=()=>DB.settings.design.docs.proto.sigLabels.split("\n").map(s=>s.trim()).filter(Boolean);
function tenantMailField(){return DB.settings.fields.rent.find(f=>f.label==="E-Mail Mieter")}
function chooseSign(pid){
  const p=DB.protocols.find(x=>x.id===pid),st=protoStats(p);
  const ov=modal("Wie wird das Protokoll unterschrieben?",`${st.done<st.tot?`<div class="banner" style="background:var(--warn-soft);color:var(--warn)">${ic("bell",'style="width:16px"')}Noch nicht alle Punkte erfasst (${st.done}/${st.tot}). Offene Punkte bleiben im Protokoll leer.</div>`:""}
   <div class="choice"><button data-m="digital">${ic("edit",'style="width:26px;height:26px"')}<b>Digital am Gerät</b><span>Alle Parteien unterschreiben direkt auf Tablet oder Bildschirm. Das Protokoll ist sofort abgeschlossen und kann per E-Mail an den Mieter gehen.</span></button>
   <button data-m="print">${ic("print",'style="width:26px;height:26px"')}<b>Ausdruck auf Papier</b><span>Protokoll drucken, vor Ort unterschreiben lassen, danach das unterschriebene Exemplar scannen und hochladen.</span></button></div>`,{ok:null});
  ov.querySelectorAll(".choice button").forEach(b=>b.onclick=()=>{ov.close();p.signMode=b.dataset.m;p.status="ready";save();render();
    if(b.dataset.m==="digital")signDigital(pid);else{toast("Druckansicht wird geöffnet");printDoc(buildProtoDoc(p),`${p.no}_${p.kind}.pdf`)}});
}
function signDigital(pid){
  const p=DB.protocols.find(x=>x.id===pid),c=caseBy(p.caseId),labels=sigLabels();
  const gv=lbl=>{const g=p.sections.find(s=>s.type==="fields");if(!g)return"";const it=g.items.find(i=>i.label.toLowerCase().includes(lbl));return it?(g.values[it.id]||""):""};
  const guess=l=>/mieter/i.test(l)&&!/ver/i.test(l)?(gv("anwesend mieter")||fieldVal(c,"Neuer Mieter")||""):/vermieter/i.test(l)?(gv("vermieter")||fieldVal(c,"Name Vermieter")||""):/makler/i.test(l)?ME().name:"";
  const ov=modal(`Digitale Unterschrift · ${p.no}`,`<div class="hint" style="margin-bottom:10px">Bitte das Protokoll gemeinsam durchgehen. Danach unterschreibt jede Partei mit Finger, Stift oder Maus im jeweiligen Feld.</div>
   <div class="pads">${labels.map((l,i)=>`<div class="pad"><div class="padh"><b>${esc(l)}</b><button class="btn sm" type="button" data-clr="${i}">Löschen</button></div>
     <canvas data-pad="${i}" width="340" height="130" aria-label="Unterschriftsfeld ${esc(l)}"></canvas><input name="n${i}" value="${esc(guess(l))}" placeholder="Name in Druckbuchstaben"></div>`).join("")}</div>
   <label style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" name="ack"> Der Inhalt des Protokolls wurde gemeinsam durchgesehen und ist vollständig.</label>
   <div class="hint" style="margin-top:6px">Ort: <input name="place" value="${esc((objVal(objBy(c.objectId),"Adresse")||"").split(",").pop().trim().replace(/^\d+\s*/,""))}" style="width:200px;display:inline-block"></div>`,
  {wide:true,ok:"Unterschriften übernehmen",onOk:ov=>{
    if(!v(ov,"ack"))throw new Error("Bitte bestätigen, dass das Protokoll gemeinsam durchgesehen wurde.");
    const sigs=labels.map((l,i)=>{const cv=ov.querySelector(`[data-pad="${i}"]`);if(!cv._drawn)throw new Error(`Unterschrift fehlt: ${l}`);if(!v(ov,"n"+i).trim())throw new Error(`Bitte Namen angeben: ${l}`);
      return {label:l,name:v(ov,"n"+i).trim(),img:cv.toDataURL("image/png"),at:Date.now()}});
    p.sigs=sigs;p.place=v(ov,"place");p.status="signed";p.signMode="digital";p.signedAt=Date.now();cloudLock(p.id);
    setTimeout(async()=>{try{await storeSignedPdf(p);toast("Unterschriebenes PDF abgelegt")}catch(e){toast("PDF konnte nicht abgelegt werden: "+e.message)}askSend(pid)},200);
  }});
  ov.querySelectorAll("canvas[data-pad]").forEach(cv=>{const ctx=cv.getContext("2d");ctx.lineWidth=2.2;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#1b2a4a";let dn=false;
    const pos=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
    cv.addEventListener("pointerdown",e=>{dn=true;cv.setPointerCapture(e.pointerId);const[x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y)});
    cv.addEventListener("pointermove",e=>{if(!dn)return;const[x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();cv._drawn=true});
    cv.addEventListener("pointerup",()=>dn=false);cv.addEventListener("pointerleave",()=>dn=false)});
  ov.querySelectorAll("[data-clr]").forEach(b=>b.onclick=()=>{const cv=ov.querySelector(`[data-pad="${b.dataset.clr}"]`);cv.getContext("2d").clearRect(0,0,cv.width,cv.height);cv._drawn=false});
}
function askSend(pid){
  const p=DB.protocols.find(x=>x.id===pid),c=caseBy(p.caseId),mf=tenantMailField(),mail=mf?(c.data[mf.id]||""):"";
  const ov=modal("Protokoll an den Mieter senden?",`<p style="margin-top:0">Das unterschriebene Protokoll <b>${esc(p.no)}</b> kann direkt per E-Mail an den Mieter gehen.</p>
   <div class="form"><label>Mieter</label><div>${esc(fieldVal(c,"Neuer Mieter")||"–")}</div>
   <label class="req">E-Mail Mieter</label><div><input name="mail" type="email" value="${esc(mail)}" placeholder="name@beispiel.de">${mail?'<div class="hint">aus den Falldaten</div>':'<div class="hint" style="color:var(--warn)">Noch keine Adresse hinterlegt – wird beim Senden in den Falldaten gespeichert.</div>'}</div>
   <label>Einverständnis</label><label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" name="ok"> Der Mieter ist mit dem Versand per E-Mail einverstanden.</label></div>
   <div class="hint" style="margin-top:10px">Das E-Mail-Programm öffnet sich mit vorbereiteter Nachricht. Die PDF-Datei wird im Explorer markiert – bitte per Ziehen an die Mail anhängen.</div>`,
  {ok:"Jetzt senden",extra:`<button class="btn" data-x="no">Nicht senden</button>`,onOk:ov=>{
    const m=v(ov,"mail").trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m))throw new Error("Bitte eine gültige E-Mail-Adresse eingeben.");
    if(!v(ov,"ok"))throw new Error("Bitte das Einverständnis des Mieters bestätigen.");
    if(mf)c.data[mf.id]=m;p.sent={to:m,at:Date.now(),by:DB.ui.user};const D=DB.settings.design,o=objBy(c.objectId);
    api.mail({to:m,subject:`${p.kind==="Auszug"?D.docs.proto.titleOut:D.docs.proto.titleIn} – ${o.title}`,body:`Guten Tag,\n\nanbei erhalten Sie das unterschriebene Übergabeprotokoll ${p.no} zum Objekt ${o.title} (${objVal(o,"Adresse")||""}) vom ${dt(p.date)}.\n\nMit freundlichen Grüßen\n${ME().name}\n${D.company}`,attachRel:p.pdf?p.pdf.p:null}).catch(e=>toast(e.message));
    toast("E-Mail an "+m+" vorbereitet")}});
  ov.querySelector('[data-x=no]').onclick=()=>{ov.close();p.sendDeclined=Date.now();save();render();toast("Kein Versand – Protokoll ist abgelegt")};
}

/* ================= v0.4: Design-Import / -Export ================= */
const PRESETS={
  lugtiv:{format:"makler-design",version:1,name:"Lugtiv – Lugt Immobilien & Verwaltung",
    hinweis:"Firmendaten aus lugtiv.de (Startseite/Impressum). Logo bitte hochladen – die Hausfarbe wird dabei automatisch aus dem Logo übernommen.",
    design:{company:"Lugt Immobilien & Verwaltungs GmbH",address:"Altstadt 299\n84028 Landshut\n2. Obergeschoss",
      contact:"Tel. 0871 / 2 76 20 62\nFax 0871 / 3 19 19 66\ninfo@lugtiv.de · www.lugtiv.de",
      footer:"Lugt Immobilien & Verwaltungs GmbH · Geschäftsführerin: Sandra Lugt · Amtsgericht Landshut HRB 14860 · USt-IdNr. DE456231878\nErlaubnis nach § 34c GewO · Aufsicht: Stadt Landshut, Amt für öffentliche Ordnung · IHK für München und Oberbayern",
      logo:null,logoPos:"left",logoSize:"M",color:"#2f3b45",font:"segoe",header:"line",table:"lines",
      docs:{report:{title:"Leistungsnachweis",intro:"Für den unten genannten Vorgang haben wir folgende Leistungen für Sie erbracht.",showRates:true,showActivities:true,showNotes:true,closing:"Wir nehmen uns gerne Zeit für Sie. Bei Fragen erreichen Sie uns unter 0871 / 2 76 20 62.",sig:false},
        proto:{titleIn:"Wohnungsübergabeprotokoll – Einzug",titleOut:"Wohnungsübergabeprotokoll – Auszug",intro:"Die Mietsache wurde gemeinsam besichtigt und in folgendem Zustand übergeben:",
          legal:"Mit ihrer Unterschrift bestätigen die Parteien den dokumentierten Zustand der Mietsache, die Zählerstände sowie die Übergabe der aufgeführten Schlüssel. Weitere Mängel wurden nicht festgestellt.",
          sigLabels:"Vermieter / Verwaltung\nMieter\nLugt Immobilien & Verwaltungs GmbH",showDefects:true,onlyFilled:false}}}}
};
function exportDesign(){
  const ov=modal("Design exportieren",`<div class="form"><label>Name</label><input name="nm" value="${esc(DB.settings.design.company)}">
   <label>Inhalt</label><div><label style="display:flex;gap:8px"><input type="checkbox" checked disabled> Design, Firmendaten, Dokumenttexte${DB.settings.design.logo?" inkl. Logo":""}</label>
   <label style="display:flex;gap:8px;margin-top:4px"><input type="checkbox" name="tpl"> Übergabeprotokoll-Vorlage (Abschnitte, Räume, Zustände)</label></div></div>
   <textarea name="out" readonly style="min-height:150px;margin-top:12px;font-family:ui-monospace,Consolas,monospace;font-size:11.5px"></textarea>`,
  {ok:"Speichern unter …",extra:`<button class="btn" data-x="cp">${ic("doc")}Kopieren</button>`,onOk:ov=>{
    api.saveText({name:`design_${(v(ov,"nm")||"export").replace(/[^\wäöüÄÖÜß-]+/g,"_")}.json`,text:ov.querySelector("[name=out]").value}).then(f=>{if(f)toast("Exportiert: "+f)}).catch(e=>toast(e.message))}});
  const build=()=>{const o={format:"makler-design",version:1,name:v(ov,"nm"),exported:new Date().toISOString(),design:DB.settings.design};if(v(ov,"tpl"))o.protocol=DB.settings.protocol;ov.querySelector("[name=out]").value=JSON.stringify(o,null,1)};
  ov.querySelector("[name=nm]").oninput=build;ov.querySelector("[name=tpl]").onchange=build;build();
  ov.querySelector("[data-x=cp]").onclick=()=>{const t=ov.querySelector("[name=out]");t.select();(navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(()=>toast("In Zwischenablage kopiert"),()=>{document.execCommand("copy");toast("Kopiert")})};
}
function importDesign(preset){
  const ov=modal("Design importieren",`<div class="seg" style="margin-bottom:12px"><button class="on" type="button">Datei / Text</button></div>
   <div class="form"><label>Datei</label><label class="btn sm" style="justify-self:start">${ic("clip")}JSON-Datei wählen<input type="file" accept=".json,application/json" hidden name="file"></label>
   <label>oder Inhalt</label><textarea name="txt" style="min-height:120px;font-family:ui-monospace,Consolas,monospace;font-size:11.5px" placeholder='{"format":"makler-design", …}'>${preset?esc(JSON.stringify(PRESETS[preset],null,1)):""}</textarea>
   <label>Übernehmen</label><div><label style="display:flex;gap:8px"><input type="checkbox" name="kd" checked> Design & Texte</label><label style="display:flex;gap:8px;margin-top:4px"><input type="checkbox" name="kl" checked> Logo (falls enthalten, sonst bisheriges behalten)</label><label style="display:flex;gap:8px;margin-top:4px"><input type="checkbox" name="kp" checked> Protokollvorlage (falls enthalten)</label></div></div>
   <div class="hint" id="imphint" style="margin-top:8px"></div>`,
  {ok:"Importieren",onOk:ov=>{
    let o;try{o=JSON.parse(v(ov,"txt"))}catch(e){throw new Error("Kein gültiges JSON.")}
    if(o.format!=="makler-design"||!o.design)throw new Error("Unbekanntes Format – erwartet wird eine Exportdatei des Designers.");
    const cur=DB.settings.design,inc=o.design;
    if(v(ov,"kd")){const keepLogo=cur.logo;Object.assign(cur,{...seedDesign(),...inc,docs:{report:{...seedDesign().docs.report,...(inc.docs||{}).report},proto:{...seedDesign().docs.proto,...(inc.docs||{}).proto}}});
      if(!(v(ov,"kl")&&inc.logo))cur.logo=keepLogo}
    else if(v(ov,"kl")&&inc.logo)cur.logo=inc.logo;
    if(v(ov,"kp")&&o.protocol&&Array.isArray(o.protocol.sections))DB.settings.protocol=o.protocol;
    toast(`Importiert: ${o.name||"Design"}`+(inc.logo?"":" – Logo jetzt hochladen"))}});
  const showHint=()=>{try{const o=JSON.parse(v(ov,"txt"));ov.querySelector("#imphint").innerHTML=`<b>${esc(o.name||"")}</b>${o.hinweis?" · "+esc(o.hinweis):""}${o.protocol?" · enthält Protokollvorlage":""}`}catch(e){ov.querySelector("#imphint").textContent=""}};
  ov.querySelector("[name=txt]").oninput=showHint;showHint();
  ov.querySelector("[name=file]").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{ov.querySelector("[name=txt]").value=r.result;showHint()};r.readAsText(f)};
}
/* Hausfarbe aus Logo ermitteln: häufigste kräftige Farbe */
function dominantColor(cv){const ctx=cv.getContext("2d"),{data}=ctx.getImageData(0,0,cv.width,cv.height),bins={};
  for(let i=0;i<data.length;i+=16){const[r,g,b,a]=[data[i],data[i+1],data[i+2],data[i+3]];if(a<200)continue;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    if(mx>235&&mn>235)continue;if(mx<30)continue;if(mx-mn<28)continue;const k=(r>>4)+","+(g>>4)+","+(b>>4);bins[k]=(bins[k]||0)+1}
  const top=Object.entries(bins).sort((a,b)=>b[1]-a[1])[0];if(!top)return null;
  const[r,g,b]=top[0].split(",").map(x=>(+x<<4)+8);return "#"+[r,g,b].map(x=>Math.min(255,x).toString(16).padStart(2,"0")).join("")}


/* ================= Laufende Aktionen (bürweit) ================= */
let RUNF="all";
function runCard(e){const c=caseBy(e.caseId),a=actBy(c.type,e.actionId),o=objBy(c.objectId),u=userBy(e.userId);
  return `<div class="rcard ${e.pauseAt?"paused":""}" onclick="openRun('${e.id}')" style="--c:${u.color}">
   <div class="rtop">${av(e.userId)}<b>${esc(u.name)}</b>${e.userId===DB.ui.user?'<span class="tag grey">ich</span>':""}<span class="sp"></span><span class="tag ${e.pauseAt?"warn":"ok"}">${e.pauseAt?"Pause":"läuft"}</span></div>
   <div class="rmain"><div style="min-width:0"><div class="ra">${esc(a.name)}</div><div class="hint">${esc(svcBy(e.serviceId).name)}</div></div><div class="rclk clk" data-e="${e.id}">${hm(net(e))}</div></div>
   <div class="hint"><span class="tag ${c.type}">${c.no}</span> ${esc(c.title)}<br>${esc(o.no)} · ${esc(o.title)} · seit ${tm(e.start)}${isoD(e.start)!==isoD(Date.now())?" ("+dt(e.start)+")":""}</div>
   <div class="ract">${runCtl(e)}</div></div>`}
function vLaufend(){
  const all=running(),list=RUNF==="mine"?all.filter(e=>e.userId===DB.ui.user):all;
  const users=DB.settings.users.filter(u=>list.some(e=>e.userId===u.id));
  return `<div class="top"><h1>Laufende Aktionen</h1><div class="seg"><button class="${RUNF==="all"?"on":""}" onclick="RUNF='all';render()">Alle (${all.length})</button><button class="${RUNF==="mine"?"on":""}" onclick="RUNF='mine';render()">Meine (${all.filter(e=>e.userId===DB.ui.user).length})</button></div><div class="sp"></div><button class="btn pri" onclick="quick()">${ic("bolt")}Aktion erfassen</button></div>
   <div class="hint" style="margin:-6px 0 14px">Klick auf eine Karte öffnet den Fall. Pause, Leistungswechsel, Stopp und Bearbeiten funktionieren für alle Mitarbeiter; bei fremden Aktionen kommt eine Rückfrage.</div>
   ${list.length?users.map(u=>`<div class="ugroup"><h3>${av(u.id)} ${esc(u.name)} <span class="hint">${list.filter(e=>e.userId===u.id).length} aktiv</span></h3><div class="rgrid">${list.filter(e=>e.userId===u.id).map(runCard).join("")}</div></div>`).join("")
     :`<div class="card empty">Gerade läuft keine Aktion${RUNF==="mine"?" bei dir":""}.</div>`}`;
}

/* ================= v0.6: Fotos ================= */
function demoPhoto(text,col){try{const cv=document.createElement("canvas");cv.width=480;cv.height=360;const x=cv.getContext("2d");const g=x.createLinearGradient(0,0,480,360);g.addColorStop(0,col);g.addColorStop(1,"#e7e2da");x.fillStyle=g;x.fillRect(0,0,480,360);
  x.strokeStyle="rgba(255,255,255,.35)";x.lineWidth=2;for(let i=0;i<14;i++){x.beginPath();x.moveTo(i*40,360);x.lineTo(i*40+120,0);x.stroke()}
  x.fillStyle="rgba(0,0,0,.55)";x.fillRect(0,290,480,70);x.fillStyle="#fff";x.font="bold 24px Segoe UI, Arial";x.fillText(text,18,323);x.font="15px Segoe UI, Arial";x.fillText("Beispielfoto",18,346);return cv.toDataURL("image/jpeg",.7)}catch(e){return null}}
const ptgt=(p,sid,rid)=>{const s=p.sections.find(x=>x.id===sid);return rid?s.rooms.find(r=>r.id===rid).values:s.values};
const pById=pid=>DB.protocols.find(x=>x.id===pid);
function resizeImg(file,max=1000,q=.62){return new Promise(res=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const sc=Math.min(1,max/Math.max(im.width,im.height)),cv=document.createElement("canvas");
  cv.width=Math.round(im.width*sc);cv.height=Math.round(im.height*sc);cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);res(cv.toDataURL("image/jpeg",q))};im.onerror=()=>res(null);im.src=r.result};r.readAsDataURL(file)})}
async function addPhoto(pid,sid,rid,iid,inp){const p=pById(pid),t=ptgt(p,sid,rid||null);const files=[...inp.files];if(!files.length)return;
  const c=caseBy(p.caseId);
  for(const f of files){const d=await resizeImg(f,1600,.8);if(d){try{const rel=await api.writeImage({dataURL:d,rel:folderRel(c,c.type,{label:"Übergabeprotokoll"})+"/"+p.no+" Fotos"});t[iid]={...(t[iid]||{})};t[iid].photos=[...(t[iid].photos||[]),rel]}catch(e){toast("Foto konnte nicht gespeichert werden: "+e.message)}}}
  save();toast(files.length>1?`${files.length} Fotos hinzugefügt`:"Foto hinzugefügt");CAP?drawCap():render()}
function rmPhoto(pid,sid,rid,iid,k){if(!confirm("Foto entfernen?"))return;const t=ptgt(pById(pid),sid,rid||null);const x=t[iid].photos.splice(k,1)[0];if(x&&!String(x).startsWith("data:"))delFile(x).catch(()=>{});save();CAP?drawCap():render()}
function showImg(src,cap=""){const ov=document.createElement("div");ov.className="lightbox";ov.innerHTML=`<img src="${src}" alt="Foto"><div>${esc(cap)}</div>`;ov.onclick=()=>ov.remove();document.body.appendChild(ov)}
function photoCell(p,s,i,val,rid,lock,big){const ph=(val&&val.photos)||[];const a=`'${p.id}','${s.id}','${rid||""}','${i.id}'`;
  return `<div class="phs ${big?"big":""}">${ph.map((d,k)=>`<span class="ph"><img src="${psrc(d)}" alt="Foto ${k+1}" onclick="event.stopPropagation();showImg(this.src,'${esc(i.label).replace(/'/g,"")}')">${lock?"":`<button aria-label="Foto entfernen" onclick="event.stopPropagation();rmPhoto(${a},${k})">×</button>`}</span>`).join("")}
  ${lock?"":`<label class="cam" title="Foto aufnehmen / hochladen">${ic("plus",'style="width:14px"')}${big?"Foto":""}📷<input type="file" accept="image/*" capture="environment" multiple hidden onchange="addPhoto(${a},this)"></label>`}</div>`}

/* ================= v0.6: Touch-Erfassung im eigenen Fenster ================= */
let CAP=null;
function capPages(p){const pg=[];p.sections.forEach(s=>{if(s.type==="rooms")s.rooms.forEach(r=>pg.push({s,r,title:r.name,sub:s.title}));else pg.push({s,title:s.title,sub:PTYPES[s.type]})});pg.push({end:true,title:"Abschluss",sub:"Prüfen & unterschreiben"});return pg}
function pageStat(pg){if(pg.end)return null;const s=pg.s,vals=pg.r?pg.r.values:s.values;let t=0,d=0,def=0;
  if(s.type==="rooms"||s.type==="checklist")s.items.forEach(i=>{t++;if(vals[i.id]&&vals[i.id].z)d++;if(isDefect(vals[i.id]))def++});
  else if(s.type==="meters")s.items.forEach(i=>{t++;if(vals[i.id]&&vals[i.id].stand)d++});
  else if(s.type==="keys")s.items.forEach(i=>{t++;if(vals[i.id]&&vals[i.id].n!==undefined&&vals[i.id].n!=="")d++});
  else s.items.forEach(i=>{t++;if(vals[i.id])d++});return {t,d,def}}
function openCapture(pid,idx=0){const p=pById(pid);if(p.status==="signed"){toast("Protokoll ist unterschrieben und gesperrt");return}CAP={pid,idx,last:-1};drawCap()}
function closeCap(){CAP=null;const el=document.getElementById("cap");if(el)el.remove();document.body.style.overflow="";if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});render()}
function capGo(i){CAP.idx=i;drawCap()}
function capZ(sid,rid,iid,k){const p=pById(CAP.pid),t=ptgt(p,sid,rid||null),st=p.states[k];t[iid]={...(t[iid]||{}),z:(t[iid]&&t[iid].z===st)?"":st};save();drawCap()}
function capAllOk(sid,rid){const p=pById(CAP.pid),s=p.sections.find(x=>x.id===sid),t=ptgt(p,sid,rid||null);s.items.forEach(i=>{if(!t[i.id]||!t[i.id].z)t[i.id]={...(t[i.id]||{}),z:p.states[0]}});save();drawCap()}
function capKey(sid,iid,d){const p=pById(CAP.pid),t=ptgt(p,sid,null);const n=Math.max(0,(parseInt(t[iid]&&t[iid].n)||0)+d);t[iid]={...(t[iid]||{}),n:String(n)};save();drawCap()}
function capBool(sid,iid,val){const t=ptgt(pById(CAP.pid),sid,null);t[iid]=t[iid]===val?"":val;save();drawCap()}
function capRoomAdd(sid){const n=prompt("Name des zusätzlichen Raums:");if(!n||!n.trim())return;const p=pById(CAP.pid);const s=p.sections.find(x=>x.id===sid);s.rooms.push({id:uid(),name:n.trim(),values:{}});save();
  const pages=capPages(p);CAP.idx=pages.findIndex(x=>x.r&&x.r.name===n.trim());drawCap()}
function capFull(){const el=document.getElementById("cap");try{(document.fullscreenElement?document.exitFullscreen():el.requestFullscreen()).catch(()=>toast("Vollbild hier nicht verfügbar"))}catch(e){toast("Vollbild hier nicht verfügbar")}}
function drawCap(){
  const p=pById(CAP.pid);if(!p){closeCap();return}
  const c=caseBy(p.caseId),pages=capPages(p);CAP.idx=Math.max(0,Math.min(CAP.idx,pages.length-1));const pg=pages[CAP.idx],st=protoStats(p);
  let el=document.getElementById("cap");if(!el){el=document.createElement("div");el.id="cap";el.setAttribute("role","dialog");el.setAttribute("aria-label","Protokollerfassung");document.body.appendChild(el);document.body.style.overflow="hidden"}
  const keepScroll=CAP.last===CAP.idx?(el.querySelector(".capmain")||{}).scrollTop||0:0;CAP.last=CAP.idx;
  const dis="",s=pg.s,rid=pg.r?pg.r.id:"",vals=pg.r?pg.r.values:(s?s.values:{});
  let body="";
  if(pg.end){
    const defs=[];p.sections.forEach(sx=>{if(sx.type==="rooms")sx.rooms.forEach(r=>sx.items.forEach(i=>{if(isDefect(r.values[i.id]))defs.push([r.name,i.label,r.values[i.id]])}));if(sx.type==="checklist")sx.items.forEach(i=>{if(isDefect(sx.values[i.id]))defs.push([sx.title,i.label,sx.values[i.id]])})});
    const open=pages.filter(x=>!x.end).map((x,k)=>({x,k,st:pageStat(x)})).filter(o=>o.st.d<o.st.t);
    body=`<div class="capsum"><div class="kpi"><div class="l">Erfasst</div><div class="v">${st.done}/${st.tot}</div></div><div class="kpi"><div class="l">Mängel</div><div class="v" style="color:${st.def?"var(--bad)":"inherit"}">${st.def}</div></div><div class="kpi"><div class="l">Fotos</div><div class="v">${countPhotos(p)}</div></div></div>
     ${open.length?`<h3>Noch offen</h3><div class="capopen">${open.map(o=>`<button class="capbtn" onclick="capGo(${o.k})">${esc(o.x.title)} <span>${o.st.d}/${o.st.t}</span></button>`).join("")}</div>`:`<div class="banner" style="font-size:16px">${ic("check",'style="width:20px"')}Alle Punkte erfasst.</div>`}
     ${defs.length?`<h3>Mängel</h3>${defs.map(d=>`<div class="capdef"><b>${esc(d[0])} · ${esc(d[1])}</b><span>${esc(d[2].note||"ohne Beschreibung")}</span>${(d[2].photos||[]).map(x=>`<img src="${psrc(x)}" alt="Foto" onclick="showImg(this.src)">`).join("")}</div>`).join("")}`:""}
     <div class="capfinal"><button class="capbig ghost" onclick="printDoc(buildProtoDoc(pById('${p.id}')))">${ic("print",'style="width:22px"')}Druckvorschau</button><button class="capbig pri" onclick="const id=CAP.pid;closeCap();chooseSign(id)">${ic("edit",'style="width:22px"')}Fertig → Unterschrift</button></div>`;
  }else if(s.type==="rooms"||s.type==="checklist"){
    body=`<div class="capbar"><button class="capbtn ok" onclick="capAllOk('${s.id}','${rid}')">${ic("check",'style="width:20px"')}Alle übrigen „${esc(p.states[0])}“</button>${s.type==="rooms"?`<button class="capbtn" onclick="capRoomAdd('${s.id}')">${ic("plus",'style="width:20px"')}Raum hinzufügen</button>`:""}</div>`+
    s.items.map(i=>{const v=vals[i.id]||{};return `<div class="ci ${isDefect(v)?"def":""} ${v.z?"done":""}"><div class="cil">${esc(i.label)}</div>
      <div class="zb">${p.states.map((x,k)=>`<button class="z ${v.z===x?"on":""} ${/mängel|defekt|beschädigt/i.test(x)?"bad":k===0?"good":""}" onclick="capZ('${s.id}','${rid}','${i.id}',${k})">${esc(x)}</button>`).join("")}</div>
      <div class="crow"><input class="cin" data-pp="${p.id}" data-s="${s.id}" ${rid?`data-r="${rid}"`:""} data-i="${i.id}" data-k="note" value="${esc(v.note||"")}" placeholder="${isDefect(v)?"Mangel beschreiben …":"Bemerkung (optional)"}">${photoCell(p,s,i,v,rid,false,true)}</div></div>`}).join("");
  }else if(s.type==="meters"){
    body=s.items.map(i=>{const v=vals[i.id]||{};return `<div class="ci ${v.stand?"done":""}"><div class="cil">${esc(i.label)}</div>
      <div class="crow two2"><label>Zählernummer<input class="cin" data-pp="${p.id}" data-s="${s.id}" data-i="${i.id}" data-k="nr" value="${esc(v.nr||"")}"></label><label>Zählerstand<input class="cin" inputmode="decimal" data-pp="${p.id}" data-s="${s.id}" data-i="${i.id}" data-k="stand" value="${esc(v.stand||"")}"></label></div>
      <div class="crow">${photoCell(p,s,i,v,"",false,true)}<span class="hint">Foto vom Zähler als Nachweis</span></div></div>`}).join("");
  }else if(s.type==="keys"){
    body=s.items.map(i=>{const v=vals[i.id]||{},n=parseInt(v.n)||0;return `<div class="ci ${v.n!==undefined&&v.n!==""?"done":""}"><div class="crow"><div class="cil" style="flex:1">${esc(i.label)}</div>
      <div class="step2"><button onclick="capKey('${s.id}','${i.id}',-1)" aria-label="weniger">−</button><span>${v.n===undefined||v.n===""?"–":n}</span><button onclick="capKey('${s.id}','${i.id}',1)" aria-label="mehr">+</button></div></div>
      <input class="cin" data-pp="${p.id}" data-s="${s.id}" data-i="${i.id}" data-k="note" value="${esc(v.note||"")}" placeholder="Schlüsselnummer / Bemerkung"></div>`}).join("");
  }else{
    body=s.items.map(i=>{const v=vals[i.id]??"",at=`data-pp="${p.id}" data-s="${s.id}" data-i="${i.id}" data-k="v"`;
      return `<div class="ci ${v?"done":""}"><div class="cil">${esc(i.label)}</div>${i.ftype==="bool"?`<div class="zb"><button class="z ${v==="true"?"on good":""}" onclick="capBool('${s.id}','${i.id}','true')">Ja</button><button class="z ${v==="false"?"on":""}" onclick="capBool('${s.id}','${i.id}','false')">Nein</button></div>`
        :i.ftype==="textarea"?`<textarea class="cin" ${at} style="min-height:110px">${esc(v)}</textarea>`:i.ftype==="select"?`<select class="cin" ${at}><option></option>${i.options.split(";").map(o=>`<option ${o.trim()===v?"selected":""}>${esc(o.trim())}</option>`).join("")}</select>`
        :`<input class="cin" ${at} type="${i.ftype==="date"?"date":"text"}" value="${esc(v)}">`}</div>`}).join("");
  }
  el.innerHTML=`<div class="caphead"><button class="capx" onclick="closeCap()" aria-label="Schließen">${ic("x",'style="width:24px;height:24px"')}</button>
    <div class="capt"><b>${esc(p.kind)}sprotokoll · ${esc(p.no)}</b><span>${esc(c.title)}</span></div><div class="capprog"><span>${st.done}/${st.tot}${st.def?` · <b style="color:var(--bad)">${st.def} Mängel</b>`:""}</span><div class="progress"><i style="width:${st.pc}%"></i></div></div>
    <button class="capbtn" onclick="capFull()">⛶ Vollbild</button></div>
   <div class="capbody"><nav class="capnav">${pages.map((x,k)=>{const ps=pageStat(x);return `<button class="${k===CAP.idx?"on":""} ${ps&&ps.d===ps.t?"ok":""}" onclick="capGo(${k})"><span>${esc(x.title)}<small>${esc(x.sub)}</small></span>${ps?`<em>${ps.d===ps.t?"✓":ps.d+"/"+ps.t}${ps.def?` <b>!</b>`:""}</em>`:`<em>›</em>`}</button>`}).join("")}</nav>
    <div class="capmain"><div class="capttl"><h2>${esc(pg.title)}</h2><span>${esc(pg.sub)}</span></div>${body}</div></div>
   <div class="capfoot"><button class="capbig ghost" ${CAP.idx===0?"disabled":""} onclick="capGo(${CAP.idx-1})">◀ Zurück</button><span>${CAP.idx+1} / ${pages.length}</span><button class="capbig pri" ${CAP.idx===pages.length-1?"disabled":""} onclick="capGo(${CAP.idx+1})">Weiter ▶</button></div>`;
  const m=el.querySelector(".capmain");if(m)m.scrollTop=keepScroll;
  const nb=el.querySelector(".capnav button.on");if(nb)nb.scrollIntoView({block:"nearest",inline:"center"});
}
function countPhotos(p){let n=0;p.sections.forEach(s=>{const all=s.type==="rooms"?s.rooms.map(r=>r.values):[s.values];all.forEach(vs=>Object.values(vs).forEach(v=>{if(v&&v.photos)n+=v.photos.length}))});return n}
document.addEventListener("keydown",e=>{if(!CAP||document.querySelector(".ov,.lightbox,.pvov"))return;if(e.target.matches("input,textarea,select"))return;if(e.key==="Escape")closeCap();if(e.key==="ArrowRight")capGo(CAP.idx+1);if(e.key==="ArrowLeft")capGo(CAP.idx-1)});

/* ================= v0.6: Druckvorschau ================= */
function printDoc(html,name="Dokument.pdf"){
  document.querySelectorAll(".pvov").forEach(x=>x.remove());
  const ov=document.createElement("div");ov.className="pvov";
  ov.innerHTML=`<div class="pvbar"><b>Druckvorschau</b><span class="hint" style="color:#cbd5e1">A4 · so wird das Dokument gedruckt</span><span class="sp"></span>
   <button class="btn" data-z="-1" aria-label="Verkleinern">−</button><button class="btn" data-z="1" aria-label="Vergrößern">+</button>
   <button class="btn" data-x="pdf">${ic("doc")}Als PDF speichern</button><button class="btn pri" data-x="pr">${ic("print")}Drucken …</button><button class="btn" data-x="cl">${ic("x")}Schließen</button></div>
   <div class="pvscroll"><div class="pvsheet"><div class="pvinner">${html}</div></div></div>`;
  document.body.appendChild(ov);
  let zoom=Math.min(1,(innerWidth-80)/794);
  const lay=()=>{const sh=ov.querySelector(".pvsheet"),inn=ov.querySelector(".pvinner"),d=inn.firstElementChild;inn.style.transform=`scale(${zoom})`;sh.style.width=794*zoom+"px";
    const hgt=Math.max(d.scrollHeight,1123);sh.style.height=hgt*zoom+"px";sh.querySelectorAll(".pbreak").forEach(x=>x.remove());
    for(let k=1;k*1123<hgt;k++){const m=document.createElement("div");m.className="pbreak";m.style.top=k*1123*zoom+"px";m.textContent=`Seite ${k+1}`;sh.appendChild(m)}};
  lay();setTimeout(lay,120);
  ov.querySelectorAll("[data-z]").forEach(b=>b.onclick=()=>{zoom=Math.max(.35,Math.min(1.6,zoom+(+b.dataset.z)*.15));lay()});
  const close=()=>{ov.remove();document.removeEventListener("keydown",k)};const k=e=>{if(e.key==="Escape")close()};document.addEventListener("keydown",k);
  ov.querySelector("[data-x=cl]").onclick=close;
  ov.querySelector("[data-x=pr]").onclick=()=>printNative(html).catch(e=>toast(e.message));
  ov.querySelector("[data-x=pdf]").onclick=async()=>{try{const r=await savePdf(html,name,null,true);if(r)toast("PDF gespeichert: "+r.file)}catch(e){toast(e.message)}};
}

/* ================= Render ================= */
function render(){
  renderNav();renderDock();
  const f={laufend:vLaufend,start:vStart,objekte:vObjekte,objekt:vObjekt,faelle:vFaelle,fall:vFall,kalender:vKalender,zeiten:vZeiten,auswertung:MOBILE?vStart:vAuswertung,einstellungen:MOBILE?vGeraet:vEinst}[VIEW];
  $("main").innerHTML=f();
  if(VIEW==="einstellungen"&&SETTAB==="design")requestAnimationFrame(drawPreview);
  if(VIEW==="einstellungen"&&SETTAB!=="daten")BACKUPS=null;
  document.title=`Makler-Prozess ${ENV?ENV.version:""}${running().length?` · ${running().length} laufend`:""}`;
  if(FLASH&&VIEW==="fall"){const el=document.querySelector(`[data-eid="${FLASH}"]`);if(el)el.scrollIntoView({block:"center"});setTimeout(()=>{FLASH=null;document.querySelectorAll(".flash").forEach(x=>x.classList.remove("flash"))},1800)}
}
/* ================= App: Dateien & Pfade ================= */
const psrc=d=>!d?"":String(d).startsWith("data:")?d:MOBILE?PLATFORM.fileSrc(d):"mpfile://f/"+String(d).split("/").map(encodeURIComponent).join("/");
const fName=x=>typeof x==="string"?x:x.n;
function openRel(rel){api.openPath(rel).catch(e=>toast(e.message))}
function openFileRef(x){if(typeof x==="string"){toast("Ältere Referenz ohne Datei");return}api.openPath(x.p).catch(e=>toast(e.message))}
function fileChip(x,del){return `<span class="file" ${typeof x==="object"?`style="cursor:pointer" title="Öffnen" onclick='openFileRef(${JSON.stringify(x).replace(/'/g,"&#39;")})'`:""}>${ic("clip",'style="width:13px"')}${esc(fName(x))}${del||""}</span>`}
async function savePdf(html,name,rel,open){
  const pa=document.getElementById("printarea");pa.innerHTML=html;document.body.classList.add("pp");
  await new Promise(r=>setTimeout(r,150));
  try{return await api.pdf({name:name.replace(/[\\/:*?"<>|]+/g,"_"),rel,open})}finally{document.body.classList.remove("pp")}
}
async function printNative(html){const pa=document.getElementById("printarea");pa.innerHTML=html;document.body.classList.add("pp");await new Promise(r=>setTimeout(r,150));
  try{await api.print()}finally{document.body.classList.remove("pp")}}
async function storeSignedPdf(p){const c=caseBy(p.caseId),f=DB.settings.fields.rent.find(x=>x.label==="Übergabeprotokoll");
  const rel=folderRel(c,c.type,f||{label:"Übergabeprotokoll"});
  const r=await savePdf(buildProtoDoc(p),`${p.no}_${p.kind}_digital_signiert.pdf`,rel,false);
  const ref={n:r.file.split(/[\\/]/).pop(),p:r.rel};p.signed=[...p.signed,ref];p.pdf=ref;
  if(f)c.files[f.id]=[...(c.files[f.id]||[]),ref];save();render();return ref}

/* ================= App: Start ================= */
let SESSION=null;
async function boot(){
  try{ENV=await api.load()}catch(e){document.getElementById("main").innerHTML=`<div class="card" style="margin:40px"><h2>Daten konnten nicht geladen werden</h2><p>${esc(e.message)}</p><p class="hint">Unter Einstellungen → Daten & Sicherung lässt sich eine Sicherung wiederherstellen.</p></div>`;return}
  api.onBeforeClose(()=>{flush()});
  window.addEventListener("beforeunload",()=>{flush()});
  if(MOBILE)document.body.classList.add("mobile");
  if(!ENV.db){MOBILE?mobileWelcome():wizard();return}
  DB=ENV.db;migrate();
  if(ENV.autoBackup&&!ENV.autoBackup.error)setTimeout(()=>toast("Tägliche Sicherung erstellt"),600);
  if(ENV.autoBackup&&ENV.autoBackup.error)setTimeout(()=>toast("Automatische Sicherung fehlgeschlagen: "+ENV.autoBackup.error),600);
  if(DB.settings.authMode==="pin"||MOBILE){if(MOBILE)render();loginScreen()}else render();
  if(typeof cloudBoot==="function")cloudBoot();
  if(MOBILE)mobileInit();
}
function emptyDB(name,short){const st=seedSettings();st.users=[{id:"u1",name,short,role:"admin",color:"#2563eb"}];
  return {settings:st,objects:[],cases:[],entries:[],tasks:[],protocols:[],ui:{user:"u1"},meta:{created:Date.now(),demo:false}}}
function demoDB(name,short){const d=seed();const u=d.settings.users[0];u.name=name;u.short=short;
  d.meta={created:Date.now(),demo:true,demoIds:{objects:d.objects.map(x=>x.id),cases:d.cases.map(x=>x.id),users:["u2","u3"]}};return d}
function wizard(){
  const W={step:1,dir:ENV.cfg.defaultData,check:null,start:"leer",name:"",short:""};
  const el=document.createElement("div");el.className="wiz";document.body.appendChild(el);
  const draw=()=>{el.innerHTML=`<div class="wizbox"><div class="wizhead"><div class="lg big">${ic("home",'style="width:26px;height:26px"')}</div><div><h1>Willkommen bei Makler-Prozess</h1><span class="hint">Version ${ENV.version} · Einrichtung in 3 Schritten</span></div></div>
   <div class="steps" style="margin:16px 0">${["Datenordner","Start","Benutzer"].map((s,i)=>`<div class="step ${i+1<W.step?"done":i+1===W.step?"cur":""}" style="cursor:default"><b>${i+1}</b>${s}</div>`).join("")}</div>
   ${W.step===1?`<p>Wo sollen die Daten gespeichert werden? Hier liegen die Datenbank (<code>daten.json</code>) sowie alle Fotos und Anhänge im Unterordner <code>dateien</code>.</p>
     <div class="path" style="font-size:14px;padding:10px">${esc(W.dir)}</div>
     <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" data-a="pick">${ic("folder")}Anderen Ordner wählen …</button><span class="sp"></span><button class="btn" data-a="join">${ic("swap")}Bestehendem Büro (Cloud) beitreten …</button></div>
     ${W.check?W.check.writable?(W.check.hasData?`<div class="banner" style="margin-top:12px">${ic("check",'style="width:16px"')}In diesem Ordner liegen bereits Daten. Sie werden übernommen.</div>`:`<div class="hint" style="margin-top:10px;color:var(--ok)">✓ Ordner ist beschreibbar.</div>`):`<div class="err" style="margin-top:10px">Ordner nicht beschreibbar: ${esc(W.check.error||"")}</div>`:""}
     <p class="hint" style="margin-top:14px">Empfehlung für jetzt: lokal (Einzelplatz). Später lässt sich der Ordner unter Einstellungen → Daten & Sicherung auf eine NAS-Freigabe umziehen.</p>`
   :W.step===2?`<p>Womit möchtest du starten?</p><div class="choice"><button data-s="leer" class="${W.start==="leer"?"sel":""}">${ic("doc",'style="width:24px;height:24px"')}<b>Leer starten</b><span>Nur die Vorlagen: Erfassungsfelder, Aktionen, Leistungskatalog, Übergabeprotokoll und Design.</span></button>
     <button data-s="demo" class="${W.start==="demo"?"sel":""}">${ic("cases",'style="width:24px;height:24px"')}<b>Mit Beispieldaten</b><span>Objekte, Fälle, Zeiten, Termine und Protokolle zum Ausprobieren. Später unter Einstellungen mit einem Klick entfernbar.</span></button></div>`
   :`<p>Wer arbeitet mit der App? Du wirst als <b>Admin</b> angelegt. Weitere Mitarbeiter unter Einstellungen → Mitarbeiter.</p>
     <div class="form"><label>Name</label><input name="wn" value="${esc(W.name)}" placeholder="Vorname Nachname"><label>Kürzel</label><input name="ws" maxlength="3" value="${esc(W.short)}" placeholder="z. B. AH" style="max-width:100px"></div>`}
   <div class="err" id="werr"></div>
   <div class="wizfoot">${W.step>1?`<button class="btn" data-a="back">Zurück</button>`:""}<span class="sp"></span><button class="btn pri big2" data-a="next">${W.step<3?"Weiter":"Fertig – loslegen"}</button></div></div>`;
   el.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{W.start=b.dataset.s;draw()});
   const jn=el.querySelector("[data-a=join]");if(jn)jn.onclick=async()=>{const err=el.querySelector("#werr");err.textContent="";try{W.check=await api.checkFolder(W.dir);if(!W.check.writable){draw();return}
     if(W.check.hasData)throw new Error("Im gewählten Ordner liegen bereits Daten – bitte einen leeren Ordner wählen oder normal fortfahren.");
     await api.setup({dataDir:W.dir});ENV=await api.load();el.remove();cloudWizard("join",{first:true})}catch(e){err.textContent=e.message}};
   const pk=el.querySelector("[data-a=pick]");if(pk)pk.onclick=async()=>{const d=await api.pickFolder("Datenordner wählen",W.dir);if(d){W.dir=d;W.check=await api.checkFolder(d);draw()}};
   const bk=el.querySelector("[data-a=back]");if(bk)bk.onclick=()=>{W.step--;draw()};
   el.querySelector("[data-a=next]").onclick=async()=>{const err=el.querySelector("#werr");err.textContent="";
     try{
      if(W.step===1){W.check=await api.checkFolder(W.dir);if(!W.check.writable){draw();return}
        if(W.check.hasData){await api.setup({dataDir:W.dir});location.reload();return}W.step=2;draw();return}
      if(W.step===2){W.step=3;draw();setTimeout(()=>{const i=el.querySelector("[name=wn]");i&&i.focus()},50);return}
      W.name=el.querySelector("[name=wn]").value.trim();W.short=(el.querySelector("[name=ws]").value.trim()||W.name.split(/\s+/).map(x=>x[0]||"").join("")).toUpperCase().slice(0,3);
      if(!W.name)throw new Error("Bitte einen Namen eingeben.");
      await api.setup({dataDir:W.dir});ENV=await api.load();
      DB=W.start==="demo"?demoDB(W.name,W.short):emptyDB(W.name,W.short);migrate();await api.save(JSON.stringify(DB));
      el.remove();render();toast("Eingerichtet – Daten in "+W.dir);setTimeout(()=>help("erste-schritte"),700);
     }catch(e){err.textContent=e.message}};
  };draw();
}

/* ================= App: Anmeldung ================= */
function renderUserbox(){
  const u=ME();const vb=document.getElementById("verbox");if(vb&&ENV)vb.innerHTML=`Version ${ENV.version}<br>${esc(ENV.cfg.dataDir||"")}`;
  if(DB.settings.authMode==="pin")$("#userbox").innerHTML=`<span>Angemeldet</span><div style="display:flex;align-items:center;gap:8px">${av(u.id)}<b style="flex:1;font-size:13px">${esc(u.name)}</b><button class="btn sm" onclick="logout()">Abmelden</button></div>`;
  else $("#userbox").innerHTML=`<span>Benutzer</span><select onchange="DB.ui.user=this.value;save();render()">${DB.settings.users.map(x=>`<option value="${x.id}" ${x.id===DB.ui.user?"selected":""}>${esc(x.name)}${x.role==="admin"?" · Admin":""}</option>`).join("")}</select>`;
}
function logout(){flush();SESSION=null;loginScreen()}
function lockNow(){if(!SESSION&&document.querySelector(".login"))return;flush();SESSION=null;document.querySelectorAll(".pop").forEach(x=>x.remove());loginScreen()}
function loginScreen(){
  document.querySelectorAll(".login").forEach(x=>x.remove());
  const el=document.createElement("div");el.className="wiz login";document.body.appendChild(el);let sel=null,pin="",first=null;
  const draw=(msg="")=>{el.innerHTML=`<div class="wizbox" style="width:min(560px,94vw)"><div class="wizhead"><div class="lg big">${ic("lock",'style="width:24px;height:24px"')}</div><div><h1>Anmelden</h1><span class="hint">Makler-Prozess ${ENV.version}</span></div></div>
    ${!sel?`${msg?`<div class="err" style="margin-bottom:10px">${esc(msg)}</div>`:""}<div class="utiles">${DB.settings.users.map(u=>`<button data-u="${u.id}"><span class="av" style="--c:${u.color};width:44px;height:44px;font-size:16px">${esc(u.short)}</span><b>${esc(u.name)}</b><span class="hint">${u.role==="admin"?"Admin":"Mitarbeiter"}</span></button>`).join("")}</div>`
    :`<div style="text-align:center"><div>${av(sel.id)} <b>${esc(sel.name)}</b></div><div class="pindots">${[0,1,2,3,4,5].map(i=>`<i class="${i<pin.length?"on":""}"></i>`).join("")}</div><div class="${sel.pinHash?"err":"hint"}">${esc(msg)}</div>
      <div class="pinpad">${[1,2,3,4,5,6,7,8,9,"←",0,"OK"].map(k=>`<button data-k="${k}">${k}</button>`).join("")}</div><button class="btn sm" data-a="other" style="margin-top:10px">Anderer Benutzer</button></div>`}</div>`;
    el.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{sel=DB.settings.users.find(u=>u.id===b.dataset.u);pin="";first=null;
      if(!sel.pinHash&&!(MOBILE&&(DB.ui.pinSetup||DB.ui.pinSetupAll))){const s=sel;sel=null;draw(`Für ${s.name} ist noch keine PIN vergeben. Bitte am PC unter Einstellungen → Mitarbeiter eine PIN festlegen.`);return}
      draw(!sel.pinHash?"Neue PIN festlegen (4–6 Ziffern), dann OK":"")});
    const o=el.querySelector("[data-a=other]");if(o)o.onclick=()=>{sel=null;draw()};
    el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>key(b.dataset.k));
  };
  const key=async k=>{if(!sel)return;if(k==="←")pin=pin.slice(0,-1);else if(k==="OK"){await check();return}else if(/^\d$/.test(k)&&pin.length<6)pin+=k;draw(sel.pinHash?"":first?"PIN wiederholen":"Neue PIN festlegen (4–6 Ziffern), dann OK");if(pin.length===6&&sel.pinHash)check()};
  const check=async()=>{
    if(!sel.pinHash){if(pin.length<4){draw("Mindestens 4 Ziffern");return}
      if(!first){first=pin;pin="";draw("PIN wiederholen");return}
      if(first!==pin){first=null;pin="";draw("PINs stimmen nicht überein – bitte neu festlegen");return}
      sel.pinHash=await api.hash(pin+":"+sel.id);delete DB.ui.pinSetup;save();toast("PIN gespeichert")}
    const h=await api.hash(pin+":"+sel.id);if(h===sel.pinHash){SESSION=sel.id;DB.ui.user=sel.id;DB.ui.chosen=1;save();el.remove();document.removeEventListener("keydown",kd);LASTACT=Date.now();render();toast("Willkommen, "+sel.name.split(" ")[0])}else{pin="";draw("PIN falsch")}};
  const kd=e=>{if(!el.isConnected)return document.removeEventListener("keydown",kd);if(/^\d$/.test(e.key))key(e.key);if(e.key==="Backspace")key("←");if(e.key==="Enter")key("OK")};document.addEventListener("keydown",kd);
  draw();
}
function setAuth(on){
  if(on){const miss=DB.settings.users.filter(u=>!u.pinHash);if(miss.length){toast("Erst allen Mitarbeitern eine PIN geben: "+miss.map(u=>u.short).join(", "));render();return}
    DB.settings.authMode="pin";SESSION=DB.ui.user;toast("Anmeldung mit PIN aktiv – gilt ab dem nächsten Start bzw. nach Abmelden")}
  else{DB.settings.authMode="select";toast("Anmeldung per Benutzerauswahl")}
  save();render()}

/* ================= App: Daten & Sicherung ================= */
const fsize=b=>b>1048576?(b/1048576).toLocaleString("de-DE",{maximumFractionDigits:1})+" MB":Math.max(1,Math.round(b/1024))+" KB";
let BACKUPS=null;
async function loadBackups(){try{BACKUPS=await api.listBackups()}catch(e){BACKUPS=[]}if(VIEW==="einstellungen"&&SETTAB==="daten")render()}
function vDaten(){
  const c=ENV.cfg;if(BACKUPS===null)loadBackups();
  return `${typeof vCloudCard==="function"?vCloudCard():""}<div class="two"><div>
   <div class="card"><h2>${ic("folder",'style="width:17px"')}Datenspeicher</h2><div class="form"><label>Datenordner</label><div><div class="path">${esc(c.dataDir)}</div><div class="hint">daten.json + Unterordner „dateien“ (Fotos, Anhänge, PDFs)</div></div></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" onclick="openRel('@data')">${ic("folder")}Ordner öffnen</button><button class="btn" onclick="moveDataDlg()">${ic("swap")}Speicherort ändern / Umziehen …</button></div>
    <div class="hint" style="margin-top:10px">Für den späteren Mehrplatzbetrieb den Ordner auf eine NAS-Freigabe umziehen, z. B. <code>\\\\NAS\\Makler\\Daten</code>.</div></div>
   <div class="card"><h2>${ic("lock",'style="width:17px"')}Sicherung</h2><div class="form"><label>Sicherungsordner</label><div><div class="path">${esc(c.backupDirEff||"")}</div><div class="hint">Am besten auf einem anderen Laufwerk als die Daten.</div></div>
     <label>Automatisch</label><label class="switch2"><input type="checkbox" class="sw" ${c.autoBackup?"checked":""} onchange="setCfg({autoBackup:this.checked})"> täglich beim ersten Start</label>
     <label>Aufbewahren</label><div><input type="number" min="3" max="90" value="${c.keep||14}" style="width:90px" onchange="setCfg({keep:+this.value||14})"> automatische Sicherungen</div></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn pri" onclick="doBackup()">${ic("down")}Jetzt vollständig sichern</button><button class="btn" onclick="doRestore()">${ic("up")}Aus Datei wiederherstellen …</button>
     <button class="btn" onclick="pickBackupDir()">${ic("folder")}Sicherungsordner ändern</button><button class="btn" onclick="openRel('@backup')">Öffnen</button></div>
    <div class="hint" style="margin-top:10px">Eine Vollsicherung ist eine ZIP-Datei mit allen Daten, Einstellungen, Vorlagen, Design, Fotos und Anhängen. Vor jeder Wiederherstellung wird der aktuelle Stand automatisch gesichert.</div></div>
   ${DB.meta&&DB.meta.demo?`<div class="card"><h2>Beispieldaten</h2><p class="hint">Die App wurde mit Beispieldaten eingerichtet. Diese lassen sich gezielt entfernen; eigene Daten bleiben erhalten.</p><button class="btn danger" onclick="removeDemo()">${ic("trash")}Beispieldaten entfernen</button></div>`:""}
  </div><div class="card"><h2>Vorhandene Sicherungen<span class="sp"></span><button class="btn sm" onclick="loadBackups()">Aktualisieren</button></h2>
   ${BACKUPS===null?'<div class="empty">Lade …</div>':BACKUPS.length?`<table><tr><th>Datum</th><th>Art</th><th class="r">Größe</th><th></th></tr>${BACKUPS.map(b=>`<tr><td>${dt(b.time)} ${tm(b.time)}</td><td><span class="tag ${b.kind==="auto"?"grey":b.kind==="manuell"?"sale":"warn"}">${esc(b.kind)}</span></td><td class="r">${fsize(b.size)}</td><td class="r"><button class="btn sm" data-f="${esc(b.file)}" onclick="doRestore(this.dataset.f)">Wiederherstellen</button></td></tr>`).join("")}</table>`:'<div class="empty">Noch keine Sicherung vorhanden.</div>'}</div></div>`;
}
async function setCfg(p){try{ENV.cfg={...ENV.cfg,...await api.setCfg(p)};toast("Gespeichert")}catch(e){toast(e.message)}render()}
async function pickBackupDir(){const d=await api.pickFolder("Sicherungsordner wählen",ENV.cfg.backupDirEff);if(!d)return;const ch=await api.checkFolder(d);if(!ch.writable){toast("Ordner nicht beschreibbar");return}await setCfg({backupDir:d});BACKUPS=null;render()}
async function doBackup(){await flush();toast("Sicherung läuft …");try{const r=await api.backup();toast(`Gesichert: ${r.file.split(/[\\/]/).pop()} (${fsize(r.size)})`);BACKUPS=null;render()}catch(e){toast("Sicherung fehlgeschlagen: "+e.message)}}
async function doRestore(file){
  if(!confirm(`Wirklich wiederherstellen?\n\nDer aktuelle Stand wird vorher automatisch gesichert und danach durch ${file?"diese Sicherung":"die gewählte Sicherung"} ersetzt.${ENV.cfg.mode==="cloud"?"\n\nACHTUNG Cloud-Sync: Der wiederhergestellte Stand wird als neuester Büro-Stand an alle Geräte verteilt. Seit der Sicherung angelegte Daten werden dabei überall entfernt.":""}`))return;
  await flush();SAVEBLOCK=true;
  try{const r=await api.restore(file||null);if(!r){SAVEBLOCK=false;return}alert(`Wiederhergestellt (Sicherung vom ${dt(r.meta.created)} ${tm(r.meta.created)}, Version ${r.meta.version}).\n\nDie App wird neu geladen.`);location.reload()}
  catch(e){SAVEBLOCK=false;toast("Wiederherstellung fehlgeschlagen: "+e.message)}}
function moveDataDlg(){
  let target=null,check=null;
  const ov=modal("Speicherort ändern",`<p style="margin-top:0">Aktuell: <span class="path">${esc(ENV.cfg.dataDir)}</span></p><button class="btn" data-x="pick">${ic("folder")}Neuen Ordner wählen …</button><div id="mvinfo" style="margin-top:12px"></div>
   <div class="form" style="margin-top:12px"><label>Vorgehen</label><div><label style="display:flex;gap:8px"><input type="radio" name="mode" value="copy" checked> Daten mitnehmen (kopieren – der alte Ordner bleibt als Kopie bestehen)</label>
   <label style="display:flex;gap:8px;margin-top:4px"><input type="radio" name="mode" value="use"> Dort vorhandene Daten verwenden (z. B. gemeinsamer NAS-Ordner)</label></div></div>
   <div class="hint" style="margin-top:8px">Vorher wird automatisch eine Sicherung erstellt. Danach lädt die App neu.</div>`,
  {ok:"Umziehen",onOk:ov=>{if(!target)throw new Error("Bitte zuerst einen Ordner wählen.");if(!check.writable)throw new Error("Ordner nicht beschreibbar.");
    (async()=>{await flush();SAVEBLOCK=true;try{await api.moveData({target,mode:v(ov,"mode")});alert("Speicherort geändert:\n"+target+"\n\nDie App wird neu geladen.");location.reload()}catch(e){SAVEBLOCK=false;toast(e.message)}})();}});
  ov.querySelector("[data-x=pick]").onclick=async()=>{const d=await api.pickFolder("Neuen Datenordner wählen",ENV.cfg.dataDir);if(!d)return;target=d;check=await api.checkFolder(d);
    ov.querySelector("#mvinfo").innerHTML=`<div class="path">${esc(d)}</div><div class="hint" style="color:${check.writable?"var(--ok)":"var(--bad)"}">${check.writable?"✓ beschreibbar":"nicht beschreibbar"}${check.hasData?" · enthält bereits Daten":" · leer"}</div>`;
    if(check.hasData)ov.querySelector("[name=mode][value=use]").checked=true};
}
function removeDemo(){
  const ids=DB.meta.demoIds||{};if(!confirm("Alle Beispiel-Objekte, -Fälle, -Zeiten, -Termine und -Protokolle entfernen?"))return;
  const cs=new Set(ids.cases||[]);
  DB.entries=DB.entries.filter(e=>!cs.has(e.caseId));DB.tasks=DB.tasks.filter(t=>!cs.has(t.caseId));DB.protocols=DB.protocols.filter(p=>!cs.has(p.caseId));
  DB.cases=DB.cases.filter(c=>!cs.has(c.id));DB.objects=DB.objects.filter(o=>!(ids.objects||[]).includes(o.id));
  (ids.users||[]).forEach(u=>{if(!DB.entries.some(e=>e.userId===u)&&u!==DB.ui.user)DB.settings.users=DB.settings.users.filter(x=>x.id!==u)});
  DB.meta.demo=false;save();render();toast("Beispieldaten entfernt")}
function vInfo(){
  return `<div class="two"><div class="card"><h2>Makler-Prozess</h2><div class="ro"><span>Version</span><span><b>${ENV.version}</b></span><span>Datenordner</span><span>${esc(ENV.cfg.dataDir)}</span><span>Anmeldung</span><span>${DB.settings.authMode==="pin"?"Mitarbeiter + PIN":"Benutzerauswahl"}</span>
   <span>Computer</span><span>${esc(ENV.host)} · ${esc(ENV.user)}</span><span>Datenstand</span><span>${DB.objects.length} Objekte · ${DB.cases.length} Fälle · ${DB.entries.length} Zeitbuchungen · ${DB.protocols.length} Protokolle</span></div>
   <div style="display:flex;gap:8px;margin-top:14px"><button class="btn pri" onclick="help()">${ic("doc")}Hilfe öffnen</button><button class="btn" onclick="api.openManual().catch(e=>toast(e.message))">${ic("print")}Vollständige Anleitung</button></div></div>
   <div class="card"><h2>Tastenkürzel</h2><div class="ro"><span>F1</span><span>Hilfe zur aktuellen Seite</span><span>Esc</span><span>Dialog / Fenster schließen</span><span>← →</span><span>Seiten in der Protokoll-Erfassung</span><span>Strg + P</span><span>Druckvorschau im Fall (Leistungsnachweis)</span></div></div></div>`;
}

/* ================= App: Hilfe-Overlay ================= */
function helpTopic(){if(CAP)return "erfassung";if(VIEW==="fall")return TAB==="proto"?"protokoll":TAB==="abr"?"abrechnung":"fall";
  if(VIEW==="einstellungen"&&MOBILE)return "tablet";
  if(VIEW==="einstellungen")return SETTAB==="daten"?(ENV&&ENV.cfg.mode==="cloud"?"cloud":"sicherung"):SETTAB==="design"?"design":SETTAB==="proto"?"vorlage":"einstellungen";
  return {start:"start",laufend:"laufend",objekte:"objekte",objekt:"objekte",faelle:"faelle",kalender:"termine",zeiten:"zeiten",auswertung:"auswertung"}[VIEW]||"erste-schritte"}
function help(topic){
  document.querySelectorAll(".helpov").forEach(x=>x.remove());
  let cur=topic||helpTopic();
  const el=document.createElement("div");el.className="helpov";document.body.appendChild(el);
  const draw=()=>{const t=HELP.find(x=>x.id===cur)||HELP[0];
    el.innerHTML=`<div class="helpbg"></div><aside class="helpdr" role="dialog" aria-label="Hilfe"><div class="helphd"><b>Hilfe</b><span class="hint">Makler-Prozess ${ENV?ENV.version:""}</span><span class="sp"></span><button class="ib solid" data-x="c" aria-label="Schließen">${ic("x")}</button></div>
     <div class="helpbody"><nav>${HELP.map(x=>`<button class="${x.id===cur?"on":""}" data-t="${x.id}">${esc(x.title)}</button>`).join("")}<button data-m="1" style="margin-top:10px">${ic("print",'style="width:14px"')} Vollständige Anleitung</button></nav>
     <article><h2>${esc(t.title)}</h2>${t.shot?`<img class="hshot" src="help/${t.shot}.jpg" alt="Screenshot ${esc(t.title)}" onclick="showImg(this.src)" onerror="this.remove()">`:""}${t.html}</article></div></aside>`;
    el.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{cur=b.dataset.t;draw()});
    el.querySelector("[data-m]").onclick=()=>api.openManual().catch(e=>toast(e.message));
    el.querySelector("[data-x=c]").onclick=close;el.querySelector(".helpbg").onclick=close};
  const close=()=>{el.remove();document.removeEventListener("keydown",k)};const k=e=>{if(e.key==="Escape")close()};document.addEventListener("keydown",k);draw();
}
document.addEventListener("keydown",e=>{if(e.key==="F1"){e.preventDefault();help()}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="p"&&VIEW==="fall"&&DB){e.preventDefault();const c=caseBy(ARG);if(c)printReport(c.id)}});

/* ================= Tablet (Android-App / Browser-App) ================= */
let LASTACT=Date.now(),HIDDENAT=0,STOREINFO=null;
const LOCK_MS=()=>window.MP_LOCK_MS||10*60000;
function mobileWelcome(){
  const el=document.createElement("div");el.className="wiz";document.body.appendChild(el);
  el.innerHTML=`<div class="wizbox"><div class="wizhead"><div class="lg big">${ic("home",'style="width:26px;height:26px"')}</div><div><h1>Makler-Prozess auf dem Tablet</h1><span class="hint">Version ${ENV.version} · ${PLATFORM.native?"Android-App":"Browser-App"}</span></div></div>
   <p>Das Tablet arbeitet mit dem <b>Büro-Stand aus der Cloud</b> – auch offline. Änderungen werden abgeglichen, sobald wieder Verbindung besteht.</p>
   <div class="choice"><button data-a="join">${ic("swap",'style="width:24px;height:24px"')}<b>Bestehendem Büro beitreten</b><span>Nextcloud oder OneDrive, Büro-Passwort vom PC. Danach eigenen Mitarbeiter wählen und PIN festlegen.</span></button>
   <button data-a="demo">${ic("cases",'style="width:24px;height:24px"')}<b>Ausprobieren mit Beispieldaten</b><span>Nur auf diesem Gerät, ohne Cloud. Später über „Gerät → Gerät zurücksetzen“ entfernbar.</span></button></div>
   <p class="hint" style="margin-top:14px">Das Büro wird am PC eingerichtet (Einstellungen → Daten &amp; Sicherung → Cloud-Sync einrichten). <a href="#" data-a="doc">Anleitung Tablet</a></p></div>`;
  el.querySelector("[data-a=join]").onclick=()=>{el.remove();cloudWizard("join",{first:true})};
  el.querySelector("[data-a=doc]").onclick=e=>{e.preventDefault();api.openManual()};
  el.querySelector("[data-a=demo]").onclick=async()=>{DB=demoDB("Demo Benutzer","DB");DB.ui.pinSetupAll=1;migrate();await api.save(JSON.stringify(DB));location.reload()};
}
function mobileInit(){
  ["pointerdown","keydown","touchstart","wheel"].forEach(ev=>document.addEventListener(ev,()=>{LASTACT=Date.now()},{passive:true,capture:true}));
  setInterval(()=>{if(SESSION&&Date.now()-LASTACT>LOCK_MS())lockNow()},5000);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden"){HIDDENAT=Date.now();return}
    if(SESSION&&HIDDENAT&&Date.now()-HIDDENAT>LOCK_MS())lockNow();HIDDENAT=0;
    if(typeof cloudSync==="function"&&typeof SY!=="undefined"&&SY.on)cloudSync("fortsetzen")});
  PLATFORM.onBack(()=>{ // Android-Zurück-Taste: oberstes Fenster schließen, sonst zur Startseite
    const top=[...document.querySelectorAll(".lightbox,.docov,.pvov,.helpov,.ov,.pop")].pop();
    if(top){const x=top.querySelector("[data-x=c],[data-x=cl],.docbar button");if(x)x.click();else top.remove();return}
    if(CAP&&document.getElementById("cap")){flush();closeCap();render();return}
    if(document.querySelector(".wiz"))return;
    if(VIEW==="fall"){go("faelle");return}if(VIEW==="objekt"){go("objekte");return}
    if(VIEW!=="start"){go("start");return}
    PLATFORM.exitApp()});
}
async function loadStoreInfo(){try{STOREINFO=await PLATFORM.storageInfo()}catch(e){STOREINFO={}}if(VIEW==="einstellungen")render()}
function vGeraet(){
  if(!STOREINFO){loadStoreInfo();STOREINFO={}}
  const si=STOREINFO,u=ME(),cl=ENV.cfg.mode==="cloud",pend=typeof SY!=="undefined"&&SY.state?SY.state.outbox.length:0;
  const mb=b=>b==null?"–":fsize(b);
  return `<div class="top"><h1>Gerät</h1><span class="hint">${PLATFORM.native?"Android-App":"Browser-App (PWA)"} · Version ${ENV.version}</span></div>
   ${vCloudCard()}
   <div class="two" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
    <div class="card"><h2>${ic("lock",'style="width:17px"')}Anmeldung</h2><div class="ro"><span>Angemeldet</span><span>${av(u.id)} <b>${esc(u.name)}</b></span><span>Sperre</span><span>mit PIN · automatisch nach ${Math.round(LOCK_MS()/60000)} Min. ohne Bedienung</span></div>
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn pri" onclick="lockNow()">${ic("lock")}Jetzt sperren</button><button class="btn" onclick="help('tablet')">${ic("doc")}Hilfe</button><button class="btn" onclick="api.openManual()">${ic("print")}Anleitung</button></div>
     <p class="hint">PINs vergibt der Admin am PC unter Einstellungen → Mitarbeiter. Beim ersten Beitritt eines Tablets kann der gewählte Mitarbeiter seine PIN direkt festlegen.</p></div>
    <div class="card"><h2>${ic("folder",'style="width:17px"')}Speicher</h2><div class="ro"><span>Ort</span><span>${esc(ENV.cfg.dataDir)}</span><span>Dokumente lokal</span><span>${si.files==null?"…":si.files}</span><span>Belegt</span><span>${mb(si.usage)}${si.quota?" von "+mb(si.quota):""}</span>
     ${PLATFORM.native?"":`<span>Dauerhaft</span><span>${si.persisted===true?'<span style="color:var(--ok)">ja</span>':si.persisted===false?'<span style="color:var(--warn)">nicht bestätigt – App „Zum Startbildschirm“ hinzufügen</span>':"–"}</span>`}
     <span>Daten</span><span>${DB.objects.length} Objekte · ${DB.cases.length} Fälle · ${DB.protocols.length} Protokolle</span></div>
     <p class="hint">Eigene Fotos und Protokolle bleiben lokal, bis sie in der Cloud liegen. Dokumente anderer Geräte werden erst beim Öffnen geladen.</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap">${cl?`<button class="btn" onclick="mobDropCache()">${ic("down")}Speicher freigeben</button>`:""}<button class="btn danger" onclick="mobReset()">${ic("trash")}Gerät zurücksetzen</button></div>
     ${pend?`<div class="banner" style="background:var(--warn-soft);color:var(--warn);margin:12px 0 0">${pend} Änderung${pend>1?"en":""} noch nicht gesendet – vor dem Zurücksetzen synchronisieren.</div>`:""}</div></div>`;
}
async function mobDropCache(){const n=await PLATFORM.dropCache();STOREINFO=null;toast(n?`${n} Dokument${n>1?"e":""} aus dem Zwischenspeicher entfernt`:"Nichts zu entfernen");render()}
async function mobReset(){
  const pend=typeof SY!=="undefined"&&SY.state?SY.state.outbox.length+SY.state.fileDel.length:0;
  if(!confirm(`Alle Daten dieses Tablets löschen?${pend?`\n\nACHTUNG: ${pend} Änderung(en) wurden noch nicht in die Cloud gesendet und gehen verloren.`:""}\n\nDie Cloud und die anderen Geräte sind nicht betroffen. Danach kann das Tablet neu beitreten.`))return;
  SAVEBLOCK=true;if(typeof cloudStop==="function")cloudStop();await PLATFORM.resetDevice();location.reload()}
