export function useSearchParams() {
  const search = window.location.search;
  const params = new URLSearchParams(search);
  return { roomId: params.get("roomId") };
}
