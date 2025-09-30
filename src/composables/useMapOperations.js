// src/composables/useMapOperations.js - 优化版本
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as turf from '@turf/turf'
import wellknown from 'wellknown'
import L from 'leaflet'

export function useMapOperations() {
  // === 核心状态 ===
  const leafletMapRef = ref(null)
  const currentMapStyle = ref('osm')
  const mousePosition = ref('经度: --, 纬度: --')
  const selectedLayers = ref(new Set())
  const mapLoading = ref(false)

  // 右键菜单
  const contextMenuVisible = ref(false)
  const contextMenuStyle = ref({})

  // 几何信息对话框
  const geometryInfoVisible = ref(false)
  const selectedGeometryInfo = ref(null)
  const showCoordinateDetails = ref(false)

  // 统计更新触发器
  const statsVersion = ref(0)

  // === 工具函数 ===
  const formatLength = (meters) => {
    if (meters < 1000) return `${meters.toFixed(2)} m`
    return `${(meters / 1000).toFixed(2)} km`
  }

  const formatArea = (squareMeters) => {
    if (squareMeters < 10000) return `${squareMeters.toFixed(2)} m²`
    if (squareMeters < 1000000) return `${(squareMeters / 10000).toFixed(2)} 公顷`
    return `${(squareMeters / 1000000).toFixed(2)} km²`
  }

  const getGeometryTypeName = (type) => {
    const typeNames = {
      polygon: '多边形', polyline: '线段', rectangle: '矩形',
      circle: '圆形', marker: '标记点', point: '点',
      linestring: '线段', multipolygon: '多多边形'
    }
    return typeNames[type?.toLowerCase()] || '图形'
  }

  // === 地图引用管理 ===
  const setLeafletMapRef = (mapRef) => {
    try {
      leafletMapRef.value = mapRef?.value || mapRef
      if (leafletMapRef.value) {
        console.log('地图引用设置成功')
        // 触发统计更新
        updateStats()
      }
    } catch (error) {
      console.error('设置地图引用失败:', error)
    }
  }

  // === 统计计算 ===
  const updateStats = () => {
    statsVersion.value++
  }

  const calculateLayerStats = (layer) => {
    try {
      const geojson = layer.toGeoJSON()
      const type = geojson.geometry.type
      const stats = { type, area: null, length: null }

      // 计算面积
      if (type.includes('Polygon')) {
        if (layer.getRadius && typeof layer.getRadius === 'function') {
          // 圆形
          const radius = layer.getRadius()
          stats.area = Math.PI * radius * radius
        } else {
          stats.area = turf.area(geojson)
        }
      }

      // 计算长度
      if (type.includes('LineString')) {
        stats.length = turf.length(geojson, { units: 'meters' })
      }

      return stats
    } catch (error) {
      console.warn('计算图层统计失败:', error)
      return { type: 'unknown', area: null, length: null }
    }
  }

  // === 计算属性 ===
  const hasGeometry = computed(() => {
    // 依赖统计版本来触发更新
    statsVersion.value

    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      return drawnItems && drawnItems.getLayers().length > 0
    } catch {
      return false
    }
  })

  const geometryStats = computed(() => {
    // 依赖统计版本来触发更新
    statsVersion.value

    const stats = {
      total: 0, points: 0, lines: 0, polygons: 0,
      totalLength: null, totalArea: null, boundingBox: null
    }

    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) return stats

      let totalLengthM = 0, totalAreaM2 = 0
      const allCoords = []

      drawnItems.eachLayer((layer) => {
        stats.total++
        const layerStats = calculateLayerStats(layer)

        // 分类统计
        if (layerStats.type === 'Point') {
          stats.points++
        } else if (layerStats.type.includes('LineString')) {
          stats.lines++
          if (layerStats.length) totalLengthM += layerStats.length
        } else if (layerStats.type.includes('Polygon')) {
          stats.polygons++
          if (layerStats.area) totalAreaM2 += layerStats.area
        }

        // 收集坐标用于计算边界框
        try {
          const geojson = layer.toGeoJSON()
          const coords = turf.coordAll(geojson)
          allCoords.push(...coords)
        } catch (e) {
          console.warn('提取坐标失败:', e)
        }
      })

      // 格式化总计
      if (totalLengthM > 0) stats.totalLength = formatLength(totalLengthM)
      if (totalAreaM2 > 0) stats.totalArea = formatArea(totalAreaM2)

      // 计算边界框
      if (allCoords.length > 0) {
        try {
          const feature = turf.multiPoint(allCoords)
          const bbox = turf.bbox(feature)
          stats.boundingBox = `${bbox[0].toFixed(6)}, ${bbox[1].toFixed(6)} ~ ${bbox[2].toFixed(6)}, ${bbox[3].toFixed(6)}`
        } catch (e) {
          console.warn('计算边界框失败:', e)
        }
      }
    } catch (error) {
      console.error('计算统计失败:', error)
    }

    return stats
  })

  // === 地图操作 ===
  const drawOnMap = async (text, type) => {
    if (!leafletMapRef.value?.drawOnMap) {
      ElMessage.warning('地图未准备好')
      return Promise.reject(new Error('地图未准备好'))
    }

    try {
      await leafletMapRef.value.drawOnMap(text, type)
      // 绘制完成后更新统计
      setTimeout(updateStats, 100)
      return Promise.resolve()
    } catch (error) {
      ElMessage.error('绘制失败: ' + error.message)
      return Promise.reject(error)
    }
  }

  const updateGeoJsonFromMap = () => {
    updateStats()
  }

  const handleSelectionChange = (selection) => {
    selectedLayers.value = selection
    updateStats()
  }

  const selectGeometryType = (type) => {
    const drawnItems = leafletMapRef.value?.getDrawnItems?.()
    if (!drawnItems) {
      ElMessage.warning('地图未准备好')
      return
    }

    const newSelection = new Set()

    drawnItems.eachLayer((layer) => {
      try {
        const geojson = layer.toGeoJSON()
        const geometryType = geojson.geometry.type

        let shouldSelect = false
        switch (type) {
          case 'points': shouldSelect = geometryType === 'Point'; break
          case 'lines': shouldSelect = geometryType.includes('LineString'); break
          case 'polygons': shouldSelect = geometryType.includes('Polygon'); break
          case 'total': shouldSelect = true; break
        }

        if (shouldSelect) newSelection.add(layer)
      } catch (error) {
        console.warn('处理图层失败:', error)
      }
    })

    selectedLayers.value = newSelection
    const typeName = type === 'total' ? '图形' : getGeometryTypeName(type)

    if (newSelection.size > 0) {
      ElMessage.success(`已选中 ${newSelection.size} 个${typeName}`)
    } else {
      ElMessage.info(`没有找到${typeName}`)
    }
  }

  // === 右键菜单操作 ===
  const showContextMenu = (point) => {
    contextMenuStyle.value = {
      position: 'fixed',
      left: point.x + 'px',
      top: point.y + 'px',
      zIndex: 10000
    }
    contextMenuVisible.value = true
  }

  const hideContextMenu = () => {
    contextMenuVisible.value = false
  }

  const copySelectedAsGeoJSON = async () => {
    if (selectedLayers.value.size === 0) {
      ElMessage.warning('请先选择图形')
      return
    }

    try {
      const features = Array.from(selectedLayers.value).map((layer, index) => {
        const geojson = layer.toGeoJSON()
        return {
          ...geojson,
          properties: {
            ...geojson.properties,
            id: index + 1,
            exported: new Date().toISOString()
          }
        }
      })

      const result = features.length === 1 ? features[0] : {
        type: 'FeatureCollection',
        features
      }

      await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      ElMessage.success('GeoJSON已复制到剪贴板')
    } catch (error) {
      ElMessage.error('复制失败: ' + error.message)
    }

    hideContextMenu()
  }

  const copySelectedAsWKT = async () => {
    if (selectedLayers.value.size === 0) {
      ElMessage.warning('请先选择图形')
      return
    }

    try {
      const wktArray = Array.from(selectedLayers.value).map((layer, index) => {
        const geojson = layer.toGeoJSON()
        const wkt = wellknown.stringify(geojson.geometry)
        return `-- 图形 ${index + 1} (${geojson.geometry.type})\n${wkt}`
      })

      await navigator.clipboard.writeText(wktArray.join('\n\n'))
      ElMessage.success('WKT已复制到剪贴板')
    } catch (error) {
      ElMessage.error('复制失败: ' + error.message)
    }

    hideContextMenu()
  }

  const getGeometryInfo = () => {
    if (selectedLayers.value.size !== 1) {
      ElMessage.warning('请选择一个图形查看信息')
      hideContextMenu()
      return
    }

    const layer = Array.from(selectedLayers.value)[0]

    try {
      const geojson = layer.toGeoJSON()
      const layerStats = calculateLayerStats(layer)

      const info = {
        type: geojson.geometry.type,
        coordinates: JSON.stringify(geojson.geometry.coordinates).split(',').length,
        coordinateDetails: JSON.stringify(geojson.geometry.coordinates, null, 2)
      }

      // 添加面积和长度信息
      if (layerStats.area) info.area = formatArea(layerStats.area)
      if (layerStats.length) info.length = formatLength(layerStats.length)

      // 计算边界框和中心点
      try {
        const bbox = turf.bbox(geojson)
        info.bbox = {
          sw: `${bbox[0].toFixed(6)}, ${bbox[1].toFixed(6)}`,
          ne: `${bbox[2].toFixed(6)}, ${bbox[3].toFixed(6)}`
        }

        const centroid = turf.centroid(geojson)
        info.centroid = `${centroid.geometry.coordinates[0].toFixed(6)}, ${centroid.geometry.coordinates[1].toFixed(6)}`
      } catch (error) {
        console.warn('计算几何属性失败:', error)
      }

      selectedGeometryInfo.value = info
      geometryInfoVisible.value = true
    } catch (error) {
      ElMessage.error('获取几何信息失败: ' + error.message)
    }

    hideContextMenu()
  }

  const measureDistance = () => {
    if (selectedLayers.value.size < 2) {
      ElMessage.warning('请选择至少两个图形测量距离')
      hideContextMenu()
      return
    }

    try {
      const layers = Array.from(selectedLayers.value)
      const distances = []

      for (let i = 0; i < layers.length - 1; i++) {
        for (let j = i + 1; j < layers.length; j++) {
          const geojson1 = layers[i].toGeoJSON()
          const geojson2 = layers[j].toGeoJSON()

          const center1 = turf.centroid(geojson1)
          const center2 = turf.centroid(geojson2)

          const distance = turf.distance(center1, center2, { units: 'meters' })
          distances.push({
            from: i + 1,
            to: j + 1,
            distance: formatLength(distance)
          })
        }
      }

      const message = distances
        .map(d => `图形${d.from}到图形${d.to}: ${d.distance}`)
        .join('\n')

      ElMessageBox.alert(message, '距离测量结果', {
        confirmButtonText: '确定'
      })
    } catch (error) {
      ElMessage.error('距离测量失败: ' + error.message)
    }

    hideContextMenu()
  }

  const deleteSelected = () => {
    if (selectedLayers.value.size === 0) {
      ElMessage.warning('请先选择图形')
      return
    }

    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) {
        ElMessage.warning('地图未准备好')
        return
      }

      const count = selectedLayers.value.size
      selectedLayers.value.forEach(layer => drawnItems.removeLayer(layer))
      selectedLayers.value.clear()

      updateStats()
      ElMessage.success(`已删除 ${count} 个图形`)
    } catch (error) {
      ElMessage.error('删除失败: ' + error.message)
    }

    hideContextMenu()
  }

  // === 高级几何操作 ===
  const duplicateSelected = () => {
    if (selectedLayers.value.size === 0) {
      ElMessage.warning('请先选择图形')
      hideContextMenu()
      return
    }

    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) {
        ElMessage.warning('地图未准备好')
        return
      }

      let duplicateCount = 0
      selectedLayers.value.forEach(layer => {
        try {
          const geojson = layer.toGeoJSON()

          // 偏移复制的图形
          const offsetGeojson = turf.transformTranslate(geojson, 0.001, 45, { units: 'kilometers' })

          // 创建新图层
          const newLayerGroup = L.geoJSON(offsetGeojson, {
            pointToLayer: (feature, latlng) => L.marker(latlng),
            style: { color: '#9b59b6', weight: 3, fillOpacity: 0.2 }
          })

          newLayerGroup.eachLayer(newLayer => {
            newLayer.feature = {
              ...offsetGeojson,
              properties: {
                ...offsetGeojson.properties,
                id: Date.now() + duplicateCount,
                name: `${geojson.properties?.name || '图形'}_副本`,
                created: new Date().toISOString()
              }
            }
            drawnItems.addLayer(newLayer)
            duplicateCount++
          })
        } catch (error) {
          console.warn('复制图层失败:', error)
        }
      })

      updateStats()
      ElMessage.success(`已复制 ${duplicateCount} 个图形`)
    } catch (error) {
      ElMessage.error('复制失败: ' + error.message)
    }

    hideContextMenu()
  }

  const unionSelected = async () => {
    if (selectedLayers.value.size < 2) {
      ElMessage.warning('请选择至少两个多边形进行合并')
      hideContextMenu()
      return
    }

    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) {
        ElMessage.warning('地图未准备好')
        return
      }

      const polygons = []
      selectedLayers.value.forEach(layer => {
        try {
          const geojson = layer.toGeoJSON()
          if (geojson.geometry.type.includes('Polygon')) {
            polygons.push(geojson)
          }
        } catch (error) {
          console.warn('处理图层失败:', error)
        }
      })

      if (polygons.length < 2) {
        ElMessage.warning('至少需要两个多边形才能合并')
        hideContextMenu()
        return
      }

      // 使用Turf.js进行合并
      let result = polygons[0]
      for (let i = 1; i < polygons.length; i++) {
        try {
          result = turf.union(turf.featureCollection([result, polygons[i]]))
        } catch (e) {
          console.warn('合并失败:', e)
        }
      }

      // 删除选中的原始图层
      selectedLayers.value.forEach(layer => drawnItems.removeLayer(layer))
      selectedLayers.value.clear()

      // 添加合并后的图层
      const mergedLayerGroup = L.geoJSON(result, {
        style: { color: '#27ae60', weight: 3, fillOpacity: 0.2 }
      })

      mergedLayerGroup.eachLayer(newLayer => {
        newLayer.feature = {
          ...result,
          properties: {
            name: '合并图形',
            created: new Date().toISOString(),
            type: 'polygon'
          }
        }
        drawnItems.addLayer(newLayer)
      })

      updateStats()
      ElMessage.success('图形已成功合并')
    } catch (error) {
      console.error('合并失败:', error)
      ElMessage.error('合并失败: ' + error.message)
    }

    hideContextMenu()
  }

  const bufferSelected = async () => {
    if (selectedLayers.value.size === 0) {
      ElMessage.warning('请先选择图形')
      hideContextMenu()
      return
    }

    try {
      const { value: radiusStr } = await ElMessageBox.prompt(
        '请输入缓冲区半径（单位：米）',
        '创建缓冲区',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: '100',
          inputPattern: /^\d+(\.\d+)?$/,
          inputErrorMessage: '请输入有效的数字'
        }
      )

      const radius = parseFloat(radiusStr)
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) {
        ElMessage.warning('地图未准备好')
        return
      }

      let bufferCount = 0
      selectedLayers.value.forEach(layer => {
        try {
          const geojson = layer.toGeoJSON()
          const buffered = turf.buffer(geojson, radius, { units: 'meters' })

          const bufferLayerGroup = L.geoJSON(buffered, {
            style: { color: '#f39c12', weight: 2, fillOpacity: 0.1, dashArray: '5, 5' }
          })

          bufferLayerGroup.eachLayer(newLayer => {
            newLayer.feature = {
              ...buffered,
              properties: {
                name: `缓冲区_${radius}m`,
                created: new Date().toISOString(),
                type: 'buffer',
                radius: radius
              }
            }
            drawnItems.addLayer(newLayer)
            bufferCount++
          })
        } catch (error) {
          console.warn('创建缓冲区失败:', error)
        }
      })

      updateStats()
      ElMessage.success(`已创建 ${bufferCount} 个缓冲区`)
    } catch (e) {
      if (e !== 'cancel') {
        ElMessage.error('创建缓冲区失败: ' + e.message)
      }
    }

    hideContextMenu()
  }

  const convexHull = () => {
    if (selectedLayers.value.size < 3) {
      ElMessage.warning('请至少选择3个图形创建凸包')
      hideContextMenu()
      return
    }

    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) {
        ElMessage.warning('地图未准备好')
        return
      }

      // 收集所有坐标点
      const points = []
      selectedLayers.value.forEach(layer => {
        try {
          const geojson = layer.toGeoJSON()
          const coords = turf.coordAll(geojson)
          points.push(...coords.map(coord => turf.point(coord)))
        } catch (error) {
          console.warn('提取坐标失败:', error)
        }
      })

      if (points.length < 3) {
        ElMessage.warning('点数不足，无法创建凸包')
        hideContextMenu()
        return
      }

      // 创建凸包
      const hull = turf.convex(turf.featureCollection(points))

      if (!hull) {
        ElMessage.error('创建凸包失败')
        hideContextMenu()
        return
      }

      // 添加凸包图层
      const hullLayerGroup = L.geoJSON(hull, {
        style: { color: '#e74c3c', weight: 3, fillOpacity: 0.1, dashArray: '10, 5' }
      })

      hullLayerGroup.eachLayer(newLayer => {
        newLayer.feature = {
          ...hull,
          properties: {
            name: '凸包',
            created: new Date().toISOString(),
            type: 'convexHull'
          }
        }
        drawnItems.addLayer(newLayer)
      })

      updateStats()
      ElMessage.success('凸包已创建')
    } catch (error) {
      console.error('创建凸包失败:', error)
      ElMessage.error('创建凸包失败: ' + error.message)
    }

    hideContextMenu()
  }

  const cropWithSelected = async () => {
    ElMessage.info('裁剪功能需要选择一个裁剪边界多边形，该功能即将推出')
    hideContextMenu()
  }

  // === 监听器清理 ===
  const cleanup = () => {
    leafletMapRef.value = null
    selectedLayers.value.clear()
    contextMenuVisible.value = false
    geometryInfoVisible.value = false
  }

  return {
    // 状态
    leafletMapRef,
    currentMapStyle,
    mousePosition,
    selectedLayers,
    mapLoading,

    // 计算属性
    hasGeometry,
    geometryStats,

    // 地图操作
    drawOnMap,
    updateGeoJsonFromMap,
    handleSelectionChange,
    selectGeometryType,
    setLeafletMapRef,
    updateStats,

    // 右键菜单
    contextMenuVisible,
    contextMenuStyle,
    showContextMenu,
    hideContextMenu,
    copySelectedAsGeoJSON,
    copySelectedAsWKT,
    measureDistance,
    deleteSelected,
    duplicateSelected,
    cropWithSelected,
    unionSelected,
    bufferSelected,
    convexHull,

    // 几何信息对话框
    geometryInfoVisible,
    selectedGeometryInfo,
    showCoordinateDetails,
    getGeometryInfo,

    // 清理函数
    cleanup
  }
}
