import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Player {
  id: string;
  name: string;
  is_host: boolean;
}

interface RoleAssignment {
  playerId: string;
  playerName: string;
  baseRole: string;
  themedRole: string;
}

interface RoleCounts {
  werewolves: number;
  doctors: number;
  seers: number;
  villagers: number;
}

interface CustomRoleNames {
  werewolf?: string;
  doctor?: string;
  seer?: string;
  villager?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      room_id, 
      theme, 
      language = 'en',
      game_mode = 'mafia',
      role_counts,
      custom_role_names,
      custom_role_map,
    } = await req.json();

    const effectiveCustomRoleNames: CustomRoleNames | undefined = custom_role_names ?? custom_role_map;
    
    if (!room_id || !theme) {
      throw new Error('room_id and theme are required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Backend keys are not configured');
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all players (excluding host)
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, is_host')
      .eq('room_id', room_id)
      .eq('is_host', false);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    if (!players || players.length === 0) {
      throw new Error('No players found in the room');
    }

    console.log(`Found ${players.length} players for room ${room_id}`);
    console.log('Settings:', { language, game_mode, role_counts, effectiveCustomRoleNames });

    // Assign base roles with custom counts if provided
    const roleAssignments = assignRoles(players, role_counts);
    console.log('Role assignments:', roleAssignments);

    // Build the language instruction
    const languageInstruction = language === 'he' 
      ? 'IMPORTANT: Your ENTIRE response (all role names, narration, everything) MUST be in Hebrew (עברית). Write naturally in Hebrew.'
      : 'Respond in English.';

    // Build custom role names instruction if provided
    let customNamesInstruction = '';
    if (effectiveCustomRoleNames && Object.values(effectiveCustomRoleNames).some(v => v)) {
      const mappings: string[] = [];
      if (effectiveCustomRoleNames.werewolf) mappings.push(`Werewolf → "${effectiveCustomRoleNames.werewolf}"`);
      if (effectiveCustomRoleNames.doctor) mappings.push(`Doctor → "${effectiveCustomRoleNames.doctor}"`);
      if (effectiveCustomRoleNames.seer) mappings.push(`Seer → "${effectiveCustomRoleNames.seer}"`);
      if (effectiveCustomRoleNames.villager) mappings.push(`Villager → "${effectiveCustomRoleNames.villager}"`);

      customNamesInstruction = `
IMPORTANT: The host has provided custom role names. Use these EXACT names instead of inventing new ones:
${mappings.join('\n')}

For any roles not listed above, you may create themed names.`;
    }

    const gameModeInstruction = game_mode === 'one_night'
      ? 'This is a ONE NIGHT game - all actions happen in a single round, then everyone votes.'
      : 'This is a continuous MAFIA-style game - players are eliminated each round.';

    // Call OpenAI (structured JSON response)
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a creative game narrator for a Werewolf-style party game.

Your job is to:
1) Create themed role names based on the theme (unless the host provided exact custom names).
2) Generate a PHASE-BASED timeline for narration and actions.

${languageInstruction}
${gameModeInstruction}
${customNamesInstruction}

Rules:
- Respond with STRICT VALID JSON only.
- Do NOT wrap the JSON in markdown.
- Do NOT include comments.
- The timeline must be an array named \"timeline\".
- Each timeline item MUST be an object: { phase, text, voice, action }.
- voice MUST be one of: \"alloy\" (neutral narrator), \"onyx\" (deep/tough), \"nova\" (soft/calm).
- action MUST be one of: \"none\", \"vote_kill\", \"vote_save\", \"reveal\".
- Keep each text short (1-2 sentences).`,
          },
          {
            role: 'user',
            content: `Theme: "${theme}"

Players and their base roles:
${roleAssignments.map(r => `- ${r.playerName}: ${r.baseRole}`).join('\n')}

Return JSON in this format:
{
  "themedRoles": {
    "Werewolf": "...",
    "Doctor": "...",
    "Seer": "...",
    "Villager": "..."
  },
  "timeline": [
    { "phase": "intro", "text": "...", "voice": "alloy", "action": "none" },
    { "phase": "werewolf", "text": "...", "voice": "onyx", "action": "vote_kill" },
    { "phase": "doctor", "text": "...", "voice": "nova", "action": "vote_save" },
    { "phase": "morning", "text": "...", "voice": "alloy", "action": "reveal" }
  ]
}

Important:
- If language is Hebrew, EVERYTHING (all strings) must be Hebrew.
- If custom role names were provided, use those EXACT names in ALL texts.`
          }
        ],
        max_completion_tokens: 1200,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate game timeline');
    }

    const aiData = await openAIResponse.json();
    const aiContent = aiData?.choices?.[0]?.message?.content;
    console.log('AI Response:', aiContent);

    // Parse AI response
    let parsedAI: any;
    try {
      if (!aiContent) throw new Error('Empty AI response');
      parsedAI = JSON.parse(aiContent);
      if (!parsedAI?.timeline || !Array.isArray(parsedAI.timeline) || parsedAI.timeline.length === 0) {
        throw new Error('AI response missing timeline');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedAI = {
        themedRoles: {
          Werewolf: effectiveCustomRoleNames?.werewolf || `${theme} Traitor`,
          Doctor: effectiveCustomRoleNames?.doctor || `${theme} Healer`,
          Seer: effectiveCustomRoleNames?.seer || `${theme} Oracle`,
          Villager: effectiveCustomRoleNames?.villager || `${theme} Member`,
        },
        timeline: language === 'he'
          ? [
              { phase: 'intro', text: `הלילה יורד על ${theme}... כולם שקטים, אבל מישהו כאן זומם.`, voice: 'alloy', action: 'none' },
              { phase: 'werewolf', text: `עכשיו אנשי הזאב מתעוררים. בחרו מי ייפגע הלילה.`, voice: 'onyx', action: 'vote_kill' },
              { phase: 'doctor', text: `הרופא מתעורר. את מי אתם מצילים הלילה?`, voice: 'nova', action: 'vote_save' },
              { phase: 'morning', text: `הבוקר מגיע... הגיע הזמן לגלות מה קרה.`, voice: 'alloy', action: 'reveal' },
            ]
          : [
              { phase: 'intro', text: `Night falls on ${theme}... everyone is quiet, but someone is plotting.`, voice: 'alloy', action: 'none' },
              { phase: 'werewolf', text: `Werewolves, wake up. Choose who will be taken tonight.`, voice: 'onyx', action: 'vote_kill' },
              { phase: 'doctor', text: `Doctor, wake up. Who do you save tonight?`, voice: 'nova', action: 'vote_save' },
              { phase: 'morning', text: `Morning comes... time to reveal what happened.`, voice: 'alloy', action: 'reveal' },
            ],
      };
    }

    // Apply custom names if provided (override themedRoles)
    if (effectiveCustomRoleNames) {
      if (effectiveCustomRoleNames.werewolf) parsedAI.themedRoles.Werewolf = effectiveCustomRoleNames.werewolf;
      if (effectiveCustomRoleNames.doctor) parsedAI.themedRoles.Doctor = effectiveCustomRoleNames.doctor;
      if (effectiveCustomRoleNames.seer) parsedAI.themedRoles.Seer = effectiveCustomRoleNames.seer;
      if (effectiveCustomRoleNames.villager) parsedAI.themedRoles.Villager = effectiveCustomRoleNames.villager;
    }

    // Create game session
    const firstTimelineItem = parsedAI.timeline?.[0];
    const initialPhase = (firstTimelineItem?.phase as string | undefined) ?? 'intro';

    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        room_id,
        theme,
        // Keep script for backward compatibility / host display
        script: (firstTimelineItem?.text as string | undefined) ?? null,
        phase: initialPhase,
        timeline: parsedAI.timeline,
        timeline_index: 0,
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create game session: ${sessionError.message}`);
    }

    console.log('Created game session:', session.id);

    // Insert player roles with themed names
    const playerRolesData = roleAssignments.map(r => ({
      session_id: session.id,
      player_id: r.playerId,
      base_role: r.baseRole,
      themed_role: parsedAI.themedRoles[r.baseRole] || r.baseRole,
    }));

    const { error: rolesError } = await supabase
      .from('player_roles')
      .insert(playerRolesData);

    if (rolesError) {
      throw new Error(`Failed to save player roles: ${rolesError.message}`);
    }

    // Update room status using admin client (bypasses RLS)
    const { error: statusError } = await supabaseAdmin
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('id', room_id);

    if (statusError) {
      console.error('Failed to update room status:', statusError);
      throw new Error(`Failed to update room status: ${statusError.message}`);
    }

    console.log('Room status updated to playing for room:', room_id);
    console.log('Game started successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        timeline: parsedAI.timeline,
        themedRoles: parsedAI.themedRoles,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-game-script:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function assignRoles(players: Player[], roleCounts?: RoleCounts): RoleAssignment[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const assignments: RoleAssignment[] = [];

  // Use provided counts or calculate defaults
  let numWerewolves = roleCounts?.werewolves ?? Math.max(1, Math.floor(shuffled.length / 4));
  let numDoctors = roleCounts?.doctors ?? (shuffled.length >= 3 ? 1 : 0);
  let numSeers = roleCounts?.seers ?? (shuffled.length >= 5 ? 1 : 0);

  // Clamp to available players
  const totalSpecialRoles = numWerewolves + numDoctors + numSeers;
  if (totalSpecialRoles > shuffled.length) {
    // Scale down proportionally
    const scale = shuffled.length / totalSpecialRoles;
    numWerewolves = Math.max(1, Math.floor(numWerewolves * scale));
    numDoctors = Math.floor(numDoctors * scale);
    numSeers = Math.floor(numSeers * scale);
  }

  let werewolvesAssigned = 0;
  let doctorsAssigned = 0;
  let seersAssigned = 0;

  for (const player of shuffled) {
    let role: string;

    if (werewolvesAssigned < numWerewolves) {
      role = 'Werewolf';
      werewolvesAssigned++;
    } else if (doctorsAssigned < numDoctors) {
      role = 'Doctor';
      doctorsAssigned++;
    } else if (seersAssigned < numSeers) {
      role = 'Seer';
      seersAssigned++;
    } else {
      role = 'Villager';
    }

    assignments.push({
      playerId: player.id,
      playerName: player.name,
      baseRole: role,
      themedRole: role,
    });
  }

  return assignments;
}
