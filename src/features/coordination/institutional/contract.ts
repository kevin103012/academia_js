export type Page = 'summary'|'reports'|'courses'|'activities'|'messages'|'groups'|'calendar'|'notices'|'settings'
export type Action = 'course.create'|'thread.create'|'thread.reply'|'thread.status'|'group.create'|'event.create'|'profile.update'
export interface Person {id:string; full_name:string; role:string; academic_block:string; bio?:string; is_profile_public?:boolean}
export interface Me extends Person {institution:string; preferred_language:string; preferred_theme:string}
export interface Period {id:string;name:string;start_date:string;end_date:string}
export interface Course {id:string;name:string;description:string;category:string;academic_block:string;teacher_id:string|null;teacher_name:string;period_id:string;start_date:string;end_date:string}
export interface Schedule {course_id:string;day_of_week:number;start_time:string;end_time:string}
export interface Lesson {id:string;course_id:string;title:string;position:number}
export interface Activity {id:string;course_id:string;title:string;instructions:string;due_date:string;max_score:number}
export interface Submission {id:string;activity_id:string;student_id:string;submitted_at:string;score:number|null}
export interface Enrollment {course_id:string;student_id:string;enrolled:boolean;enrolled_at:string;status:string}
export interface Attendance {course_id:string;student_id:string;session_date:string;status:string}
export interface Thread {id:string;course_id:string|null;subject:string;created_by:string;recipient_id:string|null;incident_status:string;thread_kind:string}
export interface Message {id:number;thread_id:string;sender_id:string;sender_name:string;content:string;sent_at:string}
export interface Group {id:string;name:string;category:string;course_id:string|null;academic_block:string|null;period_id:string|null;assigned_teacher_id:string|null}
export interface CalendarItem {id:string;title:string;event_date:string;start_time:string;end_time:string;location:string;visibility_scope:string;target_role:string|null;target_course_id:string|null;target_block:string|null;owner_id:string|null;recipient_ids?:string[]}
export interface Notice {id:string;title:string;content:string;published_date:string;course_id:string|null}
export interface Snapshot {me:Me; people:Person[]; periods:Period[];courses:Course[];schedules:Schedule[];lessons:Lesson[];activities:Activity[];submissions:Submission[];enrollments:Enrollment[];attendance:Attendance[];threads:Thread[];messages:Message[];groups:Group[];events:CalendarItem[];notices:Notice[]}
export interface ModuleProps {page:Page;data:Snapshot;run:(op:Action,payload:Record<string,unknown>)=>Promise<void>;go:(page:Page)=>void}
