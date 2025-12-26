import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode } from '@/lib/gameUtils';

export interface Player {
  id: string;
  name: string;
  avatar_url: string | null;
  is_host: boolean;
  joined_at: string;
}

export interface GameRoom {
  id: string;
  room_code: string;
  status: string;
  theme: string | null;
  created_at: string;
}

export const useGameRoom = (roomCode?: string) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const code = generateRoomCode();
      const { data: roomData, error: createError } = await supabase
        .from('game_rooms')
        .insert({ room_code: code })
        .select()
        .single();

      if (createError) throw createError;

      // Add host as "Narrator" (no name/avatar needed)
      await supabase
        .from('players')
        .insert({ room_id: roomData.id, name: 'Narrator', avatar_url: null, is_host: true });

      setRoom(roomData);
      return roomData;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (code: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('game_rooms')
        .select()
        .eq('room_code', code.toUpperCase())
        .single();

      if (fetchError) throw new Error('Room not found');
      setRoom(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (roomId: string, name: string, avatarUrl: string | null, isHost: boolean = false) => {
    const { data, error: insertError } = await supabase
      .from('players')
      .insert({ room_id: roomId, name, avatar_url: avatarUrl, is_host: isHost })
      .select()
      .single();

    if (insertError) throw insertError;
    return data;
  };

  const uploadAvatar = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed');
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File must be smaller than 5MB');
    }
    
    // Map MIME type to safe extension
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const fileExt = mimeToExt[file.type] || 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Subscribe to players and room status in real-time
  useEffect(() => {
    if (!room?.id) return;

    // Fetch initial players
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select()
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });
      
      if (data) setPlayers(data);
    };

    fetchPlayers();

    // Set up realtime subscription for players
    const playersChannel = supabase
      .channel(`room-players-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === 'DELETE') {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Set up realtime subscription for room status
    const roomChannel = supabase
      .channel(`room-status-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const newRoom = payload.new as GameRoom;
          setRoom(newRoom);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [room?.id]);

  return {
    room,
    players,
    loading,
    error,
    createRoom,
    joinRoom,
    addPlayer,
    uploadAvatar,
  };
};
