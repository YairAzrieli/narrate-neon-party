import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_TEXT_LENGTH = 500;
const ALLOWED_VOICES = ["alloy", "onyx", "nova", "echo", "fable", "shimmer"] as const;

// Validate and sanitize text input
function validateTextInput(text: unknown): { valid: boolean; sanitized?: string; error?: string } {
  if (!text || typeof text !== "string") {
    return { valid: false, error: "text is required and must be a string" };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: "text cannot be empty" };
  }
  
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `text must be ${MAX_TEXT_LENGTH} characters or less` };
  }
  
  // Remove potentially dangerous characters but keep unicode for multi-language support
  const sanitized = trimmed
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, MAX_TEXT_LENGTH);
  
  return { valid: true, sanitized };
}

// Validate voice parameter
function validateVoice(voice: unknown): string {
  if (typeof voice === "string" && ALLOWED_VOICES.includes(voice as any)) {
    return voice;
  }
  return "alloy";
}

// Validate room_id exists in database (rate limiting context)
async function validateRoomContext(roomId: unknown): Promise<{ valid: boolean; error?: string }> {
  if (!roomId || typeof roomId !== "string") {
    return { valid: false, error: "room_id is required for TTS generation" };
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    return { valid: false, error: "Invalid room_id format" };
  }
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify room exists and is in playing state
  const { data: room, error } = await supabase
    .from("game_rooms")
    .select("id, status")
    .eq("id", roomId)
    .single();
  
  if (error || !room) {
    return { valid: false, error: "Room not found" };
  }
  
  if (room.status !== "playing") {
    return { valid: false, error: "TTS only available during active game" };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, voice, room_id } = body;

    // Validate room context (ensures request is tied to active game)
    const roomValidation = await validateRoomContext(room_id);
    if (!roomValidation.valid) {
      return new Response(
        JSON.stringify({ error: roomValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate text input
    const textValidation = validateTextInput(text);
    if (!textValidation.valid) {
      return new Response(
        JSON.stringify({ error: textValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate voice
    const selectedVoice = validateVoice(voice);

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log(`Generating TTS for room: ${room_id}, voice: ${selectedVoice}, text length: ${textValidation.sanitized!.length}`);

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: textValidation.sanitized,
        voice: selectedVoice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS error:", errorText);
      throw new Error(`TTS generation failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`TTS generated successfully, audio size: ${audioBuffer.byteLength} bytes`);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-tts:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
