import test from 'node:test'
import assert from 'node:assert/strict'
import { buildScheduledCourse } from '../src/features/coordination/scheduledCourse.ts'

const instructors = [{ id: 't1', name: 'Ana', role: 'teacher' }, { id: 's1', name: 'Luis', role: 'student' }]
const input = { name: '  Álgebra  ', category: 'matematica', description: 'Introducción',
  group: 'B', period: '2026-II', teacherId: 't1', start: '2026-11-30', end: '2026-12-07',
  days: ['1','4'], from: '08:00', until: '09:30' }

test('builds a course with the selected instructor, dates and recurring schedule', () => {
  const item = buildScheduledCourse(input, instructors, 'course-1', [{id:'matematica'}])
  assert.equal(item.name, 'Álgebra')
  assert.equal(item.teacher, 'Ana')
  assert.deepEqual(item.planning, { instructorId: 't1', period: '2026-II', start: input.start,
    end: input.end, days: [1,4], from: '08:00', until: '09:30' })
})
test('rejects non-instructors, invalid dates, unknown categories and impossible schedules', () => {
  for (const bad of [{teacherId:'s1'}, {teacherId:'unknown'}, {end:'2026-11-01'}, {start:'2026-02-30'},
    {from:'10:00'}, {until:'26:00'}, {days:[]}, {days:['9']}, {days:['']}, {group:' '}, {period:' '}, {category:'unknown'}]) {
    assert.throws(() => buildScheduledCourse({...input, ...bad}, instructors, 'course-1', [{id:'matematica'}]))
  }
})
