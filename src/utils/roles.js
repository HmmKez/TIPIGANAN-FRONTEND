// The one place a role's name on screen is decided.
//
// Five roles. "other" (since 2026-11-19) is for people on the school's list who
// are neither students nor teachers, such as a registrar or a guard. They read
// the repository exactly like students and teachers. Where the school's own
// wording is known, it is shown with it: "Other (Registrar)".

export const ROLE_NAMES = {
  student: 'Student',
  teacher: 'Teacher',
  other: 'Other',
  staff: 'Staff',
  super_admin: 'Super Admin',
}

/** Plural, for counts and filters: "Students", "Others". */
export const ROLE_NAMES_PLURAL = {
  student: 'Students',
  teacher: 'Teachers',
  other: 'Others',
  staff: 'Staff',
  super_admin: 'Super Admins',
}

/** Readers: the roles a school list can give. Never staff powers. */
export const READER_ROLES = ['student', 'teacher', 'other']

export function isReaderRole(role) {
  return READER_ROLES.includes(role)
}

/** "Student", "Super Admin", or "Other (Registrar)" when the wording is known. */
export function roleName(role, label) {
  const name = ROLE_NAMES[role] || 'Student'
  return role === 'other' && label ? `${name} (${label})` : name
}
