Version 1.0 (Pilot-Ready LMS)
Phase A — Academic Content Foundation (highest priority)

This is the missing backbone.

Publisher
    ↓
Book
    ↓
Unit
    ↓
Chapter
    ↓
Module / Lesson
    ↓
Learning Outcomes
    ↓
Activities
    ↓
Exercises
    ↓
Question Bank
    ↓
Assessment

Every level should support:

Create
Edit
Delete
Reorder (drag and drop)
Publish / Draft
Rich text
Images
Tables
Videos
PDFs
Downloads
Attach AI resources
Phase B — Complete Teacher LMS

Teachers should be able to:

View assigned books
Browse units
Browse chapters
Browse lessons
Play videos
Open PDFs
Download PPTs
Download worksheets
Download lesson plans
Access teacher manuals
Access answer keys
Generate AI lesson plans
Generate worksheets
Generate question papers
Generate remedials
Create homework
Create assignments
Create tests
Schedule classes
Track student progress
View reports
Phase C — Student LMS

Students should have:

Dashboard
Assigned books
Units
Chapters
Lessons
Interactive content
Videos
PDFs
Practice
Quizzes
Homework
Assignments
Assessments
AI tutor
Doubt section
Notes
Bookmarks
Progress tracker
Certificates
Phase D — School Dashboard

Schools should manage:

Teachers
Students
Classes
Sections
Subjects
Timetables
Attendance
Homework
Exams
Reports
Circulars
Resource allocation
Academic calendar
Phase E — Reports & Analytics

Generate reports at every level.

Student
Attendance
Homework
Assignment completion
Chapter completion
Learning outcomes
Competency mastery
Weak topics
Strong topics
Time spent
Assessment history
AI recommendations
Teacher
Class performance
Homework status
Assessment analysis
Topic completion
Lesson coverage
AI usage
Student engagement
School
Teacher performance
Class performance
Subject performance
Book adoption
Resource usage
Login activity
Overall academic progress
Publisher
School adoption
Teacher activity
Student activity
Most-used books
Most-used resources
AI usage
Download statistics
Geographic usage
Content performance
Phase F — Video Learning

Every lesson should support:

Embedded YouTube videos
Private video URLs
Uploaded videos
Interactive timestamps
Notes
Transcript
Attachments
Completion tracking
Watch progress
Resume playback
Phase G — Assessments

Support:

MCQ
True/False
Fill in the blanks
Match the following
Short answer
Long answer
Case study
Assertion & Reason
Competency-based
HOTS
Practical
Project

With:

Auto evaluation (where possible)
Manual evaluation
Rubrics
Marks
Feedback
Analytics
Phase H — AI Features
Lesson plan generator
Worksheet generator
Question paper generator
Remedial generator
Bloom's taxonomy tagging
Competency mapping
Gap analysis
Parent feedback
Student recommendations
AI tutor
AI explanation
AI translation
AI summaries
Phase I — Communication
Notifications
Announcements
Circulars
Email
SMS (future)
WhatsApp (future)
Parent messaging
Teacher messaging
Recommended development order
Academic hierarchy (Units, Chapters, Modules, Lessons)
Content editor (videos, PDFs, resources, attachments)
Teacher LMS
Student LMS
Assessment engine
Reporting and analytics
School dashboard
AI enhancements
Parent portal
Mobile app
My suggestion

Before adding features one by one, I recommend creating a Version 1.0 Master Blueprint for the entire Bluegate Education OS. It would define every database model, relationship, user role, permission, workflow, and screen before implementation begins.

That blueprint becomes the single source of truth for development and helps avoid repeated schema changes as the platform grows.

make blueprint
Bluegate Education OS
Version 1.0 — Complete LMS & School Pilot Blueprint

This blueprint defines the platform that must be completed before schools are invited. It covers academic structure, Publisher Admin, School Dashboard, Teacher LMS, Student LMS, assessments, videos, reports, communication, AI features, permissions, database architecture, and development order.

1. Product vision

Bluegate Education OS will be a complete academic platform connecting:

Publisher
   ↓
Schools
   ↓
Classes and Sections
   ↓
Teachers
   ↓
Students
   ↓
Books, Lessons, Activities, Assessments and Reports

The platform should support:

Bluegate books and digital content
School academic management
Teacher planning and teaching
Student learning and practice
Homework and assessments
Progress tracking
Reports for teachers, schools, parents and publishers
AI-assisted teaching and learning
Video, PDF, PPT, worksheet and resource delivery
2. User roles
2.1 Super Admin

Controls the entire platform.

Capabilities:

Create and manage publishers
Activate or suspend publishers
Manage platform features
View all schools
View security audits
Monitor system health
Manage plans and platform limits
View publisher-level reports
Access support and troubleshooting tools
2.2 Publisher Admin

Controls Bluegate books, content and adopted schools.

Capabilities:

Manage books
Manage curriculum hierarchy
Upload covers and sample PDFs
Manage digital resources
Manage video links
Build question banks
Create assessments
Approve schools and teachers
Assign books to schools
Manage teacher resources
View usage and adoption reports
Manage AI content settings
Publish and unpublish content
2.3 School Admin

Controls one school.

Capabilities:

Manage school profile
Create academic sessions
Create classes and sections
Add students
Add teachers
Assign class teachers
Assign subject teachers
Assign books and subjects
Manage timetable
Manage academic calendar
Monitor attendance
Monitor homework and assessments
Generate school reports
Send announcements
Manage parents
Activate or suspend school users
2.4 Teacher

Controls teaching and assessment for assigned classes.

Capabilities:

View assigned classes
View assigned subjects and books
Browse units, chapters and lessons
Open videos, PDFs, PPTs and worksheets
Create lesson plans
Create homework
Create assignments
Create quizzes and exams
Mark attendance
Evaluate answers
Track syllabus completion
View student progress
Generate class reports
Use AI teaching tools
Send announcements
2.5 Student

Uses assigned academic content.

Capabilities:

View assigned classes and subjects
Read digital book content
Browse units, chapters and lessons
Watch videos
Open learning resources
Complete homework
Submit assignments
Take quizzes and assessments
Practice questions
View marks and feedback
Track progress
Save notes and bookmarks
Ask doubts
Use AI learning support
2.6 Parent

Monitors linked students.

Capabilities:

View attendance
View homework status
View assessment results
View teacher feedback
View progress reports
View school announcements
Receive notifications
Download report cards
Contact the school where permitted

The Parent Portal can be implemented after the Teacher, Student and School modules are stable, but the data model should support parents from the beginning.

3. Complete academic hierarchy

The core curriculum hierarchy will be:

Publisher
└── Book
    └── Unit
        └── Chapter
            └── Module / Lesson
                ├── Learning Outcomes
                ├── Topics
                ├── Activities
                ├── Exercises
                ├── Resources
                ├── Videos
                ├── Questions
                └── Assessments
3.1 Book

Fields:

Title
Subtitle
Slug
ISBN
Description
Class
Subject
Board
Series
Edition
Language
Pages
Weight
Price
Cover image
Sample PDF
Teacher manual
Answer key
Published status
Featured status
Featured order
Publisher
Display order
3.2 Unit

Fields:

Book
Unit number
Title
Description
Introduction
Learning goals
Cover illustration
Display order
Draft or Published
Estimated teaching time

Capabilities:

Create
Edit
Delete
Reorder
Duplicate
Publish
Unpublish
Archive

A book may optionally contain chapters without units for books that do not use unit divisions.

3.3 Chapter

Fields:

Book
Unit, optional
Chapter number
Title
Subtitle
Introduction
Description
Big questions
Learning objectives
Key concepts
Estimated teaching periods
Cover illustration
Display order
Draft or Published

Capabilities:

Create
Edit
Delete
Reorder
Move between units
Duplicate
Publish
Archive
3.4 Module or Lesson

A module represents one teachable lesson or topic within a chapter.

Fields:

Chapter
Module number
Title
Description
Lesson content
Teacher guidance
Student explanation
Duration
Display order
Draft or Published
Completion criteria

Capabilities:

Create
Edit
Delete
Reorder
Duplicate
Move between chapters
Publish
Attach resources
3.5 Learning Outcome

Fields:

Chapter or module
Outcome statement
Competency
Bloom’s taxonomy level
NCERT/board standard
Display order

Learning outcomes will later connect directly to:

Questions
Assessments
Student mastery
Remedial recommendations
Reports
3.6 Topic

Fields:

Module
Topic name
Explanation
Examples
Key points
Vocabulary
Display order
Published status
3.7 Activity

Fields:

Chapter or module
Title
Instructions
Objective
Materials required
Duration
Group or individual
Safety instructions
Teacher notes
Student submission required
Marks, optional
Published status

Activity types:

Classroom activity
Lab activity
Project
Group work
Discussion
Observation
Field activity
Art-integrated activity
Experiential learning
3.8 Exercise

Fields:

Chapter or module
Title
Instructions
Exercise type
Marks
Duration
Attempt limit
Display order
Published status
Practice or Graded
Answer visibility

Exercise types:

Practice
Revision
Homework
Worksheet
Chapter-end exercise
Competency exercise
Remedial exercise
Enrichment exercise
4. Question bank

Questions must be reusable across exercises, homework, worksheets, quizzes and examinations.

Supported question types
Multiple choice
Multiple select
True or False
Fill in the blanks
Match the following
One-word answer
Very short answer
Short answer
Long answer
Assertion and Reason
Case study
Passage-based
Image-based
Diagram-based
Numerical
Practical
Project
Oral question
Competency-based question
HOTS question
Question fields
Book
Unit
Chapter
Module
Exercise
Question text
Question type
Options
Correct answer
Alternate answers
Explanation
Marks
Negative marks
Difficulty
Bloom’s taxonomy level
Competency
Learning outcome
Board alignment
Tags
Image
Audio
Video
Display order
Published status
Teacher-only notes
Difficulty levels
Easy
Moderate
Difficult
Cognitive levels
Remember
Understand
Apply
Analyse
Evaluate
Create
5. Digital content and resources

Every book, unit, chapter and module should support resources.

Resource types
PDF
PPT/PPTX
DOC/DOCX
XLS/XLSX
Worksheet
Answer key
Teacher manual
Lesson plan
Activity sheet
Assessment
Image
Audio
Video
Animation
Interactive content
External link
ZIP package
HTML learning object
Resource fields
Title
Description
Resource type
File or URL
Thumbnail
Book
Unit
Chapter
Module
Class
Subject
Audience
Language
Download allowed
Preview allowed
Published status
Display order
File size
Duration
Version
Uploaded by
Usage count
Audience options
Teacher only
Student only
Teacher and student
School Admin
Publisher Admin
6. Video learning system
Supported video sources
YouTube
Vimeo
Cloudflare Stream
Vercel Blob/R2-hosted video
External secure video URL
Uploaded MP4
Live-class recording
Video fields
Title
Description
Video provider
Video URL
Provider video ID
Thumbnail
Transcript
Duration
Language
Captions
Book
Unit
Chapter
Module
Learning outcomes
Teacher notes
Student notes
Published status
Display order
Video features
Play and pause
Full-screen playback
Captions
Playback speed
Resume from last position
Watch-progress tracking
Completion tracking
Transcript
Notes
Bookmarks
Related resources
Related questions
Video quiz
Teacher-only video
Student-visible video
Scheduled availability
Video completion rules

A video can be marked complete when:

80% or more has been watched
A linked quiz is completed
The teacher manually marks it complete
7. Publisher Admin LMS content manager

Primary route:

/admin/books/[bookId]/content

Navigation:

Overview
Units
Chapters
Modules
Learning Outcomes
Activities
Exercises
Questions
Videos
Resources
Assessments
Book Assignments
Reports
Settings
Content manager layout

Left side:

Expandable curriculum tree
Book
├── Unit 1
│   ├── Chapter 1
│   │   ├── Module 1
│   │   └── Module 2
│   └── Chapter 2
└── Unit 2

Right side:

Selected content details
Create/Edit form
Associated resources
Publication status
Usage details
Required admin controls
Add
Edit
View
Delete
Archive
Duplicate
Reorder
Move
Publish
Unpublish
Preview as Teacher
Preview as Student
Bulk import
Bulk publish
Search
Filter
Version history
8. School academic structure
School
└── Academic Session
    └── Class
        └── Section
            ├── Students
            ├── Class Teacher
            ├── Subjects
            ├── Subject Teachers
            ├── Books
            ├── Timetable
            └── Assessments
Academic session

Examples:

2026–27
2027–28

Fields:

Session name
Start date
End date
Active status
Term structure
Class

Examples:

Nursery
Class 1
Class 6
Class 12

Fields:

Class name
Grade level
Board
Academic session
Display order
Section

Examples:

Class 6A
Class 6B

Fields:

Class
Section name
Capacity
Room
Class teacher
Active status
Subject assignment

Each class section can have:

Subject
Subject teacher
Book
Weekly periods
Syllabus
Assessment structure
9. Teacher LMS
Teacher dashboard

Dashboard cards:

Today’s classes
Pending homework
Pending evaluations
Upcoming assessments
Attendance pending
Syllabus progress
Student alerts
Recent resources
AI credits or usage
Teacher modules
My Classes
Assigned classes and sections
Student list
Subject list
Book assignment
Class announcements
Class reports
Lesson planning

Teacher can:

Select class
Select subject
Select book
Select unit
Select chapter
Select module
Create lesson plan
Add objectives
Add activities
Add resources
Add homework
Schedule lesson
Mark lesson completed
Syllabus tracker

Track:

Not started
In progress
Completed
Revision required

At levels:

Unit
Chapter
Module
Learning outcome
Attendance
Daily attendance
Period attendance, optional
Present
Absent
Late
Leave
Holiday
Attendance correction
Monthly report
Homework

Teacher can:

Create homework
Attach files
Add questions
Set due date
Assign to class or selected students
Allow online submission
Review submissions
Give marks and feedback
Mark late submissions
Assignments
Individual assignment
Group assignment
Project
File upload
Text response
Image response
Rubric-based evaluation
Assessments
Create from question bank
Create manually
Generate with AI
Schedule assessment
Set duration
Set attempt limit
Randomize questions
Auto-evaluate objective questions
Manually evaluate descriptive answers
Publish result
Teacher resources
Lesson plans
PPTs
Worksheets
Answer keys
Teacher manuals
Videos
Training resources
Assessment templates
AI tools
Lesson-plan generator
Worksheet generator
Question-paper generator
Quiz generator
Remedial generator
Learning-outcome generator
Rubric generator
Student-feedback generator
Class-summary generator
10. Student LMS
Student dashboard

Cards:

Today’s lessons
Homework due
Upcoming tests
Recent results
Continue learning
Progress
Attendance
Announcements
Teacher feedback
My learning

Navigation:

Subject
→ Book
→ Unit
→ Chapter
→ Module

Each module can include:

Explanation
Video
PDF
Interactive content
Activity
Practice exercise
Quiz
Notes
Bookmark
Completion status
Student features
Watch videos
Read digital content
Download allowed resources
Save notes
Bookmark content
Practice questions
Submit homework
Submit assignments
Take tests
View feedback
Track chapter completion
View weak and strong areas
Receive remedial content
Ask doubts
Resume learning
11. Assessment engine
Assessment types
Diagnostic
Formative
Summative
Practice quiz
Chapter test
Unit test
Term examination
Final examination
Olympiad practice
Competency assessment
Homework quiz
Assessment settings
Name
Description
Instructions
Class
Section
Subject
Book
Unit
Chapter
Duration
Start and end time
Total marks
Passing marks
Number of attempts
Random question order
Random option order
Show answers
Show results
Negative marking
Proctoring settings, future
Draft or Published
Evaluation
Automatic
MCQ
Multiple select
True/False
Fill in blanks with controlled answers
Matching
Manual
Short answers
Long answers
Projects
Practical work
Uploaded assignments
Rubrics
Criteria
Performance level
Marks
Teacher comments
12. Reports and analytics
12.1 Student report

Includes:

Student information
School and class
Attendance
Homework completion
Assignment completion
Assessment scores
Subject performance
Unit performance
Chapter performance
Learning-outcome mastery
Competency performance
Strong areas
Weak areas
Teacher remarks
Remedial recommendation
Progress trend
Downloadable PDF
12.2 Class report

Includes:

Number of students
Average attendance
Average assessment score
Homework completion
Top-performing students
Students requiring support
Subject comparison
Chapter mastery
Learning-outcome mastery
Question-level analysis
12.3 Teacher report

Includes:

Assigned classes
Lessons planned
Lessons completed
Syllabus completion
Homework assigned
Evaluation turnaround
Attendance completion
Resource usage
AI tool usage
Student performance trend

This should be used carefully as an academic-support report, not solely as an employee-rating mechanism.

12.4 School report

Includes:

Total students
Total teachers
Active classes
Attendance rate
Subject performance
Class performance
Teacher activity
Assessment completion
Homework completion
Digital-resource usage
Book adoption
Login activity
Academic progress
12.5 Publisher report

Includes:

Schools onboarded
Active schools
Books adopted
Teacher activation
Student activation
Most-used books
Most-used chapters
Resource downloads
Video views
Assessment usage
AI generations
School engagement
Geographic adoption
Content-performance indicators
13. Report generation

Reports should support:

On-screen view
PDF export
CSV export
Excel export
Print
Email delivery
Scheduled reports
School logo
Publisher branding
Date range
Academic session
Class and section filters
Subject filters

Report statuses:

Generating
Ready
Failed
Archived

Large reports should be generated asynchronously.

14. Communication and notifications
Notification types
Homework assigned
Homework due
Assessment scheduled
Result published
Student absent
New resource available
Announcement
Teacher approval
Student activation
Password reset
Report ready
Channels

Version 1:

In-app
Email

Future:

SMS
WhatsApp
Push notification
Announcement audiences
Entire school
Teachers
Students
Parents
Class
Section
Selected users
15. AI architecture

The existing provider-neutral AI orchestration should remain.

User configuration
      ↓
Permission and quota check
      ↓
Curriculum knowledge collector
      ↓
Prompt builder
      ↓
AI provider
      ↓
Structured response validation
      ↓
Editable draft
      ↓
Teacher approval
      ↓
Publication or assignment
AI tools
Teacher AI
Lesson plan
Worksheet
Question paper
Quiz
Activity
Learning outcomes
Remedial worksheet
Rubric
Feedback
Chapter summary
Student AI
Explain a concept
Simplify content
Give examples
Generate practice
Ask a doubt
Translate explanation
Create revision notes

Student AI should be limited to approved book and curriculum content wherever possible.

AI safety
No direct automatic publication
Teacher review required
Content validation
Age-appropriate prompts
Tenant isolation
Usage limits
Audit logging
No exposure of another school’s data
Clear AI-generated label
16. Core database model blueprint

Primary new models:

AcademicSession
SchoolClass
ClassSection
SchoolSubject
ClassSubject
TeacherAssignment
StudentEnrollment

BookUnit
BookChapter
BookModule
ChapterTopic
LearningOutcome
ChapterActivity
Exercise
ExerciseQuestion

VideoContent
VideoProgress
ContentProgress
StudentNote

Homework
HomeworkAssignment
HomeworkSubmission

Assignment
AssignmentSubmission
AssignmentRubric

Assessment
AssessmentSection
AssessmentQuestion
AssessmentAttempt
StudentAnswer
Evaluation

AttendanceRecord
SyllabusProgress

Announcement
Notification

Parent
ParentStudent

GeneratedReport
ReportSchedule

Existing model names should be reused wherever already present. Before implementation, Copilot must audit the complete Prisma schema and avoid creating duplicate models.

17. Essential relationship rules
Every school-owned record must contain or derive a schoolId.
Every publisher-owned record must contain or derive a publisherId.
Client-submitted tenant IDs must never be trusted.
Every descendant must be verified through its complete ownership chain.
Student records must be limited to their school.
Teachers must access only assigned classes and subjects.
Students must access only assigned books, content and assessments.
Parent access must be limited to linked children.
Publisher Admins must not see another publisher’s content.
School Admins must not access another school.
18. Permissions matrix
Feature	Publisher Admin	School Admin	Teacher	Student	Parent
Manage books	Yes	No	No	No	No
Manage units/chapters	Yes	No	No	No	No
Assign books to school	Yes	Limited	No	No	No
Manage classes	No	Yes	No	No	No
Manage teachers	Approve	Yes	No	No	No
Manage students	No	Yes	Limited	No	No
Create lesson plans	Templates	No	Yes	No	No
Create homework	No	No	Yes	No	No
Submit homework	No	No	No	Yes	No
Create assessments	Templates	Limited	Yes	No	No
Attempt assessments	No	No	Preview	Yes	No
View student reports	Aggregate	Yes	Assigned	Own	Linked child
View publisher reports	Yes	No	No	No	No
19. Audit logging

Audit these operations:

Academic structure creation and deletion
Book publication
Content publication
School approval
Teacher approval
Student activation
Class and section changes
Teacher assignments
Student enrollment
Homework publication
Assessment publication
Result publication
Manual mark changes
Report generation
Cross-tenant denial
AI generation
File deletion
Video deletion
Permission changes

Audit records should remain append-only.

20. File and video storage

Use Cloudflare R2 for:

Book covers
Sample PDFs
Teacher resources
Student resources
Homework attachments
Assignment submissions
Images
Audio
Videos where suitable
Generated reports

Requirements:

Presigned uploads
MIME validation
File-size limits
Ownership checks
Same-origin asset serving where needed
Private access for restricted files
Cleanup jobs
Replacement and deletion safety
Storage audit logs

For high-volume video delivery, Cloudflare Stream or a dedicated video service should be considered instead of serving all large videos directly from R2.

21. Search

Global and role-based search should include:

Books
Units
Chapters
Modules
Topics
Resources
Videos
Questions
Students
Teachers
Schools
Assessments

Filters:

Class
Subject
Board
Book
Unit
Chapter
Resource type
Published status
Academic session
22. User experience principles

Because many users may not be technically advanced:

Use plain language
Use large buttons
Minimize required steps
Avoid technical database terminology
Provide guided setup
Use progress indicators
Use smart defaults
Save drafts automatically where safe
Show clear success and error messages
Make mobile screens fully usable
Use empty-state guidance
Include confirmation for destructive actions
Avoid exposing raw IDs
23. Pilot-ready definition

The platform will be ready for school pilot only when all critical items below pass.

Publisher
Book CRUD
Unit CRUD
Chapter CRUD
Module CRUD
Learning outcomes
Activities
Exercises
Question bank
Video links
Resource uploads
Content publishing
School book assignment
School
Academic session
Classes
Sections
Teachers
Students
Subject assignments
Book assignments
Teacher assignments
Basic timetable
Announcements
Teacher
Assigned classes
Assigned subjects
Content access
Lesson plans
Attendance
Homework
Assignments
Assessments
Evaluation
Class progress
Reports
Student
Activation
Assigned books
Unit/chapter/module learning
Video playback
Resources
Homework submission
Assignment submission
Assessment attempts
Results
Progress
Reports
Student report
Class report
Teacher academic-activity report
School summary report
Publisher usage report
PDF export
Platform
Tenant isolation
Audit events
Email delivery
Password reset
R2 storage
Backups
Monitoring
Error handling
Mobile responsiveness
24. Recommended implementation roadmap
Phase 1 — Curriculum foundation

Build:

BookUnit
BookModule
Topic structure
Exercise structure
Question ordering
Curriculum-tree interface
Reordering
Publishing
Migration of existing chapter content

This phase must be completed first.

Phase 2 — Media and lesson content

Build:

Video content
Video links
Transcripts
Completion tracking
Module resources
Rich lesson content
Student notes
Bookmarks
Content progress
Phase 3 — School academic management

Build:

Academic sessions
Classes
Sections
Subjects
Teacher assignment
Student enrollment
Book assignment
Class setup wizard
Phase 4 — Teacher LMS

Build:

My Classes
Lesson planning
Attendance
Homework
Assignments
Syllabus tracker
Teacher resources
Teacher AI integration
Phase 5 — Student LMS

Build:

My Subjects
Learning player
Videos
Resources
Homework
Assignments
Notes
Bookmarks
Progress tracking
Phase 6 — Assessment engine

Build:

Question bank expansion
Assessment builder
Scheduling
Student attempt interface
Auto-evaluation
Manual evaluation
Results
Phase 7 — Reports

Build:

Student reports
Class reports
Teacher reports
School reports
Publisher reports
PDF/CSV/Excel exports
Phase 8 — Communication and parent access

Build:

Announcements
Notifications
Parent accounts
Parent-student linking
Parent reports
Email notifications
Phase 9 — Pilot hardening

Complete:

Security testing
Tenant-isolation testing
Performance testing
Mobile testing
Accessibility review
Data backup verification
Error monitoring
Pilot data preparation
Staff training
User guides
25. Development rule

Do not attempt all phases in one Copilot task.

Each phase should follow:

Audit existing architecture
        ↓
Design schema and migration
        ↓
Review migration
        ↓
Implement server layer
        ↓
Implement UI
        ↓
Add tests
        ↓
Run full validation
        ↓
Commit separately
        ↓
Deploy safely
        ↓
Run smoke tests

No production migration should be applied until its schema, migration SQL, rollback risk and data impact are reviewed.

26. Immediate next task

The next implementation should be:

Bluegate Education OS
Phase 1.1 — Curriculum Architecture Foundation

Book
→ Unit
→ Chapter
→ Module
→ Topic
→ Learning Outcome
→ Activity
→ Exercise
→ Question

This phase should include:

schema audit
backward-compatible Prisma design
migration preparation
migration of existing chapter relations
Publisher Admin curriculum tree
Unit and Module CRUD
Exercise CRUD
question ordering
tenant isolation
audit events
complete tests

This blueprint should now be treated as the single source of truth for Bluegate Education OS Version 1.0.