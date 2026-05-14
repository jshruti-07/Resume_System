export const LABELS = {
  teamMember: {
    singular: "Team Member",
    plural: "Team Members",
    singularLower: "team member",
    pluralLower: "team members",
    directory: "Team Directory",
    profile: "Team Member Profile",
    management: "Team Management",
    name: "Team Member Name",
    id: "Team Member ID",
    details: "Team Member Details",
  },
} as const;

export const TM = LABELS.teamMember;

export const formatTeamMemberCount = (count: number): string => {
  return `${count} ${count === 1 ? TM.singularLower : TM.pluralLower}`;
};
