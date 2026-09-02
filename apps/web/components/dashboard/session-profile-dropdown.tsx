"use client";

import ProfileDropdown from "./profile-dropdown";
import { useProfileAvatar } from "./use-profile-avatar";
import { useSessionProfile } from "./use-session-profile";

type SessionProfileDropdownProps = {
  profileName: string;
  profileRole: string;
  avatarText: string;
  avatarClassName: string;
};

export default function SessionProfileDropdown({
  profileName,
  profileRole,
  avatarText,
  avatarClassName,
}: SessionProfileDropdownProps) {
  const sessionProfile = useSessionProfile({
    name: profileName,
    role: profileRole,
    avatarText,
  });
  const avatarUrl = useProfileAvatar();

  return (
    <ProfileDropdown
      profileName={sessionProfile.name}
      profileRole={sessionProfile.role}
      avatarText={sessionProfile.avatarText}
      avatarClassName={avatarClassName}
      avatarUrl={avatarUrl}
    />
  );
}
