// Mirrors PRIVILEGED_ROLES in backend/src/common/roles.constants.ts.
// These roles can't be chosen at sign-up; only an admin can assign them.
// The backend enforces this — the list here only shapes the UI.
export const PRIVILEGED_ROLES = [
  "ADMIN",
  "DIRECTOR",
  "PERMANENT_SECETARY_PS",
  "MEDICAL_OFFICER_OF_HEALTH_MOH",
]

export const isPrivilegedRole = (name?: string | null) =>
  !!name && PRIVILEGED_ROLES.includes(name)
