// Intentionally minimal — an admin account has no studio/phone/city fields
// at all, unlike StudioManager. Per Dani, 2026-10-05: the admin's own
// "הפרטים שלי" page should show only a name and a profile photo.
export interface Admin {
  userId: string;
  name?: string;
  profileImagePath?: string;
}
