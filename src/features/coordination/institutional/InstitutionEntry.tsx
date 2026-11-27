import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { hostedClient, callRpc, type Identity } from './client'
import { CoordinatorCampus } from './CoordinatorCampus'
import { RecipientInbox } from './RecipientInbox'
import { AdminCatalog } from './AcademicAccess'
import './campus.css'

export default function InstitutionEntry() {
  const [sessionId,setSessionId]=useState<string|null|undefined>(undefined),[failure,setFailure]=useState('')
  useEffect(()=>{let active=true;try{
    const {data:{subscription}}=hostedClient().auth.onAuthStateChange((_event,session)=>{if(active)setSessionId(session?.user.id??null)})
    return ()=>{active=false;subscription.unsubscribe()}
  }catch{setFailure('La conexión institucional no está configurada.')}},[])
  if(failure)return <main className="inst-status"><h1>Acceso institucional</h1><p role="alert">{failure}</p><Link to="/acceso">Volver</Link></main>
  if(sessionId===undefined)return <main className="inst-status" role="status">Comprobando sesión…</main>
  return sessionId?<BoundSession key={sessionId}/>:<InstitutionLogin/>
}
function InstitutionLogin(){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;const fd=new FormData(e.currentTarget);setBusy(true);setError('')
    try{const {error}=await hostedClient().auth.signInWithPassword({email:String(fd.get('email')).trim(),password:String(fd.get('password'))})
      if(error)setError('No se pudo iniciar sesión. Revisa tu correo y contraseña institucionales.')}
    catch{setError('No se pudo conectar con el servicio de acceso.')}finally{setBusy(false)}
  }
  return <main className="inst-login"><h1>Acceso institucional</h1><p>Usa tu cuenta de la institución. Las cuentas de demostración no dan acceso a estos datos.</p>
  <form onSubmit={submit}><label>Correo institucional<input name="email" type="email" autoComplete="username" required/></label>
  <label>Contraseña<input name="password" type="password" autoComplete="current-password" required/></label>
  {error&&<p role="alert">{error}</p>}<button disabled={busy}>{busy?'Ingresando…':'Entrar'}</button></form><Link to="/acceso">Volver a la demo</Link></main>
}
function BoundSession(){
  const [identity,setIdentity]=useState<Identity|null>(null),[status,setStatus]=useState('loading'),[nonce,retry]=useState(0)
  useEffect(()=>{let active=true;setStatus('loading');void callRpc<Identity|null>('coordination_identity').then(me=>{
    if(active){setIdentity(me);setStatus(me?.id?'ready':'unassigned')}
  }).catch(()=>{if(active)setStatus('error')});return()=>{active=false}},[nonce])
  const exit=async()=>{const {error}=await hostedClient().auth.signOut({scope:'local'});if(error)throw error}
  if(identity && status==='ready'){
    if(identity.role==='coordinator')return <CoordinatorCampus demo={false} signOut={exit}/>
    if(identity.role==='admin')return <AdminCatalog exit={exit}/>
    if(['teacher','student'].includes(identity.role))return <RecipientInbox identity={identity} exit={exit}/>
  }
  return <main className="inst-status"><h1>Acceso institucional</h1><p role="status">{status==='loading'?'Comprobando tu perfil…':status==='error'?'No se pudo consultar el acceso institucional.':'Tu cuenta no tiene una asignación institucional habilitada. Contacta con la administración.'}</p>
  <button onClick={()=>retry(x=>x+1)}>Reintentar</button> <button onClick={()=>void exit().catch(()=>setStatus('error'))}>Cerrar sesión</button></main>
}
