import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_THEME_LENGTH = 100;
const MAX_ROLE_NAME_LENGTH = 50;
const MAX_WEREWOLVES = 10;
const MAX_DOCTORS = 5;
const MAX_SEERS = 5;
const ALLOWED_LANGUAGES = ['en', 'he'];
const ALLOWED_GAME_MODES = ['mafia', 'one_night'];

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

interface TimelineItem {
  phase: string;
  text: string;
  voice: string;
  action: string;
}

// Sanitize string input
function sanitizeString(input: unknown, maxLength: number): string | null {
  if (!input || typeof input !== 'string') return null;
  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .substring(0, maxLength);
}

// Validate UUID format
function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Validate role counts
function validateRoleCounts(counts: unknown, playerCount: number): RoleCounts {
  const c = (counts && typeof counts === 'object') ? counts as Record<string, unknown> : {};
  
  let werewolves = typeof c.werewolves === 'number' ? Math.min(Math.max(0, Math.floor(c.werewolves)), MAX_WEREWOLVES) : Math.max(1, Math.floor(playerCount / 4));
  let doctors = typeof c.doctors === 'number' ? Math.min(Math.max(0, Math.floor(c.doctors)), MAX_DOCTORS) : (playerCount >= 3 ? 1 : 0);
  let seers = typeof c.seers === 'number' ? Math.min(Math.max(0, Math.floor(c.seers)), MAX_SEERS) : (playerCount >= 5 ? 1 : 0);
  
  // Ensure we don't exceed player count
  const totalSpecial = werewolves + doctors + seers;
  if (totalSpecial > playerCount) {
    const scale = playerCount / totalSpecial;
    werewolves = Math.max(1, Math.floor(werewolves * scale));
    doctors = Math.floor(doctors * scale);
    seers = Math.floor(seers * scale);
  }
  
  const villagers = Math.max(0, playerCount - werewolves - doctors - seers);
  
  return { werewolves, doctors, seers, villagers };
}

// Validate custom role names
function validateCustomRoleNames(names: unknown): CustomRoleNames | null {
  if (!names || typeof names !== 'object') return null;
  
  const n = names as Record<string, unknown>;
  const result: CustomRoleNames = {};
  
  if (n.werewolf) {
    const sanitized = sanitizeString(n.werewolf, MAX_ROLE_NAME_LENGTH);
    if (sanitized) result.werewolf = sanitized;
  }
  if (n.doctor) {
    const sanitized = sanitizeString(n.doctor, MAX_ROLE_NAME_LENGTH);
    if (sanitized) result.doctor = sanitized;
  }
  if (n.seer) {
    const sanitized = sanitizeString(n.seer, MAX_ROLE_NAME_LENGTH);
    if (sanitized) result.seer = sanitized;
  }
  if (n.villager) {
    const sanitized = sanitizeString(n.villager, MAX_ROLE_NAME_LENGTH);
    if (sanitized) result.villager = sanitized;
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

// STEP A: Assign roles based on EXACT settings
function assignRoles(players: Player[], roleCounts: RoleCounts): RoleAssignment[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const assignments: RoleAssignment[] = [];

  let werewolvesAssigned = 0;
  let doctorsAssigned = 0;
  let seersAssigned = 0;

  for (const player of shuffled) {
    let role: string;

    if (werewolvesAssigned < roleCounts.werewolves) {
      role = 'Werewolf';
      werewolvesAssigned++;
    } else if (doctorsAssigned < roleCounts.doctors) {
      role = 'Doctor';
      doctorsAssigned++;
    } else if (seersAssigned < roleCounts.seers) {
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

// STEP B: Build timeline PROGRAMMATICALLY based on active roles
function buildTimeline(roleCounts: RoleCounts, gameMode: string): TimelineItem[] {
  const timeline: TimelineItem[] = [];
  
  // 1. Always start with intro
  timeline.push({
    phase: 'intro',
    text: '', // AI will fill this
    voice: 'alloy',
    action: 'none',
  });
  
  // 2. Werewolf phase (always present if werewolves > 0)
  if (roleCounts.werewolves > 0) {
    timeline.push({
      phase: 'werewolf',
      text: '',
      voice: 'onyx',
      action: 'vote_kill',
    });
  }
  
  // 3. Doctor phase ONLY if doctors > 0
  if (roleCounts.doctors > 0) {
    timeline.push({
      phase: 'doctor',
      text: '',
      voice: 'nova',
      action: 'vote_save',
    });
  }
  
  // 4. Seer phase ONLY if seers > 0
  if (roleCounts.seers > 0) {
    timeline.push({
      phase: 'seer',
      text: '',
      voice: 'nova',
      action: 'reveal_role',
    });
  }
  
  // 5. Morning/Reveal phase
  timeline.push({
    phase: 'morning',
    text: '',
    voice: 'alloy',
    action: 'reveal',
  });
  
  // For One Night mode, we're done after morning
  // For Mafia mode, would loop but MVP focuses on one round
  
  return timeline;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      room_id, 
      theme: rawTheme, 
      language: rawLanguage,
      game_mode: rawGameMode,
      role_counts: rawRoleCounts,
      custom_role_names: rawCustomRoleNames,
      custom_role_map: rawCustomRoleMap,
    } = body;

    // Validate room_id
    if (!isValidUUID(room_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing room_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate theme
    const theme = sanitizeString(rawTheme, MAX_THEME_LENGTH);
    if (!theme || theme.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Theme is required and must be 1-100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const language = ALLOWED_LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';
    const gameMode = ALLOWED_GAME_MODES.includes(rawGameMode) ? rawGameMode : 'mafia';
    const effectiveCustomRoleNames = validateCustomRoleNames(rawCustomRoleNames) ?? validateCustomRoleNames(rawCustomRoleMap);
    
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

    // Verify room exists and is in waiting state
    const { data: roomCheck, error: roomError } = await supabaseAdmin
      .from('game_rooms')
      .select('id, status')
      .eq('id', room_id)
      .single();

    if (roomError || !roomCheck) {
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (roomCheck.status !== 'waiting') {
      return new Response(
        JSON.stringify({ error: 'Game already started for this room' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch players (excluding host)
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

    const playerCount = players.length;
    console.log(`Found ${playerCount} players for room ${room_id}`);

    // STEP A: Validate and finalize role counts based on settings
    const roleCounts = validateRoleCounts(rawRoleCounts, playerCount);
    console.log('Final role counts:', roleCounts);

    // STEP A: Assign roles EXACTLY matching settings
    const roleAssignments = assignRoles(players, roleCounts);
    console.log('Role assignments:', roleAssignments.map(r => `${r.playerName}: ${r.baseRole}`));

    // STEP B: Build timeline PROGRAMMATICALLY (no AI hallucination)
    const timeline = buildTimeline(roleCounts, gameMode);
    console.log('Built timeline phases:', timeline.map(t => t.phase));

    // Now ask AI ONLY to fill in narration text for each phase
    const languageInstruction = language === 'he' 
      ? 'IMPORTANT: Your ENTIRE response (all text) MUST be in Hebrew (עברית).'
      : 'Respond in English.';

    let customNamesInstruction = '';
    if (effectiveCustomRoleNames && Object.values(effectiveCustomRoleNames).some(v => v)) {
      const mappings: string[] = [];
      if (effectiveCustomRoleNames.werewolf) mappings.push(`Werewolf → "${effectiveCustomRoleNames.werewolf}"`);
      if (effectiveCustomRoleNames.doctor) mappings.push(`Doctor → "${effectiveCustomRoleNames.doctor}"`);
      if (effectiveCustomRoleNames.seer) mappings.push(`Seer → "${effectiveCustomRoleNames.seer}"`);
      if (effectiveCustomRoleNames.villager) mappings.push(`Villager → "${effectiveCustomRoleNames.villager}"`);
      customNamesInstruction = `Use these custom role names: ${mappings.join(', ')}`;
    }

    const phasesDescription = timeline.map((item, idx) => {
      let desc = `${idx + 1}. Phase "${item.phase}"`;
      if (item.action === 'vote_kill') desc += ' (werewolves choose victim)';
      if (item.action === 'vote_save') desc += ' (doctor saves someone)';
      if (item.action === 'reveal_role') desc += ' (seer sees a role)';
      if (item.action === 'reveal') desc += ' (morning reveal)';
      return desc;
    }).join('\n');

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
            content: `You are a game narrator. Generate ONLY the narration text for each phase.
${languageInstruction}
${customNamesInstruction}

Respond with JSON containing:
1. "themedRoles" - themed names for Werewolf, Doctor, Seer, Villager based on the theme
2. "narrations" - an object with phase names as keys and narration text as values

Example:
{
  "themedRoles": { "Werewolf": "Dark Knight", "Doctor": "Healer", "Seer": "Oracle", "Villager": "Peasant" },
  "narrations": {
    "intro": "Night falls on the kingdom...",
    "werewolf": "Dark Knights, awaken. Choose your victim.",
    "doctor": "Healer, open your eyes. Who will you save?",
    "morning": "The sun rises. Let us see what the night brought."
  }
}

Keep each narration 1-2 sentences. Be dramatic and thematic.`,
          },
          {
            role: 'user',
            content: `Theme: "${theme}"

Generate narrations for these phases:
${phasesDescription}

Return JSON with themedRoles and narrations.`
          }
        ],
        max_completion_tokens: 800,
      }),
    });

    let themedRoles: Record<string, string> = {
      Werewolf: effectiveCustomRoleNames?.werewolf || `${theme} Traitor`,
      Doctor: effectiveCustomRoleNames?.doctor || `${theme} Healer`,
      Seer: effectiveCustomRoleNames?.seer || `${theme} Oracle`,
      Villager: effectiveCustomRoleNames?.villager || `${theme} Member`,
    };

    // Default narrations based on language
    const defaultNarrations: Record<string, Record<string, string>> = {
      en: {
        intro: `Night falls on ${theme}... everyone is quiet, but someone is plotting.`,
        werewolf: `Werewolves, wake up. Choose who will be taken tonight.`,
        doctor: `Doctor, wake up. Who do you save tonight?`,
        seer: `Seer, wake up. Point to someone to learn their role.`,
        morning: `Morning comes... time to reveal what happened.`,
      },
      he: {
        intro: `הלילה יורד על ${theme}... כולם שקטים, אבל מישהו כאן זומם.`,
        werewolf: `זאבים, התעוררו. בחרו מי ייפגע הלילה.`,
        doctor: `רופא, התעורר. את מי אתה מציל הלילה?`,
        seer: `נביא, התעורר. הצבע על מישהו לגלות את תפקידו.`,
        morning: `הבוקר מגיע... הגיע הזמן לגלות מה קרה.`,
      },
    };

    // Try to use AI response, fallback to defaults
    if (openAIResponse.ok) {
      try {
        const aiData = await openAIResponse.json();
        const aiContent = aiData?.choices?.[0]?.message?.content;
        console.log('AI Response:', aiContent);
        
        if (aiContent) {
          const parsed = JSON.parse(aiContent);
          
          // Update themed roles if provided
          if (parsed.themedRoles) {
            themedRoles = {
              Werewolf: effectiveCustomRoleNames?.werewolf || parsed.themedRoles.Werewolf || themedRoles.Werewolf,
              Doctor: effectiveCustomRoleNames?.doctor || parsed.themedRoles.Doctor || themedRoles.Doctor,
              Seer: effectiveCustomRoleNames?.seer || parsed.themedRoles.Seer || themedRoles.Seer,
              Villager: effectiveCustomRoleNames?.villager || parsed.themedRoles.Villager || themedRoles.Villager,
            };
          }
          
          // Fill in narrations
          if (parsed.narrations) {
            for (const item of timeline) {
              if (parsed.narrations[item.phase]) {
                item.text = parsed.narrations[item.phase];
              }
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
    } else {
      console.error('OpenAI API error:', await openAIResponse.text());
    }

    // Fill any missing narrations with defaults
    const langDefaults = defaultNarrations[language] || defaultNarrations.en;
    for (const item of timeline) {
      if (!item.text || item.text.length === 0) {
        item.text = langDefaults[item.phase] || `Phase: ${item.phase}`;
      }
    }

    console.log('Final timeline:', timeline);

    // Create game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        room_id,
        theme,
        script: timeline[0]?.text ?? null,
        phase: timeline[0]?.phase ?? 'intro',
        timeline: timeline,
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
      themed_role: themedRoles[r.baseRole] || r.baseRole,
    }));

    const { error: rolesError } = await supabase
      .from('player_roles')
      .insert(playerRolesData);

    if (rolesError) {
      throw new Error(`Failed to save player roles: ${rolesError.message}`);
    }

    // Update room status
    const { error: statusError } = await supabaseAdmin
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('id', room_id);

    if (statusError) {
      console.error('Failed to update room status:', statusError);
      throw new Error(`Failed to update room status: ${statusError.message}`);
    }

    console.log('Game started successfully!');
    console.log('Role counts used:', roleCounts);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        timeline: timeline,
        themedRoles: themedRoles,
        roleCounts: roleCounts, // Return for debugging
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
