import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Attendance, Activity, Course, Snapshot } from './contract'
import { callRpc } from './client'

interface Teaching {courses:Course[];activities:Activity[];roster:{course_id:string;student_id:string;full_name:string}[];attendance:Attendance[]}

// This companion is separate from the established demo and legacy role dashboards.
export function TeacherClassInput() {
  const [data,setData]=useState<Teaching|null>(null),[id,choose]=useState(''),[message,notify]=useState(''),[busy,setBusy]=useState(false)
  const load=useCallback(async()=>{try{setData(await callRpc<Teaching>('coordination_teacher_workspace'))}catch{setData(null);notify('No se pudieron cargar tus clases.')}},[])
  useEffect(()=>{void load()},[load])
  const cid=id||data?.courses[0]?.id||''
  const roster=data?.roster.filter(s=>s.course_id===cid)??[]
  async function submit(e:FormEvent<HTMLFormElement>,op:'activity.create'|'attendance.mark'){
    e.preventDefault();if(busy)return; const form=e.currentTarget;const payload:Record<string,unknown>={...Object.fromEntries(new FormData(form)),course_id:cid}; if(op==='activity.create')payload.max_score=Number(payload.max_score)
    notify('');setBusy(true)
    try{await callRpc('coordination_teacher_command',{op,payload});notify('Registro guardado. Ya está disponible en Coordinación.');form.reset();await load()}
    catch(c){notify(c instanceof Error?c.message:'No se pudo guardar.')}finally{setBusy(false)}
  }
  return <section><h2>Registro de clase</h2><p role="status">{message}</p>{!data?<button type="button" onClick={load}>Volver a cargar las clases</button>:!cid?<p>No tienes cursos institucionales asignados.</p>:<>
    <label>Curso a tu cargo<select value={cid} onChange={e=>choose(e.target.value)}>{data.courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <details><summary>Asignar actividad</summary><form key={cid+'-a'} onSubmit={e=>submit(e,'activity.create')}><label>Título<input required name="title" maxLength={120}/></label><label>Indicaciones<textarea required name="instructions" maxLength={1500}/></label><label>Fecha límite<input required type="date" name="due_date"/></label><label>Nota máxima<input required type="number" name="max_score" min="1" max="99" step=".01" defaultValue="20"/></label><button disabled={busy}>Publicar actividad</button></form></details>
    <details><summary>Registrar asistencia</summary>{!roster.length?<p>No hay estudiantes matriculados en este curso.</p>:<form key={cid+'-b'} onSubmit={e=>submit(e,'attendance.mark')}><label>Estudiante<select required name="student_id">{roster.map(s=><option key={s.student_id} value={s.student_id}>{s.full_name}</option>)}</select></label><label>Fecha de clase<input type="date" name="session_date" required/></label><label>Asistencia<select name="status">{['Presente','Tardanza','Ausente','Justificada'].map(x=><option key={x}>{x}</option>)}</select></label><button disabled={busy}>Guardar asistencia</button></form>}</details>
  </>}</section>
}
export function AdminCatalog({exit}:{exit:()=>Promise<void>}) {
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState('')
  const load=useCallback(async()=>{try{const d=await callRpc<Snapshot>('coordination_snapshot');if(d?.me?.role!=='admin')throw Error();setData(d);setError('')}catch{setError('No se pudo cargar el catálogo institucional.')}},[])
  useEffect(()=>{void load()},[load])
  return <main className="inst-login inst-inbox"><h1>Catálogo institucional</h1><p>Administración · {data?.me.institution}</p>{error&&<p role="alert">{error}</p>}
    <button onClick={load}>Actualizar</button>{data&&(data.courses.length?<ul>{data.courses.map(c=><li key={c.id}>{c.name} · {c.teacher_name}</li>)}</ul>:<p>No hay cursos asignados a la institución.</p>)}
    <button onClick={()=>void exit().catch(()=>setError('No se pudo cerrar la sesión.'))}>Cerrar sesión</button></main>
}
