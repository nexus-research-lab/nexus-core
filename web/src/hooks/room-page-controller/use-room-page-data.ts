/**
 * =====================================================
 * @File   ：use-room-page-data.ts
 * @Date   ：2026-04-08 11:42:07
 * @Author ：leemysw
 * 2026-04-08 11:42:07   Create
 * =====================================================
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { get_room_contexts } from "@/lib/api/room-api";
import { RoomContextAggregate } from "@/types/conversation/room";

interface UseRoomPageDataOptions {
  room_id?: string | null;
}

export function useRoomPageData({
  room_id,
}: UseRoomPageDataOptions) {
  const [room_contexts, set_room_contexts] = useState<RoomContextAggregate[]>([]);
  const [is_room_loading, set_is_room_loading] = useState(false);
  const [room_error, set_room_error] = useState<string | null>(null);

  const load_room_contexts = useCallback(async (next_room_id: string): Promise<RoomContextAggregate[]> => {
    return get_room_contexts(next_room_id);
  }, []);

  const refresh_room_contexts = useCallback(async (next_room_id: string) => {
    const contexts = await load_room_contexts(next_room_id);
    set_room_contexts(contexts);
    return contexts;
  }, [load_room_contexts]);

  useEffect(() => {
    if (!room_id) {
      set_room_contexts([]);
      set_room_error(null);
      set_is_room_loading(false);
      return;
    }

    let cancelled = false;
    set_is_room_loading(true);
    set_room_error(null);

    const load_room_context = async () => {
      try {
        const contexts = await load_room_contexts(room_id);

        if (cancelled) {
          return;
        }

        set_room_contexts(contexts);
      } catch (error) {
        if (cancelled) {
          return;
        }

        set_room_contexts([]);
        set_room_error(error instanceof Error ? error.message : "加载 room 失败");
      } finally {
        if (!cancelled) {
          set_is_room_loading(false);
        }
      }
    };

    void load_room_context();

    return () => {
      cancelled = true;
    };
  }, [load_room_contexts, room_id]);

  return {
    is_bootstrapped: true,
    room_contexts,
    set_room_contexts,
    room_error,
    is_room_loading,
    refresh_room_contexts,
  };
}
