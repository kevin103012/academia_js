import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Action, Snapshot } from './contract'

const url = import.meta.env.VITE_COORD_SUPABASE_URL
const key = import.meta.env.VITE_COORD_SUPABASE_PUBLISHABLE_KEY
let client:SupabaseClient | undefined
export function hostedClient() {
  if(!url || typeof key!=='string' || !key.startsWith('sb_publishable_')) throw Error('La conexión institucional no está configurada.')
  return client ??= createClient(url,key,{auth:{storageKey:'juniors-sparks:institution:session',detectSessionInUrl:false}})
}
export interface Identity {id:string;full_name:string;role:string;institution:string}
export async function callRpc<T>(name:string,params?:Record<string,unknown>):Promise<T>{
  const {data,error}=await hostedClient().rpc(name,params)
  if(error)throw new Error(error.code==='42501'?'No tienes permiso para esta operación.':error.code==='P0001'?'No se pudo guardar. Verifica los datos y permisos.':'La operación institucional no está disponible. Intenta nuevamente.')
  return data as T
}
export async function hostedSnapshot():Promise<Snapshot>{
  const data=await callRpc<Snapshot>('coordination_snapshot')
  if(!data?.me || data.me.role!=='coordinator' || !['people','periods','courses','activities','schedules','lessons','submissions','enrollments','attendance','threads','messages','groups','events','notices'].every(k=>Array.isArray(data[k as keyof Snapshot])))throw Error('La respuesta institucional no es válida.')
  return data
}
export async function hostedCommand(op:Action,payload:Record<string,unknown>) {
  await callRpc('coordination_command',{op,payload})
}
