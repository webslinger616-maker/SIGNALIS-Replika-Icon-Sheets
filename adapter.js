export const ID = 'signalis-coc7-sheets';
export const get = (o,p) => p.split('.').reduce((v,k)=>v?.[k],o);
export const normalize = s => String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const threshold = (v,level) => v==null || v==='' ? '' : Math.floor(Number(v)/(level==='Hard'?2:level==='Extreme'?5:1));
export const skillAliases = {
 'Cosmic Mythos':['Cthulhu Mythos'], 'Data Systems':['Computer Use'],
 'Drive Ground Vehicle':['Drive Auto'],'Forbidden Culture':['Occult'],
 'Status Resources':['Credit Rating','Status & Resources'],
 'Fighting Brawl':['Fighting (Brawl)','Brawl'],
 'Firearms Handgun':['Firearms (Handgun)','Handgun'],
 'Firearms Rifle Shotgun':['Firearms (Rifle/Shotgun)','Rifle/Shotgun']
};
export const baseChances={Accounting:5,Anthropology:1,Appraise:5,Archaeology:1,Charm:15,Climb:20,'Cosmic Mythos':0,'Data Systems':5,Disguise:5,Dodge:0,'Drive Ground Vehicle':20,'Electrical Repair':10,Electronics:1,'Fast Talk':5,'Fighting Brawl':25,'Firearms Handgun':20,'Firearms Rifle Shotgun':25,'First Aid':30,'Forbidden Culture':5,History:5,Intimidate:15,Jump:20,Law:5,'Library Use':20,Listen:20,Locksmith:1,'Mechanical Repair':10,Medicine:1,'Natural World':10,Navigate:10,'Operate Heavy Machinery':1,Persuade:10,Psychoanalysis:1,Psychology:10,Ride:5,'Sleight of Hand':10,'Spot Hidden':25,'Status Resources':0,Stealth:20,Swim:20,Throw:20,Track:10};
export function skillRows(layout){return [...new Set(layout.fields.map(f=>/^Skill_(.+)_Regular$/.exec(f.name)?.[1]).filter(Boolean))];}
export function findSkill(actor,row){
 const id=get(actor,`flags.${ID}.skillLinks.${row}`);
 if(id){const item=actor.items.get(id);return item?.type==='skill'?item:null;}
 if(!(row in baseChances))return null; // Never guess specialty slots.
 const names=[row,...(skillAliases[row]??[])].map(normalize);
 const found=actor.items.filter(i=>i.type==='skill' && names.includes(normalize(i.name)));
 return found.length===1?found[0]:null;
}
export const corePaths={Name_Designation:'name',Player:'system.infos.playername',Occupation_Service:'system.infos.occupation',Age:'system.infos.age',Sex_Gender:'system.infos.sex',Origin:'system.infos.birthplace',Residence_Posting:'system.infos.residence',HP_Current:'system.attribs.hp.value',HP_Maximum:'system.attribs.hp.max',MP_Current:'system.attribs.mp.value',MP_Maximum:'system.attribs.mp.max',Luck:'system.attribs.lck.value',Movement:'system.attribs.mov.value',Sanity_Current:'system.attribs.san.value',Sanity_Maximum:'system.attribs.san.max',Sanity_Lost_Today:'system.attribs.san.dailyLoss',Damage_Bonus:'system.attribs.db.value',Build:'system.attribs.build.value',Armor_Protection:'system.attribs.armor.value'};
export const conditions={Major_Wound:'criticalWounds',Unconscious:'unconscious',Dying:'dying',Temporary_Insanity:'tempoInsane',Indefinite_Insanity:'indefInsane'};
const weaponPaths={Weapon:'name',Damage:'system.range.normal.damage',Range:'system.range.normal.value',Attacks:'system.usesPerRound.normal',Ammo:'system.ammo',Malfunction:'system.malfunction'};
export function resolve(actor,field){
 const name=field.name;
 let match=/^(STR|CON|SIZ|DEX|APP|INT_Idea|POW|EDU_Know)_(Regular|Hard|Extreme)$/.exec(name);
 if(match){const key=match[1].split('_')[0].toLowerCase();return {value:threshold(get(actor,`system.characteristics.${key}.value`),match[2]),path:`system.characteristics.${key}.value`,numeric:true,readonly:match[2]!=='Regular',roll:{type:'characteristic',key,level:match[2]}};}
 match=/^Skill_(.+)_(Regular|Hard|Extreme)$/.exec(name);
 if(match){const item=findSkill(actor,match[1]);return {value:threshold(item?.system.value,match[2]),item,skillRow:match[1],skill:true,numeric:true,readonly:match[2]!=='Regular'||!item,roll:item?{type:'skill',key:item.uuid,level:match[2]}:null};}
 match=/^Develop_(.+)$/.exec(name);
 if(match){const item=findSkill(actor,match[1]);return {value:item?.system.flags.developement??false,item,path:'system.flags.developement',readonly:!item||!!item.system.properties.noxpgain};}
 match=/^Specialty_(.+)$/.exec(name);
 if(match){const item=findSkill(actor,match[1]);return {value:item?.system.skillName||item?.name||'',readonly:true,skillRow:match[1],item};}
 match=/^Dodge_Reference_(Regular|Hard|Extreme)$/.exec(name);
 if(match){const item=findSkill(actor,'Dodge');return {value:threshold(item?.system.value,match[1]),readonly:true,roll:item?{type:'skill',key:item.uuid,level:match[1]}:null};}
 match=/^Weapon_(\d+)_(.+)$/.exec(name);
 if(match){
  const slot=Number(match[1]),col=match[2];
  if(slot===1){const skill=findSkill(actor,'Fighting Brawl');return {value:threshold(skill?.system.value,col),readonly:true,roll:skill?{type:'skill',key:skill.uuid,level:col}:null};}
  const item=actor.items.get(get(actor,`flags.${ID}.weaponLinks.${slot}`));
  if(!item||item.type!=='weapon')return {value:'',readonly:true};
  if(['Regular','Hard','Extreme'].includes(col)){const skill=actor.items.get(item.system.skill.main.id);return {value:threshold(skill?.system.value,col),readonly:true,roll:{type:'weapon',key:item.id,level:col}};}
  return {value:get(item,weaponPaths[col])??'',item,path:weaponPaths[col],numeric:['Ammo','Malfunction'].includes(col),roll:col==='Weapon'?{type:'weapon',key:item.id}:null};
 }
 if(conditions[name])return {value:get(actor,`system.conditions.${conditions[name]}.value`),condition:conditions[name]};
 if(corePaths[name]){
  const path=corePaths[name];const data={value:get(actor,path)??'',path,numeric:path.startsWith('system.attribs.')&&!['Damage_Bonus','Armor_Protection'].includes(name)};
  const auto={HP_Maximum:'hp',MP_Maximum:'mp',Sanity_Maximum:'san',Movement:'mov',Damage_Bonus:'db',Build:'build'}[name];
  if(name==='Build')data.minimum=-2;
  if(auto)data.autoPath=`system.attribs.${auto}.auto`;
  const key={Luck:'lck',Sanity_Current:'san'}[name];if(key)data.roll={type:'attribute',key};
  return data;
 }
 return {value:get(actor,`flags.${ID}.notes.${name}`)??(field.check?false:''),path:`flags.${ID}.notes.${name}`};
}
export function experienceForTotal(item,total){
 const current=Number(item.system.valueUnmodified??item.system.value??0);
 return Number(item.system.adjustments.experience??0)+total-current;
}
export function inputValue(raw,numeric,check,minimum=0){
 if(check)return !!raw;
 if(!numeric)return String(raw??'');
 if(String(raw).trim()==='')return null;
 const v=Number(raw);if(!Number.isFinite(v)||!Number.isInteger(v)||v<minimum)throw new Error(`Enter a whole number of at least ${minimum}.`);return v;
}
