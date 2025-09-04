import { ref } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import wellknown from 'wellknown'
import * as turf from '@turf/turf'

export function useGeometry() {
  // 响应式状态
  const geojsonText = ref('')
  const wktText = ref('')
  const converting = ref(false)
  const drawingOnMap = ref(false)
  const globalLoading = ref(false)
  const loadingMessage = ref('')

  // GeoJSON 转 WKT
  const convertGeoJsonToWkt = async () => {
    if (!geojsonText.value) {
      ElMessage.warning('请先输入有效的GeoJSON数据')
      return
    }

    converting.value = true
    globalLoading.value = true
    loadingMessage.value = '正在转换为WKT格式...'

    try {
      const geojson = JSON.parse(geojsonText.value)
      let wktResult = ''

      if (geojson.type === 'FeatureCollection') {
        const wktArray = geojson.features.map((feature, i) => {
          const wkt = wellknown.stringify(feature.geometry)
          const properties = feature.properties || {}
          const propStr =
            Object.keys(properties).length > 0
              ? ` -- Properties: ${JSON.stringify(properties)}`
              : ''
          return `-- Feature ${i + 1} (${feature.geometry.type})${propStr}\n${wkt}`
        })
        wktResult = wktArray.join('\n\n')
      } else if (geojson.type === 'Feature') {
        const wkt = wellknown.stringify(geojson.geometry)
        const properties = geojson.properties || {}
        const propStr =
          Object.keys(properties).length > 0 ? ` -- Properties: ${JSON.stringify(properties)}` : ''
        wktResult = `-- ${geojson.geometry.type}${propStr}\n${wkt}`
      } else {
        wktResult = `-- ${geojson.type}\n${wellknown.stringify(geojson)}`
      }

      // 模拟转换过程
      await new Promise((resolve) => setTimeout(resolve, 500))

      wktText.value = wktResult
      ElMessage.success('转换成功！')
    } catch (e) {
      console.error('GeoJSON转WKT失败:', e)
      ElMessage.error('转换失败：' + e.message)
    } finally {
      converting.value = false
      globalLoading.value = false
    }
  }

  // WKT 转 GeoJSON
  const convertWktToGeoJson = async () => {
    if (!wktText.value) {
      ElMessage.warning('请先输入有效的WKT数据')
      return
    }

    converting.value = true
    globalLoading.value = true
    loadingMessage.value = '正在转换为GeoJSON格式...'

    try {
      const lines = wktText.value
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('--'))

      if (lines.length === 0) {
        throw new Error('没有有效的WKT内容')
      }

      let result
      if (lines.length === 1) {
        const geometry = wellknown.parse(lines[0].trim())
        result = {
          type: 'Feature',
          geometry: geometry,
          properties: {
            created: new Date().toISOString(),
            source: 'WKT_conversion',
          },
        }
      } else {
        const features = lines
          .map((line, index) => {
            try {
              const geometry = wellknown.parse(line.trim())
              return {
                type: 'Feature',
                geometry: geometry,
                properties: {
                  id: index + 1,
                  created: new Date().toISOString(),
                  source: 'WKT_conversion',
                },
              }
            } catch (e) {
              console.warn(`解析第${index + 1}行WKT失败:`, e)
              return null
            }
          })
          .filter((f) => f !== null)

        if (features.length === 0) {
          throw new Error('没有有效的WKT可以解析')
        }

        result = {
          type: 'FeatureCollection',
          features: features,
        }
      }

      // 模拟转换过程
      await new Promise((resolve) => setTimeout(resolve, 500))

      geojsonText.value = JSON.stringify(result, null, 2)
      ElMessage.success('转换成功！')
    } catch (e) {
      console.error('WKT转GeoJSON失败:', e)
      ElMessage.error('转换失败：' + e.message)
    } finally {
      converting.value = false
      globalLoading.value = false
    }
  }

  // 验证几何
  const validateGeometry = () => {
    if (!geojsonText.value) {
      ElMessage.warning('请先输入有效的GeoJSON数据')
      return
    }

    try {
      const geojson = JSON.parse(geojsonText.value)
      let isValid = true
      let issues = []
      let warnings = []

      const validateFeature = (feature, index = 0) => {
        try {
          const geometry = feature.geometry || feature

          // 使用 Turf.js 验证几何有效性
          if (geometry.type === 'Polygon') {
            try {
              const kinks = turf.kinks(turf.feature(geometry))
              if (kinks.features.length > 0) {
                issues.push(`多边形${index + 1}存在自相交`)
                isValid = false
              }
            } catch (e) {
              console.warn('检查多边形自相交失败:', e)
            }

            // 检查多边形是否封闭
            if (geometry.coordinates && geometry.coordinates.length > 0) {
              geometry.coordinates.forEach((ring, ringIndex) => {
                if (ring.length < 4) {
                  issues.push(`多边形${index + 1}的第${ringIndex + 1}个环点数不足（至少需要4个点）`)
                  isValid = false
                } else {
                  const first = ring[0]
                  const last = ring[ring.length - 1]
                  if (first[0] !== last[0] || first[1] !== last[1]) {
                    issues.push(`多边形${index + 1}的第${ringIndex + 1}个环未封闭`)
                    isValid = false
                  }
                }
              })
            }
          }

          if (geometry.type === 'LineString') {
            if (geometry.coordinates.length < 2) {
              issues.push(`线段${index + 1}点数不足（至少需要2个点）`)
              isValid = false
            }
          }

          // 检查坐标范围
          const checkCoordinates = (coords, depth = 0) => {
            if (depth > 10) return

            if (Array.isArray(coords)) {
              if (
                coords.length === 2 &&
                typeof coords[0] === 'number' &&
                typeof coords[1] === 'number'
              ) {
                const [lng, lat] = coords

                if (lng < -180 || lng > 180) {
                  issues.push(`图形${index + 1}经度超出范围: ${lng}`)
                  isValid = false
                }
                if (lat < -90 || lat > 90) {
                  issues.push(`图形${index + 1}纬度超出范围: ${lat}`)
                  isValid = false
                }

                // 精度检查
                if (lng.toString().includes('.') && lng.toString().split('.')[1].length > 10) {
                  warnings.push(`图形${index + 1}经度精度过高，可能影响性能`)
                }
                if (lat.toString().includes('.') && lat.toString().split('.')[1].length > 10) {
                  warnings.push(`图形${index + 1}纬度精度过高，可能影响性能`)
                }
              } else {
                coords.forEach((coord) => checkCoordinates(coord, depth + 1))
              }
            }
          }

          checkCoordinates(geometry.coordinates)

          // 使用Turf.js进行额外验证
          try {
            if (geometry.type.includes('Polygon')) {
              const area = turf.area(turf.feature(geometry))
              if (area === 0) {
                warnings.push(`图形${index + 1}面积为0，可能是退化的几何`)
              }
            }
          } catch (e) {
            console.warn('Turf.js验证失败:', e)
          }
        } catch (e) {
          issues.push(`图形${index + 1}验证错误: ${e.message}`)
          isValid = false
        }
      }

      if (geojson.type === 'FeatureCollection') {
        geojson.features.forEach((feature, index) => validateFeature(feature, index))
      } else if (geojson.type === 'Feature') {
        validateFeature(geojson)
      } else {
        validateFeature({ geometry: geojson })
      }

      // 显示验证结果
      let message = ''
      let type = 'success'

      if (isValid && warnings.length === 0) {
        message = '✅ 几何数据完全有效！'
        type = 'success'
      } else if (isValid && warnings.length > 0) {
        message = `✅ 几何数据有效，但有${warnings.length}个警告：\n${warnings.slice(0, 5).join('\n')}`
        type = 'warning'
      } else {
        message = `❌ 发现${issues.length}个问题：\n${issues.slice(0, 5).join('\n')}`
        type = 'error'
      }

      ElNotification({
        title: '几何验证结果',
        message: message,
        type: type,
        duration: type === 'success' ? 3000 : 8000,
      })
    } catch (e) {
      ElMessage.error('验证失败：' + e.message)
    }
  }

  // 简化几何
  const simplifyGeometry = async () => {
    if (!geojsonText.value) {
      ElMessage.warning('请先输入有效的GeoJSON数据')
      return
    }

    try {
      const { value: tolerance } = await ElMessageBox.prompt(
        '请输入简化容差（0.0001-0.1，值越小越精确）',
        '简化几何',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: '0.01',
          inputPattern: /^0\.\d+$/,
          inputErrorMessage: '请输入0到1之间的小数',
        },
      )

      globalLoading.value = true
      loadingMessage.value = '正在简化几何...'

      const geojson = JSON.parse(geojsonText.value)
      let simplified
      let originalCount = 0
      let simplifiedCount = 0

      // 计算原始坐标数量
      const countCoordinates = (obj) => {
        const coordStr = JSON.stringify(obj.coordinates || obj.geometry?.coordinates || [])
        return (coordStr.match(/\d+\.\d+/g) || []).length / 2
      }

      const simplifyFeature = (feature) => {
        try {
          originalCount += countCoordinates(feature)
          const result = turf.simplify(feature, {
            tolerance: parseFloat(tolerance),
            highQuality: true,
          })
          simplifiedCount += countCoordinates(result)
          return result
        } catch (e) {
          console.warn('简化特征失败:', e)
          return feature
        }
      }

      if (geojson.type === 'FeatureCollection') {
        simplified = {
          ...geojson,
          features: geojson.features.map(simplifyFeature),
        }
      } else {
        simplified = simplifyFeature(geojson)
      }

      // 模拟处理时间
      await new Promise((resolve) => setTimeout(resolve, 1000))

      geojsonText.value = JSON.stringify(simplified, null, 2)

      const reduction =
        originalCount > 0
          ? (((originalCount - simplifiedCount) / originalCount) * 100).toFixed(1)
          : 0
      ElMessage.success(
        `几何简化完成！坐标点数从${originalCount}减少到${simplifiedCount}（减少${reduction}%）`,
      )
    } catch (e) {
      if (e !== 'cancel') {
        ElMessage.error('简化失败：' + e.message)
      }
    } finally {
      globalLoading.value = false
    }
  }

  return {
    // 状态
    geojsonText,
    wktText,
    converting,
    drawingOnMap,
    globalLoading,
    loadingMessage,

    // 方法
    convertGeoJsonToWkt,
    convertWktToGeoJson,
    validateGeometry,
    simplifyGeometry,
  }
}
