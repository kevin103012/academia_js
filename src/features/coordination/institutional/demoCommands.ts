import type { Action, Snapshot } from './contract'
import { courseCategories } from '../../../types/workspace.ts'
import { buildScheduledCourse } from '../scheduledCourse.ts'
import { createId } from '../../../utils/id.ts'

export function applyDemoCommand(current: Snapshot, op: Action, p: Record<string, unknown>): Snapshot {
  const d = structuredClone(current)
  const str = (key:string) => typeof p[key] === 'string' ? (p[key] as string).trim() : ''
  const required = (key:string) => { const value=str(key); if (!value) throw Error('Completa los campos obligatorios.'); return value }
  const course = (key:string) => { const c=d.courses.find(c=>c.id===required(key)); if (!c) throw Error('Curso no disponible.'); return c }
  const person = (id:string) => { const u=d.people.find(u=>u.id===id); if(!u) throw Error('Destinatario no disponible.'); return u }
  const instructor = (key:string) => { const u=person(required(key)); if(u.role!=='teacher') throw Error('Selecciona un instructor.'); return u }
  const period = () => { const id=required('period_id'); if(!d.periods.some(x=>x.id===id)) throw Error('Período no disponible.'); return id }
  const id=createId(), now=new Date().toISOString()
  switch(op) {
    case 'course.create': {
      const t=instructor('teacher_id'), pid=period()
      const days=Array.isArray(p.days)?p.days:[]
      if(!days.length || days.some(x=>!Number.isInteger(x)||x<1||x>7)) throw Error('Selecciona los días de clase.')
      const item=buildScheduledCourse({name:required('name'),category:required('category'),description:str('description'),
        group:required('academic_block'),period:pid,teacherId:t.id,start:required('start_date'),end:required('end_date'),
        days:days.map(x=>String(x%7)),from:required('start_time'),until:required('end_time')},[{id:t.id,role:'teacher',name:t.full_name}],id,courseCategories)
      d.courses.push({id,name:item.name,description:item.description,category:item.category,academic_block:item.group,
        teacher_id:t.id,teacher_name:t.full_name,period_id:pid,start_date:item.planning.start,end_date:item.planning.end})
      d.schedules.push(...Array.from(new Set(days)).map(day=>({course_id:id,day_of_week:day,start_time:item.planning.from,end_time:item.planning.until})))
      break
    }
    case 'group.create': {
      const c=course('course_id'), t=instructor('assigned_teacher_id'), pid=period()
      if(c.category!==str('category')||c.period_id!==pid||c.academic_block!==str('academic_block')) throw Error('El grupo debe coincidir con su curso, bloque y período.')
      d.groups.push({id,name:required('name'),category:c.category,course_id:c.id,academic_block:c.academic_block,period_id:pid,assigned_teacher_id:t.id});break
    }
    case 'thread.create': {
      const c=course('course_id'), target=person(required('recipient_id')), msg=required('content'), kind=required('thread_kind')
      if(!['incident_report','course_inquiry'].includes(kind)) throw Error('Tipo de conversación no válido.')
      d.threads.unshift({id,course_id:c.id,subject:required('subject'),created_by:d.me.id,recipient_id:target.id,incident_status:'open',thread_kind:kind})
      d.messages.push({id:Math.max(0,...d.messages.map(m=>m.id))+1,thread_id:id,sender_id:d.me.id,sender_name:d.me.full_name,content:msg,sent_at:now});break
    }
    case 'thread.reply':
    case 'thread.status': {
      const th=d.threads.find(t=>t.id===required('thread_id')); if(!th) throw Error('Conversación no disponible.')
      if(op==='thread.status') { const status=required('incident_status');if(!['open','verifying_with_instructor','resolved'].includes(status))throw Error('Estado no válido.');th.incident_status=status }
      else d.messages.push({id:Math.max(0,...d.messages.map(m=>m.id))+1,thread_id:th.id,sender_id:d.me.id,sender_name:d.me.full_name,content:required('content'),sent_at:now})
      break
    }
    case 'event.create': {
      const scope=required('visibility_scope'), date=required('event_date'), from=required('start_time'), until=required('end_time')
      if(!/^\d{4}-\d\d-\d\d$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(from)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(until)||from>=until)throw Error('Revisa la fecha y el horario.')
      if(!['individual','role','block','course','personal'].includes(scope))throw Error('Audiencia no válida.')
      const recipients=scope==='individual'&&Array.isArray(p.recipient_ids)?[...new Set(p.recipient_ids.map(x=>person(String(x)).id))]:[]
      if(scope==='individual'&&!recipients.length)throw Error('Selecciona los destinatarios.')
      const role=scope==='role'?required('target_role'):null
      if(role&&!['teacher','student'].includes(role))throw Error('Selecciona un rol válido.')
      d.events.push({id,title:required('title'),location:str('location'),event_date:date,start_time:from,end_time:until,visibility_scope:scope,
        owner_id:d.me.id,target_course_id:scope==='course'?course('target_course_id').id:null,target_block:scope==='block'?required('target_block'):null,target_role:role,recipient_ids:recipients});break
    }
    case 'profile.update': {
      const lng=required('preferred_language'), theme=required('preferred_theme')
      if(!['en','es'].includes(lng)||!['original','light','dark'].includes(theme)||typeof p.is_profile_public!=='boolean')throw Error('Preferencias no válidas.')
      d.me={...d.me,full_name:required('full_name'),bio:str('bio'),is_profile_public:p.is_profile_public,preferred_language:lng,preferred_theme:theme}
      d.people=d.people.map(u=>u.id===d.me.id?{...u,full_name:d.me.full_name,bio:d.me.bio,is_profile_public:d.me.is_profile_public}:u)
      break
    }
    default:throw Error('Operación desconocida.')
  }
  return d
}
