import { ref, watch } from 'vue'
import wellknown from 'wellknown'

export function useValidation(geojsonText, wktText) {
  const geojsonError = ref('')
  const wktError = ref('')

  // 防抖定时器
  let validateGeoJsonTimer = null
  let validateWktTimer = null

  // GeoJSON验证
  const validateGeoJson = (text) => {
    if (!text.trim()) {
      geojsonError.value = ''
      return true
    }

    try {
      const data = JSON.parse(text)

      // 检查是否为空对象
      if (Object.keys(data).length === 0) {
        geojsonError.value = '不能为空对象'
        return false
      }

      if (!data.type) {
        geojsonError.value = '缺少必需的 type 字段'
        return false
      }

      const validTypes = [
        'Point',
        'LineString',
        'Polygon',
        'MultiPoint',
        'MultiLineString',
        'MultiPolygon',
        'GeometryCollection',
        'Feature',
        'FeatureCollection',
      ]

      if (!validTypes.includes(data.type)) {
        geojsonError.value = `无效的几何类型: ${data.type}`
        return false
      }

      // 验证几何结构
      if (data.type === 'FeatureCollection') {
        if (!Array.isArray(data.features)) {
          geojsonError.value = 'FeatureCollection 必须包含 features 数组'
          return false
        }

        for (let i = 0; i < data.features.length; i++) {
          const feature = data.features[i]
          if (!feature.geometry || !feature.geometry.type) {
            geojsonError.value = `Feature ${i + 1} 缺少有效的 geometry`
            return false
          }
        }
      } else if (data.type === 'Feature') {
        if (!data.geometry || !data.geometry.type) {
          geojsonError.value = 'Feature 必须包含有效的 geometry'
          return false
        }
      }

      // 验证坐标范围
      const validateCoordinates = (coords, depth = 0) => {
        if (depth > 10) return true // 防止无限递归

        if (Array.isArray(coords)) {
          if (
            coords.length === 2 &&
            typeof coords[0] === 'number' &&
            typeof coords[1] === 'number'
          ) {
            // 这是一个坐标点
            const [lng, lat] = coords
            if (lng < -180 || lng > 180) {
              throw new Error(`经度超出范围: ${lng}`)
            }
            if (lat < -90 || lat > 90) {
              throw new Error(`纬度超出范围: ${lat}`)
            }
          } else {
            // 递归验证数组中的每个元素
            for (const item of coords) {
              validateCoordinates(item, depth + 1)
            }
          }
        }
      }

      // 获取并验证坐标
      const getCoordinates = (obj) => {
        if (obj.type === 'FeatureCollection') {
          obj.features.forEach((feature) => getCoordinates(feature.geometry))
        } else if (obj.type === 'Feature') {
          getCoordinates(obj.geometry)
        } else if (obj.coordinates) {
          validateCoordinates(obj.coordinates)
        } else if (obj.geometries) {
          obj.geometries.forEach((geom) => getCoordinates(geom))
        }
      }

      getCoordinates(data)
      geojsonError.value = ''
      return true
    } catch (e) {
      if (e.message.includes('经度') || e.message.includes('纬度')) {
        geojsonError.value = e.message
      } else {
        geojsonError.value = `JSON 格式错误: ${e.message}`
      }
      return false
    }
  }

  // WKT验证
  const validateWkt = (text) => {
    if (!text.trim()) {
      wktError.value = ''
      return true
    }

    try {
      const lines = text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('--'))

      if (lines.length === 0) {
        wktError.value = '没有有效的WKT内容'
        return false
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        try {
          const parsed = wellknown.parse(line)
          if (!parsed || !parsed.type) {
            throw new Error('解析结果无效')
          }
        } catch (e) {
          wktError.value = `第${i + 1}行WKT格式错误: ${e.message}`
          return false
        }
      }

      wktError.value = ''
      return true
    } catch (e) {
      wktError.value = `WKT 格式错误: ${e.message}`
      return false
    }
  }

  // 防抖验证函数
  const debounceValidateGeoJson = () => {
    clearTimeout(validateGeoJsonTimer)
    validateGeoJsonTimer = setTimeout(() => {
      validateGeoJson(geojsonText.value)
    }, 300)
  }

  const debounceValidateWkt = () => {
    clearTimeout(validateWktTimer)
    validateWktTimer = setTimeout(() => {
      validateWkt(wktText.value)
    }, 300)
  }

  // 监听输入变化
  watch(geojsonText, debounceValidateGeoJson, { immediate: true })
  watch(wktText, debounceValidateWkt, { immediate: true })

  return {
    geojsonError,
    wktError,
    validateGeoJson,
    validateWkt,
  }
}
