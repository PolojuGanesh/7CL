import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "../hooks/useSearchParams.js";
import { apiRequest } from "../api.js";
import { RoomContext } from "./RoomContextValue.js";
const ACTIVE_ROOM_KEY = "7cl-active-room-id";

export function RoomProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { roomId: queryRoomId } = useSearchParams();
  const [selectedRoomId, setSelectedRoomId] = useState(
    () => queryRoomId || window.localStorage.getItem(ACTIVE_ROOM_KEY),
  );
  const activeRoomId = queryRoomId || selectedRoomId;
  const activeRoom = activeRoomId
    ? rooms.find((room) => room._id === activeRoomId) ?? null
    : rooms[0] ?? null;

  const refreshRooms = useCallback(async (preferredRoomId) => {
    const { rooms: nextRooms } = await apiRequest("/rooms");
    setRooms(nextRooms);
    setError("");
    const selected = nextRooms.find((room) => room._id === (preferredRoomId ?? activeRoomId)) ?? nextRooms[0];
    if (selected) {
      window.localStorage.setItem(ACTIVE_ROOM_KEY, selected._id);
      setSelectedRoomId(selected._id);
    }
    return { rooms: nextRooms, activeRoom: selected ?? null };
  }, [activeRoomId]);

  const selectRoom = useCallback((room) => {
    window.localStorage.setItem(ACTIVE_ROOM_KEY, room._id);
    setSelectedRoomId(room._id);
    setRooms((current) => [room, ...current.filter((item) => item._id !== room._id)]);
  }, []);

  const updateRoom = useCallback((room) => {
    setRooms((current) => current.map((item) => item._id === room._id ? room : item));
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/rooms")
      .then(({ rooms: nextRooms }) => {
        if (!active) return;
        setRooms(nextRooms);
        setError("");
        const selected = nextRooms.find((room) => room._id === activeRoomId) ?? nextRooms[0];
        if (selected) {
          window.localStorage.setItem(ACTIVE_ROOM_KEY, selected._id);
          setSelectedRoomId(selected._id);
        }
      })
      .catch((error) => {
        if (active) setError(error.message ?? "Could not load your rooms.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [activeRoomId]);

  const value = useMemo(() => ({
    rooms,
    activeRoom,
    loading,
    error,
    refreshRooms,
    selectRoom,
    updateRoom,
  }), [rooms, activeRoom, loading, error, refreshRooms, selectRoom, updateRoom]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
