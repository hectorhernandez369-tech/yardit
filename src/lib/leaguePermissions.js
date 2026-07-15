const normalize = (value) => String(value || "").trim().toLowerCase();

export const LEAGUE_PERMISSIONS = [
  "view_full_schedule",
  "edit_schedule",
  "create_games",
  "cancel_games",
  "edit_assigned_game_scores",
  "edit_all_game_scores",
  "submit_final_scores",
  "unlock_scores",
  "assign_team_permissions",
  "invite_team_accounts",
  "invite_league_staff",
  "attach_games_to_events",
  "manage_events",
];

export const ROLE_PRESETS = {
  "Read Only": ["view_full_schedule"],
  "Team Manager": ["view_full_schedule", "edit_assigned_game_scores", "submit_final_scores"],
  Scorekeeper: ["view_full_schedule", "edit_assigned_game_scores", "submit_final_scores"],
  "League Score Manager": ["view_full_schedule", "edit_all_game_scores", "submit_final_scores", "unlock_scores"],
  "Schedule Manager": ["view_full_schedule", "edit_schedule", "create_games", "cancel_games"],
  "League Owner": LEAGUE_PERMISSIONS,
};

export const userOwnsLeagueAccount = (account, user) => !!account && !!user && (
  account.owner_user_id === user.id ||
  account.owner_user_id === user.email ||
  account.owner_email === user.email
);

export const membershipPermissions = (memberships = []) => [...new Set(memberships.flatMap((item) => item.permissions || []))];

export const gameMatchesAssignment = (game, assignment) => {
  if (!game || !assignment?.is_active) return false;
  if (assignment.team_id && [game.home_team_id, game.away_team_id].includes(assignment.team_id)) return true;
  const wantedNames = [assignment.team_name, assignment.town_name].map(normalize).filter(Boolean);
  const gameNames = [game.home_team, game.away_team, game.home_town, game.away_town].map(normalize).filter(Boolean);
  const nameMatches = wantedNames.some((name) => gameNames.some((gameName) => gameName === name || gameName.includes(name) || name.includes(gameName)));
  const divisionMatches = !assignment.division || normalize(assignment.division) === normalize(game.division || game.age_group);
  const seasonMatches = !assignment.season || normalize(assignment.season) === normalize(game.season);
  return nameMatches && divisionMatches && seasonMatches;
};

export const canEditLeagueGameSchedule = ({ isOwner, permissions = [], gamePermissions = [] }) => (
  isOwner || permissions.includes("edit_schedule") || gamePermissions.some((item) => item.can_edit_schedule)
);

export const canEditLeagueGameScore = ({ isOwner, permissions = [], assignments = [], gamePermissions = [], game }) => {
  if (isOwner || permissions.includes("edit_all_game_scores")) return true;
  if (gamePermissions.some((item) => item.can_edit_score)) return true;
  return permissions.includes("edit_assigned_game_scores") && assignments.some((assignment) => (assignment.can_submit_scores || assignment.can_edit_assigned_games) && gameMatchesAssignment(game, assignment));
};

export const canUnlockLeagueGameScore = ({ isOwner, permissions = [], gamePermissions = [] }) => (
  isOwner || permissions.includes("unlock_scores") || gamePermissions.some((item) => item.can_unlock_score)
);