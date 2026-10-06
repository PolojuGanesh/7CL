import { useContext } from "react";
import { RoomContext } from "./RoomContextValue.js";

export function useRoom() {
  const value = useContext(RoomContext);
  if (!value) throw new Error("useRoom must be used within RoomProvider.");
  return value;
}
