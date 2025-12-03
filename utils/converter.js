/**
 * Converts internal nested object structure to ECharts Treemap format.
 * @param {Object} data - The user data model
 * @returns {Object} ECharts readable series data
 */
export function convertToTreemap(data) {
    // Check if data is empty
    if (!data || Object.keys(data).length === 0) {
        return { name: "root", children: [] };
    }

    return {
      name: "root",
      children: Object.entries(data).map(([domainName, categories]) => ({
        name: domainName,
        // Calculate total children value for visual sizing logic if needed, 
        // but ECharts handles summing up values automatically.
        children: Object.entries(categories).map(([categoryName, solutions]) => ({
          name: categoryName,
          children: solutions.map((s) => ({
            name: s.name,
            value: s.share,
            // Additional visual properties can be added here
          })),
        })),
      })),
    };
}