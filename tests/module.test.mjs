import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ID,threshold,findSkill,resolve,experienceForTotal,inputValue} from '../scripts/adapter.js';
import {LAYOUTS} from '../scripts/layouts.js';
const items=(list=[])=>Object.assign(list,{get(id){return this.find(i=>i.id===id);}});
const skill=(id,name,value=45)=>({id,uuid:`Actor.test.Item.${id}`,name,type:'skill',system:{value,valueUnmodified:value,adjustments:{base:5,experience:10,personal:30},flags:{developement:false},properties:{noxpgain:false}},async update(data){this.lastUpdate=data;}});
const actor=(list=[])=>({name:'Example',img:'icons/svg/mystery-man.svg',isOwner:true,items:items(list),flags:{[ID]:{notes:{Personal_Description:'Remembered voice'}}},system:{characteristics:{str:{value:67},dex:{value:60}},attribs:{hp:{value:11,max:12},lck:{value:50},san:{value:60}},infos:{playername:'Player'},conditions:{criticalWounds:{value:false}}},async update(data){this.lastUpdate=data;},async conditionsSet(c){this.setConditions=c;},async conditionsUnset(c){this.unsetConditions=c;},async skillCheck(...args){this.lastSkillRoll=args;},async weaponCheck(...args){this.lastWeaponRoll=args;},async characteristicCheck(...args){this.lastCharacteristicRoll=args;}});
const registered=[];
class Base {constructor({document}){this.document=document;this.isEditable=document.isOwner;}async _prepareContext(){return {};}render(){return this;} _onRender(){}}
globalThis.foundry={applications:{api:{HandlebarsApplicationMixin:B=>B},sheets:{ActorSheetV2:Base}},documents:{collections:{Actors:{registerSheet(scope,cls,options){registered.push({scope,cls,options});}}}}};
globalThis.CONFIG={Actor:{sheetClasses:{character:{'CoC7.Native':{cls:Base,default:true}}}}};
globalThis.game={system:{id:'CoC7'}};
globalThis.Hooks={once(name,fn){fn();}};
globalThis.ui={notifications:{error(){},info(){}}};
await import('../scripts/main.js');
const Sheet=registered[0].cls;
test('registers two opt-in character sheets',()=>{assert.equal(registered.length,2);for(const s of registered){assert.deepEqual(s.options.types,['character']);assert.equal(s.options.makeDefault,false);}});
test('all 773 fields and 32 hotspots stay on their source images',()=>{
 let count=0;for(const layout of Object.values(LAYOUTS)){const names=new Set();for(const f of layout.fields){count++;assert(!names.has(f.name));names.add(f.name);const[x,y,w,h]=f.rect;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=100&&y+h<=100);assert(f.page>=0&&f.page<4);}assert.equal(layout.tabs.length,4);for(const page of layout.tabs)assert.equal(page.length,4);}
 assert.equal(count,773);
});
test('native characteristics calculate floor thresholds, retaining empty data',()=>{assert.equal(threshold(67,'Hard'),33);assert.equal(threshold(67,'Extreme'),13);assert.equal(threshold(null,'Hard'),'');const b=resolve(actor(),{name:'STR_Extreme'});assert.equal(b.value,13);assert.equal(b.readonly,true);});
test('aliases link only one exact Item and never guess duplicates or specialties',()=>{const a=actor([skill('one','Computer Use')]);assert.equal(findSkill(a,'Data Systems').id,'one');a.items.push(skill('two','Computer Use'));assert.equal(findSkill(a,'Data Systems'),null);a.flags[ID].skillLinks={'Data Systems':'two'};assert.equal(findSkill(a,'Data Systems').id,'two');assert.equal(findSkill(a,'Science 1'),null);});
test('skill total change preserves other adjustments',()=>{assert.equal(experienceForTotal(skill('one','Accounting'),70),35);});
test('no-xp flag disables development even for a custom mapping',()=>{const s=skill('one','Accounting');s.system.properties.noxpgain=true;assert.equal(resolve(actor([s]),{name:'Develop_Accounting'}).readonly,true);});
test('core data and campaign notes use distinct persistent paths',()=>{const a=actor();assert.equal(resolve(a,{name:'HP_Current'}).path,'system.attribs.hp.value');assert.equal(resolve(a,{name:'Personal_Description'}).value,'Remembered voice');assert.equal(resolve(a,{name:'Movement'}).autoPath,'system.attribs.mov.auto');});
test('rejects invalid numeric input but supports negative Build',()=>{assert.throws(()=>inputValue('text',true,false));assert.throws(()=>inputValue('-1',true,false));assert.equal(inputValue('-2',true,false,-2),-2);assert.equal(inputValue('',true,false),null);});
test('owner writes actual HP, maxima and native condition methods',async()=>{const a=actor(),s=new Sheet({document:a});await s._save('HP_Current','9');assert.deepEqual(a.lastUpdate,{'system.attribs.hp.value':9});await s._save('HP_Maximum','16');assert.deepEqual(a.lastUpdate,{'system.attribs.hp.max':16,'system.attribs.hp.auto':false});await s._save('Major_Wound',true);assert.deepEqual(a.setConditions,['criticalWounds']);await s._save('Major_Wound',false);assert.deepEqual(a.unsetConditions,['criticalWounds']);});
test('observer cannot mutate actor or roll',async()=>{const a=actor();a.isOwner=false;const s=new Sheet({document:a});await s._save('HP_Current','1');await s._rollField('STR_Regular',{});assert.equal(a.lastUpdate,undefined);assert.equal(a.lastCharacteristicRoll,undefined);});
test('native skill save changes Item experience, not a display-only flag',async()=>{const item=skill('one','Accounting'),a=actor([item]),s=new Sheet({document:a});await s._save('Skill_Accounting_Regular','70');assert.deepEqual(item.lastUpdate,{'system.adjustments.experience':35});assert.equal(a.lastUpdate,undefined);});
test('right-click skill uses bound actor UUID and difficulty',async()=>{const item=skill('one','Accounting'),a=actor([item]),s=new Sheet({document:a});await s._rollField('Skill_Accounting_Hard',{shiftKey:true});assert.deepEqual(a.lastSkillRoll,[item.uuid,true,{difficulty:'+'}]);});
test('weapon row writes actual linked Item, never an unassigned row',async()=>{const w={id:'gun',name:'Pistol',type:'weapon',system:{ammo:6,skill:{main:{id:'one'}}},async update(data){this.lastUpdate=data;}};const a=actor([w]);a.flags[ID].weaponLinks={2:'gun'};const s=new Sheet({document:a});await s._save('Weapon_2_Ammo','4');assert.deepEqual(w.lastUpdate,{'system.ammo':4});await s._save('Weapon_3_Ammo','9');assert.equal(a.lastUpdate,undefined);});
test('prepares each faction page, including portrait, with no missing fields',async()=>{for(const {cls} of registered){const s=new cls({document:actor()});for(let page=0;page<4;page++){s._page=page;const c=await s._prepareContext({});assert.equal(c.tabs.length,4);assert(c.fields.length>0);assert(fs.existsSync(c.background.replace(`modules/${ID}/`,'')));assert.equal(c.fields.filter(f=>f.portrait).length,page===0?1:0);}}});
test('manifest declares actual scripts, assets and required system without claiming live verification',()=>{const m=JSON.parse(fs.readFileSync('module.json'));assert.equal(m.id,ID);assert.equal(m.compatibility.minimum,'14');assert.equal(m.compatibility.verified,undefined);assert.equal(m.relationships.systems[0].id,'CoC7');for(const p of [...m.esmodules,...m.styles])assert(fs.existsSync(p));});
