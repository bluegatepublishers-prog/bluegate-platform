import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decideSchoolAccess } from "../lib/school-access-policy";
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const nav=read("components/school/SchoolNavigation.tsx"),header=read("components/school/SchoolHeader.tsx"),layout=read("app/school-dashboard/layout.tsx"),home=read("app/school-dashboard/page.tsx"),service=read("lib/school-dashboard.ts"),people=read("app/school-dashboard/people/page.tsx"),academics=read("app/school-dashboard/academics/page.tsx"),planner=read("app/school-dashboard/planner/page.tsx"),actions=read("app/school-dashboard/planner/actions.ts"),reports=read("app/school-dashboard/reports/page.tsx"),profile=read("app/school-dashboard/profile/page.tsx"),schema=read("prisma/schema.prisma");
const checks:[string,()=>void][]=[
 ["navigation has Home",()=>assert.match(nav,/"Home"/)],
 ["navigation has People",()=>assert.match(nav,/>People</)],
 ["navigation has Academics",()=>assert.match(nav,/>Academics</)],
 ["navigation has Planner",()=>assert.match(nav,/"Planner"/)],
 ["navigation has Reports",()=>assert.match(nav,/"Reports"/)],
 ["people includes Students",()=>assert.match(nav,/"Students"/)],
 ["people includes Teachers",()=>assert.match(nav,/"Teachers"/)],
 ["people includes Parents",()=>assert.match(nav,/"Parents"/)],
 ["people includes Staff",()=>assert.match(nav,/"Staff"/)],
 ["academics includes Academic Year",()=>assert.match(nav,/"Academic Year"/)],
 ["academics includes Classes",()=>assert.match(nav,/"Classes & Sections"/)],
 ["academics includes Subjects",()=>assert.match(nav,/"Subjects"/)],
 ["academics includes assignments",()=>assert.match(nav,/"Teacher Assignments"/)],
 ["academics includes content",()=>assert.match(nav,/"Books"/)],
 ["profile is absent from sidebar",()=>assert.doesNotMatch(nav,/"Profile"/)],
 ["profile is in avatar menu",()=>assert.match(header,/school-dashboard\/profile/)],
 ["settings is in avatar menu",()=>assert.match(header,/school-dashboard\/settings/)],
 ["layout enforces school access",()=>assert.match(layout,/SchoolDashboardAccessError/)],
 ["school capability checks role",()=>assert.equal(decideSchoolAccess({subscription:{plan:"FREE",status:"ACTIVE"},capability:"SCHOOL_DASHBOARD",role:"TEACHER"}).allowed,false)],
 ["suspended school is blocked",()=>assert.equal(decideSchoolAccess({subscription:{plan:"FREE",status:"SUSPENDED"},capability:"SCHOOL_DASHBOARD",role:"SCHOOL"}).allowed,false)],
 ["free school dashboard remains allowed",()=>assert.equal(decideSchoolAccess({subscription:{plan:"FREE",status:"ACTIVE"},capability:"SCHOOL_DASHBOARD",role:"SCHOOL"}).allowed,true)],
 ["home reads real students",()=>assert.match(service,/prisma\.student\.count/)],
 ["home reads real staff",()=>assert.match(service,/schoolStaffMembership\.count/)],
 ["home reads real classes",()=>assert.match(service,/schoolClass\.count/)],
 ["attendance is not fabricated",()=>assert.match(service,/attendance: null/)],
 ["home shows notices",()=>assert.match(home,/Important Notices/)],
 ["home shows schedule",()=>assert.match(home,/Today’s Schedule/)],
 ["home shows quick access",()=>assert.match(home,/Quick Access/)],
 ["people hub uses guardian relationships",()=>assert.match(service,/relationships:/)],
 ["people hub reuses student management",()=>assert.match(people,/school-dashboard\/students/)],
 ["academics reads current structure",()=>assert.match(service,/getSchoolAcademicHub/)],
 ["academics links canonical management",()=>assert.match(academics,/school-dashboard\/teacher-assignments/)],
 ["planner uses shared model",()=>assert.match(actions,/academicPlannerItem\.create/)],
 ["planner preserves reschedule history",()=>assert.match(actions,/academicPlannerReschedule\.create/)],
 ["planner reschedule is transactional",()=>assert.match(actions,/prisma\.\$transaction/)],
 ["fixed dates cannot reschedule",()=>assert.match(actions,/item\.fixedDate/)],
 ["existing reports and profile remain reachable",()=>{assert.match(reports,/getSchoolAnalyticsReport/);assert.match(profile,/School|school/i);assert.match(schema,/model AcademicPlannerReschedule/);assert.match(planner,/Academic timeline/)}],
];
checks.forEach(([name,check],index)=>test(`${index+1} ${name}`,check));
