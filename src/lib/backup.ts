import {restorePlanner,type Planner} from './recipes.ts';

export const MAX_BACKUP_BYTES=1024*1024;
export function makeBackup(plan:Planner){return JSON.stringify({format:'bread-planner',version:1,planner:{version:5,plan}},null,2);}
export function readBackup(text:string):Planner{
  if(new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw new Error('Choose a backup smaller than 1 MB.');
  let value;try{value=JSON.parse(text);}catch{throw new Error('This file is not valid JSON. Choose a Bread Planner backup.');}
  if(value?.format==='bread-planner'){
    if(value.version!==1)throw new Error('This backup format is not supported.');
    value=value.planner;
  }
  if(!value||typeof value!=='object'||![1,2,3,4,5].includes(value.version)||!value.plan||typeof value.plan!=='object')throw new Error('Choose a Bread Planner backup.');
  const p=value.plan;
  if(value.version===5){
    if(!p.recipes||typeof p.recipes!=='object'||!Array.isArray(p.order)||typeof p.recipe!=='string'||!Object.hasOwn(p.recipes,p.recipe))throw new Error('This backup is missing its recipe settings.');
  }else if(!p.cells||typeof p.cells!=='object')throw new Error('This backup is missing its recipe settings.');
  return restorePlanner(value);
}
