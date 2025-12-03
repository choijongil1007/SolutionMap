
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
                roam: false, // Disable zoom/pan to keep the layout static and box-like
                nodeClick: false, // Disable default drill-down
                breadcrumb: {
                    show: false
                },
                // Base label config for leaf nodes (Solutions)
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
                    // Level 0: 대분류 (Domains / Large Category)
                    // Displays the Domain Name at the top center of the entire block
                    {
                        itemStyle: {
                            borderColor: '#334155',
                            borderWidth: 2, // Thicker border for the main container
                            gapWidth: 6 // Visual gap between different Domains
                        },
                        upperLabel: {
                            show: true,
                            height: 36,
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: '#f8fafc',
                            align: 'center', // Center aligned as requested
                            verticalAlign: 'middle',
                            backgroundColor: '#334155' // Distinct header background
                        }
                    },
                    // Level 1: 중분류 (Categories / Medium Category)
                    // Displays the Category Name at the top center of its sub-block
                    {
                        itemStyle: {
                            borderColor: '#94a3b8',
                            borderWidth: 1,
                            gapWidth: 3 // Visual gap between Categories within a Domain
                        },
                        upperLabel: {
                            show: true,
                            height: 28,
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#1e293b',
                            align: 'center', // Center aligned as requested
                            verticalAlign: 'middle',
                            backgroundColor: '#e2e8f0' // Lighter header background
                        }
                    },
                    // Level 2: 솔루션 (Solutions - Leaves)
                    // Displays the Solution Name inside the box
                    {
                        itemStyle: {
                            gapWidth: 1,
                            borderColorSaturation: 0.7
                        },
                        label: {
                            position: 'inside',
                            align: 'center',
                            verticalAlign: 'middle'
                        },
                        upperLabel: {
                            show: false // No header for leaf nodes
                        }
                    }
                ],
                data: treemapData.children || []
            }
        ]
    };

    chartInstance.setOption(option);
}
