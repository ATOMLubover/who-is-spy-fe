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
  const roleMap: Record<Role, string> = {
    Admin: "管理员",
    Normal: "平民",
    Blank: "白板",
    Spy: "卧底",
    Observer: "旁观",
  };
  return roleMap[r] || r;
}
