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
      custom_role_names 
    } = await req.json();
    
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
    console.log('Settings:', { language, game_mode, role_counts, custom_role_names });

    // Assign base roles with custom counts if provided
    const roleAssignments = assignRoles(players, role_counts);
    console.log('Role assignments:', roleAssignments);

    // Build the language instruction
    const languageInstruction = language === 'he' 
      ? 'IMPORTANT: Your ENTIRE response (all role names, opening script, everything) MUST be in Hebrew (עברית). Write naturally in Hebrew.'
      : 'Respond in English.';

    // Build custom role names instruction if provided
    let customNamesInstruction = '';
    if (custom_role_names && Object.values(custom_role_names).some(v => v)) {
      const mappings: string[] = [];
      if (custom_role_names.werewolf) mappings.push(`Werewolf → "${custom_role_names.werewolf}"`);
      if (custom_role_names.doctor) mappings.push(`Doctor → "${custom_role_names.doctor}"`);
      if (custom_role_names.seer) mappings.push(`Seer → "${custom_role_names.seer}"`);
      if (custom_role_names.villager) mappings.push(`Villager → "${custom_role_names.villager}"`);
      
      customNamesInstruction = `
IMPORTANT: The host has provided custom role names. Use these EXACT names instead of inventing new ones:
${mappings.join('\n')}

For any roles not listed above, you may create themed names.`;
    }

    const gameModeInstruction = game_mode === 'one_night'
      ? 'This is a ONE NIGHT game - all actions happen in a single round, then everyone votes.'
      : 'This is a continuous MAFIA-style game - players are eliminated each round.';

    // Call OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a creative game narrator for a Werewolf-style party game. Your job is to:
1. Reinvent the game roles based on the given theme
2. Generate a short, funny, and dramatic opening narration for the "Night" phase

${languageInstruction}
${gameModeInstruction}
${customNamesInstruction}

Be creative and entertaining! The narration should be 2-3 sentences max.`
          },
          {
            role: 'user',
            content: `Theme: "${theme}"

Players and their base roles:
${roleAssignments.map(r => `- ${r.playerName}: ${r.baseRole}`).join('\n')}

Please respond in this exact JSON format:
{
  "themedRoles": {
    "Werewolf": "themed name for werewolf",
    "Doctor": "themed name for doctor",
    "Seer": "themed name for seer",
    "Villager": "themed name for villager"
  },
  "openingScript": "Your dramatic opening narration here..."
}`
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate game script');
    }

    const aiData = await openAIResponse.json();
    const aiContent = aiData.choices[0].message.content;
    console.log('AI Response:', aiContent);

    // Parse AI response
    let parsedAI;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAI = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedAI = {
        themedRoles: {
          Werewolf: custom_role_names?.werewolf || `${theme} Traitor`,
          Doctor: custom_role_names?.doctor || `${theme} Healer`,
          Seer: custom_role_names?.seer || `${theme} Oracle`,
          Villager: custom_role_names?.villager || `${theme} Member`
        },
        openingScript: language === 'he' 
          ? `ברוכים הבאים לעולם של ${theme}! כשהחושך יורד, סודות אורבים בכל צל. מישהו ביניכם אינו מי שהוא נראה...`
          : `Welcome to the world of ${theme}! As darkness falls, secrets lurk in every shadow. Someone among you is not who they seem...`
      };
    }

    // Apply custom names if provided
    if (custom_role_names) {
      if (custom_role_names.werewolf) parsedAI.themedRoles.Werewolf = custom_role_names.werewolf;
      if (custom_role_names.doctor) parsedAI.themedRoles.Doctor = custom_role_names.doctor;
      if (custom_role_names.seer) parsedAI.themedRoles.Seer = custom_role_names.seer;
      if (custom_role_names.villager) parsedAI.themedRoles.Villager = custom_role_names.villager;
    }

    // Create game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        room_id,
        theme,
        script: parsedAI.openingScript,
        phase: 'night'
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
        script: parsedAI.openingScript,
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
