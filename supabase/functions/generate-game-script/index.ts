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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { room_id, theme } = await req.json();
    
    if (!room_id || !theme) {
      throw new Error('room_id and theme are required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Assign base roles
    const roleAssignments = assignRoles(players);
    console.log('Role assignments:', roleAssignments);

    // Call OpenAI to generate themed roles and opening script
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
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAI = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to simple themed names
      parsedAI = {
        themedRoles: {
          Werewolf: `${theme} Traitor`,
          Doctor: `${theme} Healer`,
          Villager: `${theme} Member`
        },
        openingScript: `Welcome to the world of ${theme}! As darkness falls, secrets lurk in every shadow. Someone among you is not who they seem...`
      };
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

    // Update room status to 'playing'
    await supabase
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('id', room_id);

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

function assignRoles(players: Player[]): RoleAssignment[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const assignments: RoleAssignment[] = [];

  // Calculate number of werewolves (1 per 4 players, minimum 1)
  const numWerewolves = Math.max(1, Math.floor(shuffled.length / 4));
  // Always have 1 doctor if there are at least 3 players
  const hasDoctor = shuffled.length >= 3;

  let werewolvesAssigned = 0;
  let doctorAssigned = false;

  for (const player of shuffled) {
    let role: string;

    if (werewolvesAssigned < numWerewolves) {
      role = 'Werewolf';
      werewolvesAssigned++;
    } else if (!doctorAssigned && hasDoctor) {
      role = 'Doctor';
      doctorAssigned = true;
    } else {
      role = 'Villager';
    }

    assignments.push({
      playerId: player.id,
      playerName: player.name,
      baseRole: role,
      themedRole: role, // Will be updated by AI
    });
  }

  return assignments;
}
