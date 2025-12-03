
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
                roam: false, // Zoom/Pan disabled for fixed layout
                nodeClick: false, // Drill-down disabled to show full hierarchy at once
                breadcrumb: {
                    show: false
                },
                // Default label config for leaf nodes (Solutions)
                label: {
                    show: true,
                    formatter: '{b}\n{c}%',
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#fff',
                    lineHeight: 20,
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowBlur: 5
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1
                },
                levels: [
                    // Level 0: 대분류 (Domains)
                    // Outer box with Dark Header at Top Center
                    {
                        itemStyle: {
                            borderColor: '#1e293b', // Dark Slate Border
                            borderWidth: 2,
                            gapWidth: 8 // Large gap between Domains
                        },
                        upperLabel: {
                            show: true,
                            height: 40,
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: '#f8fafc', // Light Text
                            backgroundColor: '#1e293b', // Dark Header Background
                            align: 'center',
                            verticalAlign: 'middle',
                            padding: [0, 10]
                        }
                    },
                    // Level 1: 중분류 (Categories)
                    // Inner box with Light Header at Top Center
                    {
                        itemStyle: {
                            borderColor: '#94a3b8',
                            borderWidth: 1,
                            gapWidth: 4 // Medium gap between Categories
                        },
                        upperLabel: {
                            show: true,
                            height: 30,
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#334155', // Dark Text
                            backgroundColor: '#e2e8f0', // Light Header Background
                            align: 'center',
                            verticalAlign: 'middle'
                        }
                    },
                    // Level 2: 솔루션 (Solutions)
                    // Leaf nodes displaying Name and Share
                    {
                        itemStyle: {
                            gapWidth: 1, // Small gap between Solutions
                            borderColorSaturation: 0.7
                        },
                        label: {
                            position: 'inside',
                            align: 'center',
                            verticalAlign: 'middle',
                            formatter: '{b}\n{c}%'
                        },
                        upperLabel: {
                            show: false // No header for solutions themselves
                        }
                    }
                ],
                data: treemapData.children || []
            }
        ]
    };

    chartInstance.setOption(option);
}
