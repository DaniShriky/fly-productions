// Nav renders its own copy of the manager's name/photo (fetched once on
// mount), so when ProfileEditForm saves a change on /profile, Nav has no way
// to know — same-page updates need this instead of the full remount that
// navigating to a different page would otherwise cause. Plain DOM
// CustomEvents are simplest here; no other cross-component state exists in
// this app that would justify pulling in a context/store just for this.
export const PROFILE_UPDATED_EVENT = "studio-manager-updated";

export type ProfileUpdateDetail = {
  studioName?: string;
  profileImageUrl?: string | null;
};

export function emitProfileUpdated(detail: ProfileUpdateDetail) {
  window.dispatchEvent(new CustomEvent<ProfileUpdateDetail>(PROFILE_UPDATED_EVENT, { detail }));
}
