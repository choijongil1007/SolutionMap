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
        title: {
            text: 'Solution Architecture Map',
            left: 'center',
            top: 10,
            textStyle: {
                color: '#64748b',
                fontSize: 14,
                fontWeight: 'normal'
            },
            show: false // Hidden by default, clean look
        },
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
                // visibleMin: 300, // Removed to ensure small shares are visible
                label: {
                    show: true,
                    formatter: '{b}',
                    fontSize: 14,
                    color: '#fff',
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowBlur: 5
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 1,
                    gapWidth: 2
                },
                levels: [
                    {
                        itemStyle: {
                            borderColor: '#e2e8f0',
                            borderWidth: 0,
                            gapWidth: 0
                        },
                        upperLabel: {
                            show: false
                        }
                    },
                    {
                        itemStyle: {
                            borderColor: '#cbd5e1',
                            borderWidth: 5,
                            gapWidth: 2
                        },
                        upperLabel: {
                            show: true,
                            height: 30,
                            color: '#1e293b',
                            fontWeight: 'bold',
                            fontSize: 13
                        }
                    },
                    {
                        colorSaturation: [0.3, 0.6],
                        itemStyle: {
                            borderWidth: 2,
                            gapWidth: 1,
                            borderColorSaturation: 0.7
                        }
                    }
                ],
                data: treemapData.children || [],
                breadcrumb: {
                    show: true,
                    height: 30,
                    bottom: 10,
                    itemStyle: {
                        color: '#f1f5f9',
                        borderColor: '#cbd5e1',
                        borderWidth: 1,
                        textStyle: {
                            color: '#475569'
                        }
                    }
                }
            }
        ]
    };

    chartInstance.setOption(option);
}