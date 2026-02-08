export const Role = {
  Admin: "Admin",
  Normal: "Normal",
  Blank: "Blank",
  Spy: "Spy",
  Observer: "Observer",
} as const;

export type Role = "Admin" | "Normal" | "Blank" | "Spy" | "Observer";

export type Player = {
  id: string;
  name: string;
  role: Role;
  word?: string;
};

export function roleToString(r: Role): string {
  return r;
}
