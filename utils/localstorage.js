const STORAGE_KEY = "solution_map_v1";

const DEFAULT_DATA = {
  "AI 분석계": {
    "데이터 수집 / ETL": [
      { "name": "Kafka", "share": 40 },
      { "name": "Airbyte", "share": 30 },
      { "name": "Fivetran", "share": 30 }
    ],
    "데이터 저장": [
        { "name": "Snowflake", "share": 40 },
        { "name": "BigQuery", "share": 60 }
    ]
  }
};

export const loadData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load data from local storage", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA)); // Deep copy
};

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data to local storage", e);
  }
};