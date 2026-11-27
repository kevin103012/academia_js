import { demoUsers } from '../../../data/demoUsers'
import { createInitialWorkspace } from '../../../data/workspaceSeed'
import { courseMaterial } from '../../../services/learning/learningService'
import { localStore } from '../../../services/storage/localStore'
import { dateKey } from '../../../utils/date'
import type { Workspace } from '../../../types/workspace'
import type { Planning } from '../scheduledCourse'
import type { Action, Snapshot, Person } from './contract'
import { applyDemoCommand } from './demoCommands'

const key='juniors-sparks:coordination:sandbox:v1'
function example():Snapshot {
  const raw=localStore.getJson<Workspace>('junior-sparks:workspace:v4')
  const w=raw&&Array.isArray(raw.courses)&&Array.isArray(raw.activities)&&Array.isArray(raw.submissions)&&Array.isArray(raw.students)&&raw.progress&&Array.isArray(raw.notices)&&Array.isArray(raw.events)?raw:createInitialWorkspace()
  const me={id:'coordinator',full_name:demoUsers.find(x=>x.role==='coordinator')!.name,role:'coordinator',academic_block:'',institution:'Junior’s Sparks · Demo',bio:'',is_profile_public:true,preferred_theme:'original',preferred_language:'es'}
  const teachers=[...new Set([...demoUsers.filter(u=>u.role==='teacher').map(u=>u.name),...w.courses.map(c=>c.teacher)])].map((n,i)=>({id:i===0?'teacher':'demo-teacher-'+i,full_name:n,role:'teacher',academic_block:''}))
  const students:Person[]=w.students.map(s=>({id:s.id,full_name:s.name,academic_block:s.group,role:'student'}))
  const day=dateKey(), year=day.slice(0,4), base='period-'+year, periods=[{id:base,name:year,start_date:year+'-01-01',end_date:year+'-12-31'}]
  const schedules:Snapshot['schedules']=[]
  const courses=w.courses.map(c=>{
    const planning=(c as typeof c & {planning?:Planning}).planning
    const pid=planning?.period||base
    if(planning){if(!periods.some(p=>p.id===pid))periods.push({id:pid,name:pid,start_date:planning.start,end_date:planning.end});schedules.push(...planning.days.map(d=>({course_id:c.id,day_of_week:d||7,start_time:planning.from,end_time:planning.until})))}
    return {id:c.id,name:c.name,description:c.description,category:c.category,academic_block:c.group,teacher_id:teachers.find(t=>t.full_name===c.teacher)?.id??null,teacher_name:c.teacher,period_id:pid,start_date:planning?.start||'',end_date:planning?.end||''}
  })
  return {me,people:[me,...teachers,...students],periods,courses,schedules,
    lessons:courses.flatMap(c=>courseMaterial(c.id).lessons.map((l,i)=>({id:l.id,course_id:c.id,title:l.title,position:i+1}))),
    activities:w.activities.map(a=>({id:a.id,course_id:a.courseId,title:a.title,instructions:a.instructions,due_date:a.due,max_score:20})),
    submissions:w.submissions.map(s=>({id:s.id,activity_id:s.activityId,student_id:s.studentId,score:s.score??null,submitted_at:s.submittedAt})),
    enrollments:Object.entries(w.progress).filter(([,v])=>v.enrolled).map(([id])=>({course_id:id,student_id:'student',enrolled:true,enrolled_at:'',status:'active'})),
    attendance:[],threads:[],messages:[],groups:[],events:w.events.map(e=>({id:e.id,title:e.title,location:e.location,event_date:e.date,start_time:e.time,end_time:'',visibility_scope:'personal',owner_id:me.id,target_course_id:null,target_block:null,target_role:null})),
    notices:w.notices.map(n=>({id:n.id,title:n.title,content:n.content,published_date:n.date,course_id:null}))}
}
export function demoSnapshot():Snapshot {
  const saved=localStore.getJson<Snapshot>(key)
  if(saved && saved.me?.id==='coordinator' && Array.isArray(saved.people)&&Array.isArray(saved.periods)&&Array.isArray(saved.events))return saved
  return example()
}
export async function demoCommand(op:Action,payload:Record<string,unknown>):Promise<Snapshot> {
  const write=()=>{const next=applyDemoCommand(demoSnapshot(),op,payload);if(!localStore.setJson(key,next))throw Error('No se pudo guardar en este navegador.');return next}
  return navigator.locks? navigator.locks.request(key,write):write()
}
