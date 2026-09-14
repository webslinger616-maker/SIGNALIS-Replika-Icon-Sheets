import {ID,get,skillRows,findSkill,resolve,inputValue,experienceForTotal,baseChances,skillAliases} from './adapter.js';
import {LAYOUTS} from './layouts.js';
const NAMES=['Diagnostics','Skills','Loadout','Memory'];
const style=rect=>`left:${rect[0]}%;top:${rect[1]}%;width:${rect[2]}%;height:${rect[3]}%;`;
let NativeSheet;
class SignalisSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:['srl-sheet'],tag:'div',position:{width:900,height:920},window:{resizable:true}};
 static PARTS={body:{template:`modules/${ID}/templates/sheet.hbs`,scrollable:['.srl-scroll']}};
 static faction='Replika';
 _page=0;
 _manager=false;
 _pending=Promise.resolve();
 get faction(){return this.constructor.faction;}
 async _prepareContext(options){
  const context=await super._prepareContext(options),actor=this.document,layout=LAYOUTS[this.faction];
  const fields=layout.fields.filter(f=>f.page===this._page).map(f=>{
   const b=resolve(actor,f);return {...f,value:b.value,checked:!!b.value,disabled:!this.isEditable||b.readonly,style:style(f.rect),label:f.name.replaceAll('_',' '),tooltip:`${f.name.replaceAll('_',' ')}${b.roll?' — Right-click to roll':''}${b.skillRow&&!b.item?' — Link a skill in Skills & items':''}`,portrait:f.name==='Portrait_Notes'};
  });
  const skills=actor.items.filter(i=>i.type==='skill').sort((a,b)=>a.name.localeCompare(b.name));
  const weapons=actor.items.filter(i=>i.type==='weapon');
  const rows=skillRows(layout).map(row=>({name:row,options:skills.map(i=>({id:i.id,name:i.name,selected:findSkill(actor,row)?.id===i.id})),canCreate:row in baseChances}));
  const slots=[2,3,4,5,6].map(slot=>({slot,options:weapons.map(i=>({id:i.id,name:i.name,selected:get(actor,`flags.${ID}.weaponLinks.${slot}`)===i.id}))}));
  return {...context,fields,faction:this.faction.toLowerCase(),editable:this.isEditable,background:`modules/${ID}/assets/${this.faction.toLowerCase()}-${this._page+1}.png`,tabs:layout.tabs[this._page].map((r,i)=>({label:NAMES[i],page:i,style:style(r)})),navigation:NAMES.map((label,page)=>({label,page,active:page===this._page})),portrait:actor.img,manager:this._manager,rows,slots,items:actor.items.map(i=>({id:i.id,name:i.name,type:i.type,weapon:i.type==='weapon',skill:i.type==='skill'}))};
 }
 _onRender(context,options){
  super._onRender(context,options);
  this.element.querySelectorAll('[data-srl-page]').forEach(el=>el.addEventListener('click',async()=>{await this._pending;this._page=Number(el.dataset.srlPage);await this.render();this.element.querySelector('.srl-scroll').scrollTop=0;}));
  this.element.querySelectorAll('[data-srl-field]').forEach(el=>{
   el.addEventListener('change',event=>this._queue(()=>this._save(el.dataset.srlField,el.type==='checkbox'?el.checked:el.value)));
   el.addEventListener('contextmenu',event=>{event.preventDefault();this._rollField(el.dataset.srlField,event).catch(e=>this._error(e));});
  });
  this.element.querySelectorAll('[data-srl-command]').forEach(el=>el.addEventListener('click',()=>this._queue(()=>this._command(el.dataset.srlCommand,el))));
  this.element.querySelectorAll('[data-srl-link]').forEach(el=>el.addEventListener('change',()=>this._queue(async()=>{
   if(!this.isEditable)return;
   const category=el.dataset.srlLink==='skill'?'skillLinks':'weaponLinks';
   await this.document.update({[`flags.${ID}.${category}.${el.dataset.row}`]:el.value});
  })));
 }
 _error(error){console.error(`${ID}:`,error);ui.notifications.error(`SIGNALIS: ${error.message}`);}
 _queue(fn){this._pending=this._pending.then(fn).catch(e=>this._error(e));return this._pending;}
 async _save(name,raw){
  if(!this.isEditable)return;
  const field=LAYOUTS[this.faction].fields.find(f=>f.name===name);if(!field)return;
  const binding=resolve(this.document,field);if(binding.readonly)return;
  const value=inputValue(raw,binding.numeric,field.check,binding.minimum);
  if(binding.condition){
   const method=value?'conditionsSet':'conditionsUnset';
   await this.document[method]([binding.condition]);return;
  }
  if(binding.skill){
   if(value===null)throw new Error('A linked skill needs a total percentage.');
   if(binding.item.system.activeEffectValue)throw new Error('An Active Effect controls this skill. Edit it through the native sheet.');
   await binding.item.update({'system.adjustments.experience':experienceForTotal(binding.item,value)});return;
  }
  const change={[binding.path]:value};if(binding.autoPath)change[binding.autoPath]=false;
  await (binding.item??this.document).update(change);
 }
 async _rollField(name,event){
  if(!this.document.isOwner)return;
  await this._pending;
  const field=LAYOUTS[this.faction].fields.find(f=>f.name===name),roll=field&&resolve(this.document,field).roll;
  if(!roll)return;
  const options={difficulty:roll.level==='Hard'?'+':roll.level==='Extreme'?'++':'0'};
  if(roll.type==='skill')return this.document.skillCheck(roll.key,event.shiftKey,options);
  if(roll.type==='characteristic')return this.document.characteristicCheck(roll.key,event.shiftKey,options);
  if(roll.type==='attribute')return this.document.attributeCheck(roll.key,event.shiftKey,options);
  if(roll.type==='weapon')return this.document.weaponCheck({id:roll.key},event.shiftKey);
 }
 async _command(command,el){
  if(command==='manager'){this._manager=!this._manager;return this.render();}
  if(command==='native'){
   if(!NativeSheet)throw new Error('No native CoC7 sheet was found. Use the actor sheet configuration menu.');
   return new NativeSheet({document:this.document}).render({force:true});
  }
  if(command==='open-item')return this.document.items.get(el.dataset.item)?.sheet.render({force:true});
  if(!this.isEditable)return;
  if(command==='portrait'){
   const Picker=foundry.applications.apps.FilePicker.implementation;
   return new Picker({type:'image',current:this.document.img,callback:path=>this.document.update({img:path}).catch(e=>this._error(e))}).render({force:true});
  }
  if(command==='roll-item'){
   const item=this.document.items.get(el.dataset.item);
   if(item?.type==='skill')return this.document.skillCheck(item.uuid,false);
   if(item?.type==='weapon')return this.document.weaponCheck({id:item.id},false);
  }
  if(command==='create-skill')return this._createSkill(el.dataset.row);
 }
 async _createSkill(row){
  if(!(row in baseChances))return;
  const existing=findSkill(this.document,row);if(existing){ui.notifications.info('This row already has a linked skill.');return;}
  const name=skillAliases[row]?.[0]??row;
  const parts=CONFIG.Item.dataModels.skill.guessNameParts(name);
  const base=row==='Dodge'?Math.floor(Number(this.document.system.characteristics.dex.value??0)/2):baseChances[row];
  const itemData={...parts,type:'skill',system:{...parts.system,base:row==='Dodge'?'@DEX / 2':String(base),adjustments:{base},properties:{...parts.system.properties,noxpgain:['Cosmic Mythos','Status Resources'].includes(row),push:!['Cosmic Mythos','Status Resources','Dodge'].includes(row)&&!name.startsWith('Fighting')&&!name.startsWith('Firearms')}}};
  const [item]=await this.document.createEmbeddedDocuments('Item',[itemData]);
  await this.document.update({[`flags.${ID}.skillLinks.${row}`]:item.id});
 }
}
class ReplikaSheet extends SignalisSheet{static faction='Replika';}
class IconSheet extends SignalisSheet{static faction='Icon';}
Hooks.once('init',()=>{
 if(game.system.id!=='CoC7')return;
 const entries=Object.entries(CONFIG.Actor.sheetClasses.character??{});
 NativeSheet=entries.find(([key,value])=>key.startsWith('CoC7.')&&value.default)?.[1]?.cls??entries.find(([key])=>key.startsWith('CoC7.'))?.[1]?.cls;
 const Actors=foundry.documents.collections.Actors;
 Actors.registerSheet(ID,ReplikaSheet,{types:['character'],label:'SIGNALIS — Replika',makeDefault:false});
 Actors.registerSheet(ID,IconSheet,{types:['character'],label:'SIGNALIS — Imperial Icon',makeDefault:false});
});
