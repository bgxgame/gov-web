<template>
    <div class="dashboard-container">
        <el-row :gutter="0" style="height: 100%;">
            <el-col :span="24" style="height: 100%;">
                <el-card class="map-card" shadow="never">
                    <template #header>
                        <div class="map-header">
                            <div class="header-left">
                                <el-icon style="vertical-align: middle; margin-right: 5px;"><Location /></el-icon>
                                <span style="font-weight: bold;">项目分布地理看板</span>
                            </div>
                            <div class="header-right">
                                <el-button size="small" type="primary" plain @click="backToProvince"
                                    v-if="currentLevel !== 'province'">
                                    返回省级
                                </el-button>
                            </div>
                        </div>
                    </template>
                    <!-- 关键修复：给 map 容器一个计算后的明确高度 -->
                    <div id="project-map" class="chart-div"></div>
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import request from '../../utils/request'
import axios from 'axios'

const currentLevel = ref('province')
let myChart = null

// 加载地图数据并渲染
const initMap = async (adcode, mapName) => {
    try {
        const res = await axios.get(`/map-data/${adcode}.json`)
        const geoJson = res.data

        echarts.registerMap(mapName, geoJson)

        // 获取后端项目坐标数据
        const backendRes = await request.get('/project/map/list', {
            params: { province: '陕西省' } 
        })

        console.log('后端原始数据：', backendRes.data)

        // 格式化数据给 ECharts 散点图
        const scatterData = backendRes.data.map(item => {
            const lng = parseFloat(item.longitude)
            const lat = parseFloat(item.latitude)
            return {
                name: item.projectName,
                value: [lng, lat, item.id, item.address]
            }
        }).filter(item => !isNaN(item.value[0]) && !isNaN(item.value[1]) && item.value[0] !== 0)

        const option = {
            backgroundColor: '#ffffff',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                formatter: (params) => {
                    if(params.seriesType === 'effectScatter') {
                        return `<div style="padding:8px">
                                    <b style="color:#409EFF">${params.name}</b><br/>
                                    地址：${params.value[3] || '暂无'}<br/>
                                    坐标：${params.value[0]}, ${params.value[1]}
                                </div>`
                    }
                    return params.name
                }
            },
            geo: {
                map: mapName,
                roam: true,
                label: {
                    show: true,
                    color: '#666',
                    fontSize: 10
                },
                itemStyle: {
                    areaColor: '#f3f4f6',
                    borderColor: '#409EFF',
                    borderWidth: 0.5
                },
                emphasis: {
                    itemStyle: { areaColor: '#a5d1ff' }
                },
                zlevel: 1
            },
            series: [
                {
                    name: '项目点',
                    type: 'effectScatter',
                    coordinateSystem: 'geo',
                    data: scatterData,
                    symbolSize: 14,
                    showEffectOn: 'render',
                    rippleEffect: {
                        brushType: 'stroke',
                        scale: 4
                    },
                    itemStyle: {
                        color: '#ff4d4f',
                        shadowBlur: 10,
                        shadowColor: '#333'
                    },
                    zlevel: 2
                }
            ]
        }

        myChart.setOption(option)

        myChart.off('click')
        myChart.on('click', (params) => {
            if (params.componentType === 'geo') {
                console.log('点击了区域：', params.name)
            }
        })
    } catch (error) {
        console.error('地图加载失败:', error)
    }
}

const handleResize = () => {
    myChart && myChart.resize()
}

const backToProvince = () => {
    currentLevel.value = 'province'
    initMap('610000', 'shaanxi')
}

onMounted(() => {
    myChart = echarts.init(document.getElementById('project-map'))
    initMap('610000', 'shaanxi')
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-container {
    padding: 0;
    margin: 0;
    /* 容器占满屏幕剩余高度 */
    height: calc(100vh - 100px); 
    overflow: hidden;
}

.map-card {
    height: 100%;
}

/* 核心修复：直接计算 map 容器的高度 */
.chart-div {
    width: 100%;
    /* 高度 = 容器高度 - card header的高度(约60px) */
    height: calc(100vh - 160px); 
}

.map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* 确保 el-card 的 body 部分不产生滚动条 */
:deep(.el-card__body) {
    padding: 0 !important;
}
</style>