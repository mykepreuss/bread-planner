import {useState} from 'react';
import {Download,FolderOpen} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {makeBackup,readBackup,MAX_BACKUP_BYTES} from '../lib/backup';
import {definitions,type Planner} from '../lib/recipes';

export function SavedBakes({plan,onRestore}:{plan:Planner;onRestore:(p:Planner)=>void}){
  const [pending,setPending]=useState<Planner|null>(null),[error,setError]=useState(''),[open,setOpen]=useState(false),[message,setMessage]=useState('');
  function download(){
    const url=URL.createObjectURL(new Blob([makeBackup(plan)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='bread-planner-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <Dialog open={open} onOpenChange={v=>{setOpen(v);setPending(null);setError('');setMessage('');}}><DialogTrigger asChild><Button variant="ghost" className="saved-bakes-button"><FolderOpen size={18}/><span>Saved bakes</span></Button></DialogTrigger><DialogContent className="backup-dialog"><DialogHeader><DialogTitle>Saved bakes</DialogTitle><DialogDescription>Your recipes and checklists stay on this device. Save a backup to keep a copy or move them to another browser.</DialogDescription></DialogHeader>
    <Button variant="outline" onClick={download}><Download size={18}/> Download backup</Button>
    <div className="backup-import"><Label htmlFor="backup-file">Restore a backup</Label><Input id="backup-file" className="backup-file" type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];setPending(null);setError('');setMessage('');if(!file)return;try{if(file.size>MAX_BACKUP_BYTES)throw new Error('Choose a backup smaller than 1 MB.');setPending(readBackup(await file.text()));}catch(err){setError(err instanceof Error?err.message:'Unable to read this backup.');}e.target.value='';}}/>
    {error&&<p className="notice" role="alert">{error}</p>}
    {pending&&<div className="backup-preview"><p><strong>{pending.order.length} recipes</strong> · selected recipe: {definitions[pending.recipe].name}</p><p>This will replace the recipes and checklists currently saved on this device. Download a backup first if you want to keep them.</p><div><Button variant="outline" onClick={()=>setPending(null)}>Cancel import</Button><Button onClick={()=>{onRestore(pending);setPending(null);setMessage('Backup restored on this device.');}}>Replace saved bakes</Button></div></div>}
    {message&&<p className="backup-success" role="status">{message}</p>}</div>
    <p className="backup-transfer">Moving from the original app? <a href="https://rise-bread-planner.mpreussmba.chatgpt.site/transfer.html" target="_blank" rel="noreferrer">Download your saved bakes</a>, then restore that file here.</p>
  </DialogContent></Dialog>;
}
