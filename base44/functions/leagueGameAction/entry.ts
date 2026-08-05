import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const normalize = (value) => String(value || '').trim().toLowerCase();
const scheduleFields = ['game_date', 'start_time', 'end_time', 'field_name', 'location', 'status', 'division', 'age_group', 'home_team', 'away_team', 'home_town', 'away_town', 'home_team_id', 'away_team_id'];
const scoreFields = ['home_score', 'away_score', 'period_label', 'period_number', 'clock_display'];

const hasPermission = (memberships, permission) => memberships.some((item) => (item.permissions || []).includes(permission));

const gameMatchesAssignment = (game, assignment) => {
  if (!assignment?.is_active) return false;
  if (assignment.team_id && [game.home_team_id, game.away_team_id].includes(assignment.team_id)) return true;
  const wantedNames = [assignment.team_name, assignment.town_name].map(normalize).filter(Boolean);
  const gameNames = [game.home_team, game.away_team, game.home_town, game.away_town].map(normalize).filter(Boolean);
  const nameMatches = wantedNames.some((name) => gameNames.some((gameName) => gameName === name || gameName.includes(name) || name.includes(gameName)));
  const divisionMatches = !assignment.division || normalize(assignment.division) === normalize(game.division || game.age_group);
  const seasonMatches = !assignment.season || normalize(assignment.season) === normalize(game.season);
  return nameMatches && divisionMatches && seasonMatches;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, league_game_id, actor_account_id, actor_account_name, updates = {}, reason = '' } = body;
    const game = await base44.asServiceRole.entities.LeagueGame.get(league_game_id);
    if (!game) return Response.json({ error: 'Game not found' }, { status: 404 });

    const league = await base44.asServiceRole.entities.VendorAccount.get(game.vendor_account_id);
    const isOwner = !!league && (league.owner_user_id === user.id || league.owner_user_id === user.email || league.owner_email === user.email);

    const memberByAccount = actor_account_id ? await base44.asServiceRole.entities.LeagueMembership.filter({ league_account_id: game.vendor_account_id, member_account_id: actor_account_id, status: 'active' }) : [];
    const memberByUser = await base44.asServiceRole.entities.LeagueMembership.filter({ league_account_id: game.vendor_account_id, member_user_id: user.id, status: 'active' });
    const memberships = [...memberByAccount, ...memberByUser];
    const assignments = actor_account_id ? await base44.asServiceRole.entities.LeagueTeamAssignment.filter({ league_account_id: game.vendor_account_id, team_account_id: actor_account_id, is_active: true }) : [];
    const overrideByAccount = actor_account_id ? await base44.asServiceRole.entities.LeagueGamePermission.filter({ league_game_id: game.id, member_account_id: actor_account_id }) : [];
    const overrideByUser = await base44.asServiceRole.entities.LeagueGamePermission.filter({ league_game_id: game.id, member_user_id: user.id });
    const overrides = [...overrideByAccount, ...overrideByUser];

    const canSchedule = isOwner || hasPermission(memberships, 'edit_schedule') || overrides.some((item) => item.can_edit_schedule);
    const canScore = isOwner || hasPermission(memberships, 'edit_all_game_scores') || overrides.some((item) => item.can_edit_score) ||
      (hasPermission(memberships, 'edit_assigned_game_scores') && assignments.some((assignment) => (assignment.can_submit_scores || assignment.can_edit_assigned_games) && gameMatchesAssignment(game, assignment)));
    const canSubmitFinal = isOwner || hasPermission(memberships, 'submit_final_scores') || overrides.some((item) => item.can_submit_final) || canScore;
    const canUnlock = isOwner || hasPermission(memberships, 'unlock_scores') || overrides.some((item) => item.can_unlock_score);

    const now = new Date().toISOString();
    let patch = {};
    let actionType = action;
    let wasUnlocked = false;

    if (action === 'update_game') {
      const changedSchedule = scheduleFields.some((field) => Object.prototype.hasOwnProperty.call(updates, field) && updates[field] !== game[field]);
      const changedScore = scoreFields.some((field) => Object.prototype.hasOwnProperty.call(updates, field) && updates[field] !== game[field]);
      if (changedSchedule && !canSchedule) return Response.json({ error: 'You do not have schedule edit permission for this game.' }, { status: 403 });
      if (changedScore && !canScore) return Response.json({ error: 'You do not have score edit permission for this game.' }, { status: 403 });
      if (changedScore && game.score_state === 'locked' && !canUnlock) return Response.json({ error: 'This score is locked. Ask league leadership to unlock it.' }, { status: 403 });

      // Server-side playable-field conflict validation (single source of truth).
      const newFieldId = Object.prototype.hasOwnProperty.call(updates, 'league_event_field_id') ? String(updates.league_event_field_id || '') : String(game.league_event_field_id || '');
      if (newFieldId) {
        const field = await base44.asServiceRole.entities.LeagueEventField.get(newFieldId).catch(() => null);
        if (!field) return Response.json({ error: 'The selected field no longer exists.' }, { status: 400 });
        if (field.is_active === false || field.status === 'closed') return Response.json({ error: 'This field is not active and cannot host games.' }, { status: 400 });
        const targetEventId = String(updates.league_event_id || game.league_event_id || '');
        if (targetEventId && String(field.league_event_id || '') && String(field.league_event_id) !== targetEventId) {
          return Response.json({ error: 'This field belongs to a different League Event.' }, { status: 400 });
        }
        const newStart = updates.start_time || game.start_time;
        const newEnd = updates.end_time || game.end_time || newStart;
        const startMs = newStart ? Date.parse(newStart) : 0;
        const endMs = newEnd ? Date.parse(newEnd) : startMs;
        if (startMs) {
          const fieldGames = await base44.asServiceRole.entities.LeagueGame.filter({ vendor_account_id: game.vendor_account_id, league_event_field_id: newFieldId }).catch(() => []);
          const conflicting = fieldGames.find((other) => {
            if (!other || other.id === game.id) return false;
            if (String(other.status || '').toLowerCase() === 'cancelled') return false;
            const oStart = other.start_time ? Date.parse(other.start_time) : 0;
            const oEnd = (other.end_time ? Date.parse(other.end_time) : 0) || oStart;
            if (!oStart) return false;
            return startMs < oEnd && oStart < endMs;
          });
          if (conflicting) {
            const fmt = (v: string) => v ? new Date(v).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
            const matchup = conflicting.game_title || `${conflicting.home_team || ''} vs ${conflicting.away_team || ''}`.trim() || 'a game';
            return Response.json({ error: `Field already has a game scheduled from ${fmt(conflicting.start_time)}${conflicting.end_time ? ` to ${fmt(conflicting.end_time)}` : ''} (${matchup}).` }, { status: 409 });
          }
        }
      }

      patch = { ...updates };
      actionType = changedSchedule && changedScore ? 'schedule_and_score_edit' : changedSchedule ? 'schedule_edit' : changedScore ? 'score_edit' : 'game_edit';
    } else if (action === 'submit_final_score') {
      if (!canSubmitFinal) return Response.json({ error: 'You do not have permission to submit final scores.' }, { status: 403 });
      patch = { ...updates, status: updates.status || 'final', score_state: 'locked', score_submitted_by_user_id: user.id, score_submitted_by_email: user.email, score_submitted_by_account_id: actor_account_id || '', score_submitted_at: now, score_locked_at: now };
      actionType = 'final_submission';
    } else if (action === 'unlock_score') {
      if (!canUnlock) return Response.json({ error: 'You do not have permission to unlock scores.' }, { status: 403 });
      if (!String(reason || '').trim()) return Response.json({ error: 'Unlock reason is required.' }, { status: 400 });
      patch = { score_state: 'draft', score_unlocked_at: now, score_unlocked_by_user_id: user.id, score_unlock_reason: reason };
      actionType = 'unlock';
      wasUnlocked = true;
    } else {
      return Response.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    const previousSchedule = { game_date: game.game_date, start_time: game.start_time, end_time: game.end_time, field_name: game.field_name, location: game.location, status: game.status };
    const updated = await base44.asServiceRole.entities.LeagueGame.update(game.id, patch);
    const newSchedule = { game_date: updated.game_date, start_time: updated.start_time, end_time: updated.end_time, field_name: updated.field_name, location: updated.location, status: updated.status };

    await base44.asServiceRole.entities.LeagueGameAuditLog.create({
      league_game_id: game.id,
      action_type: actionType,
      previous_home_score: Number(game.home_score || 0),
      new_home_score: Number(updated.home_score || 0),
      previous_away_score: Number(game.away_score || 0),
      new_away_score: Number(updated.away_score || 0),
      previous_status: game.status || '',
      new_status: updated.status || '',
      previous_date_time: previousSchedule,
      new_date_time: newSchedule,
      edited_by_user_id: user.id,
      edited_by_email: user.email,
      edited_by_account_id: actor_account_id || '',
      edited_by_account_name: actor_account_name || '',
      created_at: now,
      reason,
      was_locked: updated.score_state === 'locked',
      was_unlocked: wasUnlocked,
    });

    return Response.json({ success: true, game: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});