# Coordination academic module

The summary, reports, courses and activities pages render the same institutional snapshot. Block, period and course are conjunctive filters, not permission checks. The course page calls `course.create` with the selected instructor, period, date range and ISO weekdays (Monday = 1, Sunday = 7); the service remains responsible for authorization and persistence.

Date ranges are inclusive and filter the dated evidence, not the list of selected courses: enrollment date, submission date, session date, or activity deadline. When a range is active, records without the applicable date cannot be assigned to it. The attendance trend shows up to eight weeks with valid marks. Urgent follow-up shows overdue submissions awaiting a grade and currently open/verifying incidents for the selected courses.

## Metric definitions

- **Enrollments:** a distinct student with `enrolled === true` counts once per course. The total sums course enrollments, not unique students across the institution.
- **Average grade:** normalize each scored submission by its activity’s maximum points. Exclude ungraded submissions and unusable scores; include legitimate zeroes. The institution-wide average is weighted by the number of graded submissions in each course, not by the number of courses.
- **Attendance:** present (`Presente`) and late (`Tardanza`) count in the numerator; those marks plus absences (`Ausente`) count in the denominator. Excused (`Justificada`), unknown, conflicting and missing marks are excluded. A recorded student/date is counted once per course. The course roster includes enrolled students and students with attendance history. The overall rate sums valid marks across courses. A zero denominator is shown as unavailable, not 0%.
- **Activity deadlines:** a deadline is past only after its calendar date, regardless of grading status. Submission and pending-grading counts come from submitted work, not expected assignments for every enrolled learner.

## Reports

Exports contain one row per matching course and only the selected columns. CSV preserves UTF-8 and neutralizes spreadsheet formula prefixes. XLSX uses typed spreadsheet cells. PDF opens a print-ready table for the browser’s Save as PDF action. If the course name and a chartable metric are both selected, the PDF includes a chart derived from those columns. No data is uploaded during preview or export.
