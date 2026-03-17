/** localStorage key used to persist the active game UUID across page loads. */
const KEY = 'cultGameId';

export const getGameId = (): string | null => localStorage.getItem(KEY);
export const setGameId = (id: string): void => localStorage.setItem(KEY, id);
export const clearGameId = (): void => localStorage.removeItem(KEY);
