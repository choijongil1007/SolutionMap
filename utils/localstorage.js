const STORAGE_KEY = "solution_map_v3";

const DEFAULT_DATA = {};

export const loadData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load data from local storage", e);
  }
  // Return empty object if no data found
  return {};
};

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data to local storage", e);
  }
};