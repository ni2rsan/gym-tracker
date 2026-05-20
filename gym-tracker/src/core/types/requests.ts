export interface UserRequestItem {
  id: string;
  type: "BUG" | "FEATURE";
  status: "IN_REVIEW" | "ACCEPTED" | "DECLINED" | "DEPLOYED";
  text: string;
  screenshotBase64?: string | null;
  adminNote?: string | null;
  createdAt: string; // ISO string
  userName?: string; // admin view only
  userEmail?: string; // admin view only
}
