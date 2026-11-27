import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, BarChart3, Bell, BookOpen, CalendarDays, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Mail, Menu, Settings, Users, X } from 'lucide-react'
import type { Action, Page, Snapshot } from './contract'
import { AcademicModule } from './academic/AcademicModule'
import { CommunityModule } from './community/CommunityModule'
import { demoCommand, demoSnapshot } from './demoAdapter'
import { hostedCommand, hostedSnapshot } from './client'
import '../../../styles/portal.css'
import './campus.css'

const sections = [
  ['summary','Resumen','Overview',LayoutDashboard],['reports','Reportes','Reports',BarChart3],['courses','Cursos','Courses',BookOpen],
  ['activities','Actividades','Activities',ClipboardList],['messages','Mensajería','Messages',Mail],['groups','Comunidad','Community',Users],
  ['calendar','Calendario','Calendar',CalendarDays],['notices','Avisos','Notices',Bell],['settings','Configuración','Settings',Settings],
] as const
const fromHash=():Page=>sections.find(([id])=>id===window.location.hash.slice(1))?.[0]??'summary'

export function CoordinatorCampus({demo,signOut}:{demo:boolean;signOut:()=>Promise<void>}) {
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[page,setPage]=useState<Page>(fromHash)
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(true)
  const request=useRef(0), pending=useRef(false)
  const load=useCallback(async()=>{
    const seq=++request.current
    setLoading(true);setError('')
    try{const snap=demo?demoSnapshot():await hostedSnapshot();if(seq===request.current)setData(snap)}
    catch{if(seq===request.current){setData(null);setError('No se pudo cargar el panel institucional. Revisa tu conexión y tus permisos.')}}finally{if(seq===request.current)setLoading(false)}
  },[demo])
  useEffect(()=>{void load();return()=>{request.current++}},[load])
  useEffect(()=>{const handle=()=>{setPage(fromHash());setOpen(false)};window.addEventListener('hashchange',handle);return()=>window.removeEventListener('hashchange',handle)},[])
  const go=(next:Page)=>{if(next!==page){window.location.hash=next;setPage(next);window.scrollTo(0,0)}setOpen(false)}
  async function run(op:Action,payload:Record<string,unknown>){
    if(pending.current)throw Error('Hay un cambio en curso. Espera un momento.')
    pending.current=true
    try{if(demo)setData(await demoCommand(op,payload));else{await hostedCommand(op,payload);await load()}}
    finally{pending.current=false}
  }
  const en=data?.me.preferred_language==='en', title=sections.find(([id])=>id===page)![en?2:1]
  useEffect(()=>{document.title=title+' · Coordinación | Junior’s Sparks'; const prev=document.documentElement.lang;document.documentElement.lang=en?'en':'es';return()=>{document.documentElement.lang=prev}},[title,en])
  async function exit(){try{await signOut()}catch{setError('No se pudo cerrar la sesión. Intenta nuevamente.')}}
  if(!data)return <main className="inst-status">{loading?<p role="status">Cargando Coordinación…</p>:<><h1>No se pudo abrir Coordinación</h1><p role="alert">{error}</p><button onClick={load}>Reintentar</button> <button onClick={exit}>Cerrar sesión</button></>}</main>
  const props={data,page,go,run}
  return <div className="ic-shell" data-coord-theme={data.me.preferred_theme}>
    <a className="ic-skip" href="#ic-main" onClick={e=>{e.preventDefault();document.getElementById('ic-main')?.focus()}}>{en?'Skip to content':'Ir al contenido'}</a>
    <header className="ic-mobile"><strong>Junior’s Sparks</strong><button aria-controls="ic-nav" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}{en?'Menu':'Menú'}</button></header>
    <aside className={'ic-rail'+(open?' is-open':'')}><div className="ic-brand"><GraduationCap size={29}/>Junior’s Sparks</div>
      <div className="ic-school">{data.me.institution}</div>
      <nav id="ic-nav" aria-label={en?'Coordination':'Coordinación'}>{sections.map(([key,es,eng,Icon])=><button key={key} onClick={()=>go(key)} aria-current={key===page?'page':undefined}><Icon size={19}/>{en?eng:es}</button>)}</nav>
      <footer><span>{data.me.full_name}</span><button onClick={exit}><LogOut size={16}/>{en?'Sign out':'Cerrar sesión'}</button></footer>
    </aside>
    <main id="ic-main" tabIndex={-1} className="ic-main"><div className="ic-context"><span><Activity size={15}/> {en?'Academic coordination':'Coordinación académica'}</span><small>{demo?(en?'Browser demo':'Demo local'):(en?'Institutional access':'Acceso institucional')}</small></div>
      {error&&<p role="alert">{error}</p>}
      {['summary','reports','courses','activities'].includes(page)?<AcademicModule {...props}/>:<CommunityModule {...props}/>}
    </main>
  </div>
}
