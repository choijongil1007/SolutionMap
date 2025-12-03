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
                roam: false, // Disable zoom/pan for static view
                nodeClick: false, // Disable drill-down interactions if strictly viewing layout
                breadcrumb: {
                    show: false // Hide bottom breadcrumb to keep clean
                },
                label: {
                    show: true,
                    formatter: '{b}\n{c}%',
                    fontSize: 13,
                    color: '#fff',
                    lineHeight: 18,
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowBlur: 5
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1
                },
                levels: [
                    // Level 0: 대분류 (Domains)
                    {
                        itemStyle: {
                            borderColor: '#94a3b8',
                            borderWidth: 1,
                            gapWidth: 4 // Gap between Domains
                        },
                        upperLabel: {
                            show: true,
                            height: 40,
                            fontSize: 20, // Bigger font size
                            fontWeight: 'bold',
                            color: '#1e293b',
                            align: 'center', // Center alignment
                            verticalAlign: 'middle',
                            backgroundColor: '#f1f5f9' // Light grey background for header
                        }
                    },
                    // Level 1: 중분류 (Categories)
                    {
                        itemStyle: {
                            borderColor: '#cbd5e1',
                            borderWidth: 1,
                            gapWidth: 2 // Gap between Categories
                        },
                        upperLabel: {
                            show: true, // Show category name as header
                            height: 28,
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#475569',
                            align: 'left',
                            padding: [0, 0, 0, 8],
                            backgroundColor: 'rgba(255, 255, 255, 0.6)' // Semi-transparent header
                        }
                    },
                    // Level 2: 솔루션 (Solutions - Leaves)
                    {
                        itemStyle: {
                            gapWidth: 1,
                            borderColorSaturation: 0.7
                        }
                    }
                ],
                data: treemapData.children || []
            }
        ]
    };

    chartInstance.setOption(option);
}
