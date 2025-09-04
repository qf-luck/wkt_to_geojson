import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as turf from '@turf/turf'
import wellknown from 'wellknown'

export function useMapOperations() {
  // === 响应式状态定义 ===
  const leafletMapRef = ref(null)
  const currentMapStyle = ref('osm')
  const mousePosition = ref('鼠标位置: --')
  const selectedLayers = ref(new Set())
  const mapLoading = ref(false)

  // 右键菜单相关
  const contextMenuVisible = ref(false)
  const contextMenuStyle = ref({})

  // 几何信息对话框相关
  const geometryInfoVisible = ref(false)
  const selectedGeometryInfo = ref(null)
  const showCoordinateDetails = ref(false)

  // === 工具函数 ===
  const formatLength = (meters) => {
    if (meters < 1000) {
      return `${meters.toFixed(2)} m`
    } else {
      return `${(meters / 1000).toFixed(2)} km`
    }
  }

  const formatArea = (squareMeters) => {
    if (squareMeters < 10000) {
      return `${squareMeters.toFixed(2)} m²`
    } else if (squareMeters < 1000000) {
      return `${(squareMeters / 10000).toFixed(2)} 公顷`
    } else {
      return `${(squareMeters / 1000000).toFixed(2)} km²`
    }
  }

  const calculateArea = (layer) => {
    try {
      const geojson = layer.toGeoJSON()
      if (!geojson.geometry.type.includes('Polygon') && !geojson.geometry.type.includes('Circle')) {
        return null
      }

      let area
      if (layer.getRadius && typeof layer.getRadius === 'function') {
        // 圆形面积计算
        const radius = layer.getRadius()
        area = Math.PI * radius * radius
      } else {
        area = turf.area(geojson)
      }

      return formatArea(area)
    } catch (e) {
      console.warn('计算面积失败:', e)
      return null
    }
  }

  // === 计算属性 ===
  const hasGeometry = computed(() => {
    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      return drawnItems && drawnItems.getLayers().length > 0
    } catch (e) {
      return false
    }
  })

  const geometryStats = computed(() => {
    const stats = {
      total: 0,
      points: 0,
      lines: 0,
      polygons: 0,
      totalLength: null,
      totalArea: null,
      boundingBox: null,
    }

    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) return stats

      let totalLengthM = 0
      let totalAreaM2 = 0
      let allCoords = []

      drawnItems.eachLayer((layer) => {
        stats.total++
        try {
          const geojson = layer.toGeoJSON()
          const type = geojson.geometry.type

          // 统计类型
          if (type === 'Point') {
            stats.points++
            allCoords.push(geojson.geometry.coordinates)
          } else if (type.includes('LineString')) {
            stats.lines++
            const length = turf.length(geojson, { units: 'meters' })
            totalLengthM += length

            if (type === 'LineString') {
              allCoords.push(...geojson.geometry.coordinates)
            } else if (type === 'MultiLineString') {
              geojson.geometry.coordinates.forEach((coords) => allCoords.push(...coords))
            }
          } else if (type.includes('Polygon')) {
            stats.polygons++
            const area = turf.area(geojson)
            totalAreaM2 += area

            if (type === 'Polygon') {
              geojson.geometry.coordinates.forEach((ring) => allCoords.push(...ring))
            } else if (type === 'MultiPolygon') {
              geojson.geometry.coordinates.forEach((polygon) =>
                polygon.forEach((ring) => allCoords.push(...ring)),
              )
            }
          }
        } catch (e) {
          console.warn('统计几何信息失败:', e)
        }
      })

      // 格式化长度和面积
      if (totalLengthM > 0) {
        stats.totalLength = formatLength(totalLengthM)
      }
      if (totalAreaM2 > 0) {
        stats.totalArea = formatArea(totalAreaM2)
      }

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
    } catch (e) {
      console.warn('计算统计信息失败:', e)
    }

    return stats
  })

  // === 地图操作方法 ===
  const drawOnMap = (text, type) => {
    try {
      if (leafletMapRef.value?.drawOnMap) {
        return leafletMapRef.value.drawOnMap(text, type)
      }
      ElMessage.warning('地图未准备好')
      return Promise.reject(new Error('地图未准备好'))
    } catch (e) {
      ElMessage.error('绘制失败: ' + e.message)
      return Promise.reject(e)
    }
  }

  const updateGeoJsonFromMap = () => {
    console.log('updateGeoJsonFromMap called')
  }

  const handleSelectionChange = (selection) => {
    selectedLayers.value = selection
  }

  const selectGeometryType = (type) => {
    try {
      const drawnItems = leafletMapRef.value?.getDrawnItems?.()
      if (!drawnItems) return

      const newSelection = new Set()

      drawnItems.eachLayer((layer) => {
        const geojson = layer.toGeoJSON()
        const geometryType = geojson.geometry.type

        let shouldSelect = false
        switch (type) {
          case 'points':
            shouldSelect = geometryType === 'Point'
            break
          case 'lines':
            shouldSelect = geometryType.includes('LineString')
            break
          case 'polygons':
            shouldSelect = geometryType.includes('Polygon')
            break
          case 'total':
            shouldSelect = true
            break
        }

        if (shouldSelect) {
          newSelection.add(layer)
        }
      })

      selectedLayers.value = newSelection
      if (newSelection.size > 0) {
        ElMessage.success(`已选中${newSelection.size}个${type === 'total' ? '图形' : type}`)
      }
    } catch (e) {
      console.warn('选择几何图形失败:', e)
      ElMessage.warning('操作失败，请检查地图是否已加载')
    }
  }

  const setLeafletMapRef = (mapRef) => {
    leafletMapRef.value = mapRef
  }

  // === 右键菜单操作 ===
  const showContextMenu = (point) => {
    contextMenuStyle.value = {
      position: 'fixed',
      left: point.x + 'px',
      top: point.y + 'px',
      zIndex: 10000,
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
            created: new Date().toISOString(),
          },
        }
      })

      let result
      if (features.length === 1) {
        result = features[0]
      } else {
        result = {
          type: 'FeatureCollection',
          features: features,
        }
      }

      await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      ElMessage.success('GeoJSON已复制到剪贴板')
    } catch (e) {
      ElMessage.error('复制失败: ' + e.message)
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

      const result = wktArray.join('\n\n')
      await navigator.clipboard.writeText(result)
      ElMessage.success('WKT已复制到剪贴板')
    } catch (e) {
      ElMessage.error('复制失败: ' + e.message)
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
    const geojson = layer.toGeoJSON()

    try {
      const info = {
        type: geojson.geometry.type,
        coordinates: JSON.stringify(geojson.geometry.coordinates).split(',').length,
        coordinateDetails: JSON.stringify(geojson.geometry.coordinates, null, 2),
      }

      // 计算面积和周长
      if (
        geojson.geometry.type.includes('Polygon') ||
        (layer.getRadius && typeof layer.getRadius === 'function')
      ) {
        info.area = calculateArea(layer)

        if (layer.getRadius && typeof layer.getRadius === 'function') {
          const circumference = 2 * Math.PI * layer.getRadius()
          info.perimeter = formatLength(circumference)
        } else {
          try {
            const perimeter = turf.length(turf.polygonToLine(geojson), { units: 'meters' })
            info.perimeter = formatLength(perimeter)
          } catch (e) {
            console.warn('计算周长失败:', e)
          }
        }
      } else if (geojson.geometry.type.includes('LineString')) {
        const length = turf.length(geojson, { units: 'meters' })
        info.length = formatLength(length)
      }

      // 边界框
      try {
        const bbox = turf.bbox(geojson)
        info.bbox = {
          sw: `${bbox[0].toFixed(6)}, ${bbox[1].toFixed(6)}`,
          ne: `${bbox[2].toFixed(6)}, ${bbox[3].toFixed(6)}`,
        }
      } catch (e) {
        console.warn('计算边界框失败:', e)
      }

      // 中心点
      try {
        const centroid = turf.centroid(geojson)
        info.centroid = `${centroid.geometry.coordinates[0].toFixed(6)}, ${centroid.geometry.coordinates[1].toFixed(6)}`
      } catch (e) {
        console.warn('计算中心点失败:', e)
      }

      selectedGeometryInfo.value = info
      geometryInfoVisible.value = true
    } catch (e) {
      ElMessage.error('获取几何信息失败: ' + e.message)
    }

    hideContextMenu()
  }

  const measureDistance = async () => {
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
            distance: formatLength(distance),
          })
        }
      }

      const distanceText = distances
        .map((d) => `图形${d.from}到图形${d.to}: ${d.distance}`)
        .join('\n')

      ElMessageBox.alert(distanceText, '距离测量结果', {
        confirmButtonText: '确定',
      })
    } catch (e) {
      ElMessage.error('距离测量失败: ' + e.message)
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
      selectedLayers.value.forEach((layer) => {
        drawnItems.removeLayer(layer)
      })

      selectedLayers.value.clear()
      updateGeoJsonFromMap()
      ElMessage.success(`已删除${count}个图形`)
    } catch (e) {
      ElMessage.error('删除失败: ' + e.message)
    }

    hideContextMenu()
  }

  // 其他右键菜单功能（简化版本）
  const duplicateSelected = () => {
    ElMessage.info('复制功能需要在实际项目中实现')
    hideContextMenu()
  }

  const cropWithSelected = () => {
    ElMessage.info('裁剪功能需要在实际项目中实现')
    hideContextMenu()
  }

  const unionSelected = () => {
    ElMessage.info('合并功能需要在实际项目中实现')
    hideContextMenu()
  }

  const bufferSelected = () => {
    ElMessage.info('缓冲区分析功能需要在实际项目中实现')
    hideContextMenu()
  }

  const convexHull = () => {
    ElMessage.info('凸包分析功能需要在实际项目中实现')
    hideContextMenu()
  }

  // === 返回接口 ===
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
  }
}
