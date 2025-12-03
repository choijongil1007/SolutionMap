
import { convertToTreemap } from '../utils/converter.js';
import { store } from './data_model.js';

let chartInstance = null;

export function initTreemap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Initialize ECharts instance
    chartInstance = echarts.init(container);

    // Initial render
    render(store.getData());

    // Subscribe to store updates
    store.subscribe((data) => {
        render(data);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (chartInstance) {
            chartInstance.resize();
        }
    });
}

function render(data) {
    if (!chartInstance) return;

    const emptyState = document.getElementById('empty-state');
    
    // Check if data is effectively empty
    const hasData = data && Object.keys(data).length > 0;
    
    if (!hasData) {
        if (emptyState) emptyState.classList.remove('hidden');
        chartInstance.clear();
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
    }

    const treemapData = convertToTreemap(data);

    const option = {
        tooltip: {
            className: 'echarts-tooltip',
            formatter: function (info) {
                var value = info.value;
                var treePathInfo = info.treePathInfo;
                var treePath = [];
                for (var i = 1; i < treePathInfo.length; i++) {
                    treePath.push(treePathInfo[i].name);
                }
                
                return `
                    <div class="tooltip-title">${echarts.format.encodeHTML(treePath.join(' > '))}</div>
                    <div class="text-xs text-slate-500 mb-1">점유율</div>
                    <div class="tooltip-value">${echarts.format.addCommas(value)}%</div>
                `;
            }
        },
        series: [
            {
                name: 'Solution Map',
                type: 'treemap',
                width: '100%',
                height: '100%',
                roam: false, // Zoom/Pan disabled
                nodeClick: false, // Disable drill-down to keep full view
                breadcrumb: {
                    show: false
                },
                // Default label config for leaf nodes (Solutions)
                label: {
                    show: true,
                    formatter: '{b}\n{c}%',
                    fontSize: 13,
                    fontWeight: 'normal',
                    color: '#fff',
                    align: 'center',
                    verticalAlign: 'middle'
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1
                },
                // Levels configuration to mimic Google Sheets Treemap styling
                levels: [
                    // Level 0: Domain (e.g., 코어뱅킹)
                    {
                        itemStyle: {
                            borderColor: '#334155',
                            borderWidth: 1,
                            gapWidth: 6 // Distinct gap between domains
                        },
                        upperLabel: {
                            show: true,
                            height: 32, // Header height
                            fontSize: 15,
                            fontWeight: 'bold',
                            color: '#fff',
                            backgroundColor: '#334155', // Dark background for Domain Header
                            align: 'center',
                            verticalAlign: 'middle'
                        }
                    },
                    // Level 1: Category (e.g., 운영체제, 데이터베이스)
                    {
                        itemStyle: {
                            borderColor: '#cbd5e1',
                            borderWidth: 1,
                            gapWidth: 3 // Smaller gap between categories
                        },
                        upperLabel: {
                            show: true,
                            height: 26, // Slightly smaller header
                            fontSize: 13,
                            fontWeight: '600',
                            color: '#1e293b',
                            backgroundColor: '#e2e8f0', // Light background for Category Header
                            align: 'center',
                            verticalAlign: 'middle'
                        }
                    },
                    // Level 2: Solution (Leaf nodes)
                    {
                        itemStyle: {
                            gapWidth: 1,
                            borderColorSaturation: 0.7
                        },
                        label: {
                            position: 'inside', // Text inside the box
                            formatter: '{b}\n{c}%'
                        },
                        upperLabel: {
                            show: false
                        }
                    }
                ],
                data: treemapData.children || []
            }
        ]
    };

    chartInstance.setOption(option);
}
