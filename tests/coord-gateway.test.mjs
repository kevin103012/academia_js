import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDemoCommand } from '../src/features/coordination/institutional/demoCommands.ts'
const seed={me:{id:'c',role:'coordinator',full_name:'Ana'},people:[{id:'t',role:'teacher',full_name:'Sol'},{id:'s',role:'student'}],courses:[{id:'a',period_id:'p',teacher_id:'t',category:'hardware',academic_block:'A'}],periods:[{id:'p'}],groups:[],threads:[],messages:[],events:[],schedules:[]}
test('group command references institutional course, instructor and period',()=>{
 const payload={name:'Taller',category:'hardware',course_id:'a',period_id:'p',academic_block:'A',assigned_teacher_id:'t'}
 assert.equal(applyDemoCommand(seed,'group.create',payload).groups.at(-1).name,'Taller')
 assert.throws(()=>applyDemoCommand(seed,'group.create',{...payload,assigned_teacher_id:'s'}))
})
test('calendar individual audience rejects missing recipients and records precise targets',()=>{
 const payload={title:'Tutoría',event_date:'2026-11-30',start_time:'09:00',end_time:'10:00',location:'Sala',visibility_scope:'individual',recipient_ids:['s']}
 assert.deepEqual(applyDemoCommand(seed,'event.create',payload).events[0].recipient_ids,['s'])
 assert.throws(()=>applyDemoCommand(seed,'event.create',{...payload,recipient_ids:['absent']}))
})
test('profile updates never grant role, institution or identity changes',()=>{
 const next=applyDemoCommand(seed,'profile.update',{full_name:'Mar',bio:'',is_profile_public:false,preferred_language:'en',preferred_theme:'dark',role:'admin',id:'hijack'})
 assert.equal(next.me.role,'coordinator');assert.equal(next.me.id,'c');assert.equal(next.me.full_name,'Mar')
})
