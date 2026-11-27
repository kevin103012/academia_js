import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { callRpc, type Identity } from './client'
import type { CalendarItem, Thread, Message, Person } from './contract'
import { TeacherClassInput } from './AcademicAccess'
type Inbox={events:CalendarItem[];threads:Thread[];messages:Message[];coordinators:Person[];courses:{id:string;name:string;teacher_id:string|null}[]}
export function RecipientInbox({identity,exit}:{identity:Identity;exit:()=>Promise<void>}) {
  const [data,setData]=useState<Inbox|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false)
  const load=useCallback(async()=>{setError('');try{const result=await callRpc<Inbox>('coordination_recipient_inbox');setData(result)}catch{setData(null);setError('No se pudo cargar tu bandeja.')}},[])
  useEffect(()=>{void load()},[load])
  async function submit(e:FormEvent<HTMLFormElement>,op:'thread.reply'|'thread.report'){
    e.preventDefault();if(busy)return
    const form=e.currentTarget,payload=Object.fromEntries(new FormData(form));setBusy(true);setError('');setStatus('')
    try{await callRpc('coordination_recipient_command',{op,payload});setStatus('Enviado a Coordinación.');form.reset();await load()}
    catch(c){setError(c instanceof Error?c.message:'No se pudo enviar.')}finally{setBusy(false)}
  }
  return <main className="inst-login inst-inbox"><h1>Bandeja institucional</h1><p>{identity.full_name} · {identity.institution}</p>
    {error&&<p role="alert">{error} <button onClick={load}>Reintentar</button></p>}{status&&<p role="status">{status}</p>}
    {data?<><section><h2>Convocatorias</h2>{data.events.length?data.events.map(x=><p key={x.id}><strong>{x.title}</strong> · {x.event_date} · {x.start_time} · {x.location}</p>):<p>No tienes convocatorias.</p>}</section>
    <section><h2>Coordinación</h2>{data.coordinators.length?data.coordinators.map(c=><p key={c.id}><strong>{c.full_name}</strong> · Coordinación<br/>{c.bio}</p>):<p>No hay perfiles visibles.</p>}</section>
    <section><h2>Reportar una clase</h2>{data.courses.length?<form onSubmit={e=>submit(e,'thread.report')}><label>Curso<select required name="course_id">{data.courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>Asunto<input name="subject" required maxLength={100}/></label><label>¿Qué ocurrió?<textarea name="content" required maxLength={1500}/></label><button disabled={busy}>Enviar reporte</button></form>:<p>No hay cursos asignados para reportar.</p>}</section>
    <section><h2>Conversaciones</h2>{data.threads.length?data.threads.map(t=><details key={t.id}><summary>{t.subject}</summary>{data.messages.filter(m=>m.thread_id===t.id).map(m=><p key={m.id}><strong>{m.sender_name}</strong>: {m.content}</p>)}<form onSubmit={e=>submit(e,'thread.reply')}><input type="hidden" name="thread_id" value={t.id}/><label>Respuesta<textarea name="content" required maxLength={1500}/></label><button disabled={busy}>Responder</button></form></details>):<p>No tienes conversaciones.</p>}</section></>:!error&&<p role="status">Cargando…</p>}
    {identity.role==='teacher' && <TeacherClassInput/>}
    <button onClick={()=>void exit().catch(()=>setError('No se pudo cerrar la sesión.'))}>Cerrar sesión</button></main>
}
