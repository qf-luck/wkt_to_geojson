/**
 * 坐标系统转换工具
 * 支持 WGS84、GCJ02（火星坐标）、BD09（百度坐标）之间的相互转换
 */

// 定义常量
const X_PI = (3.14159265358979324 * 3000.0) / 180.0
const PI = 3.1415926535897932384626
const A = 6378245.0 // 长半轴
const EE = 0.00669342162296594323 // 偏心率平方

/**
 * 判断是否在中国境内
 */
function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

/**
 * 转换经度
 */
function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/**
 * 转换纬度
 */
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320.0 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

/**
 * WGS84 转 GCJ02 (GPS坐标 转 火星坐标)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {[number, number]} [lng, lat]
 */
export function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) {
    return [lng, lat]
  }
  let dlat = transformLat(lng - 105.0, lat - 35.0)
  let dlng = transformLng(lng - 105.0, lat - 35.0)
  const radlat = (lat / 180.0) * PI
  let magic = Math.sin(radlat)
  magic = 1 - EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI)
  dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI)
  const mglat = lat + dlat
  const mglng = lng + dlng
  return [mglng, mglat]
}

/**
 * GCJ02 转 WGS84 (火星坐标 转 GPS坐标)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {[number, number]} [lng, lat]
 */
export function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) {
    return [lng, lat]
  }
  let dlat = transformLat(lng - 105.0, lat - 35.0)
  let dlng = transformLng(lng - 105.0, lat - 35.0)
  const radlat = (lat / 180.0) * PI
  let magic = Math.sin(radlat)
  magic = 1 - EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI)
  dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI)
  const mglat = lat + dlat
  const mglng = lng + dlng
  return [lng * 2 - mglng, lat * 2 - mglat]
}

/**
 * GCJ02 转 BD09 (火星坐标 转 百度坐标)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {[number, number]} [lng, lat]
 */
export function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI)
  const bd_lng = z * Math.cos(theta) + 0.0065
  const bd_lat = z * Math.sin(theta) + 0.006
  return [bd_lng, bd_lat]
}

/**
 * BD09 转 GCJ02 (百度坐标 转 火星坐标)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {[number, number]} [lng, lat]
 */
export function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  const gg_lng = z * Math.cos(theta)
  const gg_lat = z * Math.sin(theta)
  return [gg_lng, gg_lat]
}

/**
 * WGS84 转 BD09 (GPS坐标 转 百度坐标)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {[number, number]} [lng, lat]
 */
export function wgs84ToBd09(lng, lat) {
  const gcj = wgs84ToGcj02(lng, lat)
  return gcj02ToBd09(gcj[0], gcj[1])
}

/**
 * BD09 转 WGS84 (百度坐标 转 GPS坐标)
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @returns {[number, number]} [lng, lat]
 */
export function bd09ToWgs84(lng, lat) {
  const gcj = bd09ToGcj02(lng, lat)
  return gcj02ToWgs84(gcj[0], gcj[1])
}

/**
 * 通用坐标转换函数
 * @param {number} lng 经度
 * @param {number} lat 纬度
 * @param {string} from 源坐标系统 'WGS84' | 'GCJ02' | 'BD09'
 * @param {string} to 目标坐标系统 'WGS84' | 'GCJ02' | 'BD09'
 * @returns {[number, number]} [lng, lat]
 */
export function transformCoord(lng, lat, from, to) {
  if (from === to) {
    return [lng, lat]
  }

  // 转换映射表
  const transformMap = {
    'WGS84-GCJ02': wgs84ToGcj02,
    'WGS84-BD09': wgs84ToBd09,
    'GCJ02-WGS84': gcj02ToWgs84,
    'GCJ02-BD09': gcj02ToBd09,
    'BD09-WGS84': bd09ToWgs84,
    'BD09-GCJ02': bd09ToGcj02
  }

  const key = `${from}-${to}`
  const transform = transformMap[key]

  if (!transform) {
    console.warn(`不支持的坐标转换: ${from} -> ${to}`)
    return [lng, lat]
  }

  return transform(lng, lat)
}

/**
 * 转换 GeoJSON 对象的坐标系统
 * @param {Object} geojson GeoJSON 对象
 * @param {string} from 源坐标系统
 * @param {string} to 目标坐标系统
 * @returns {Object} 转换后的 GeoJSON 对象
 */
export function transformGeoJSON(geojson, from, to) {
  if (!geojson || from === to) {
    return geojson
  }

  const result = JSON.parse(JSON.stringify(geojson)) // 深拷贝

  const transformCoordinates = (coords) => {
    if (typeof coords[0] === 'number') {
      // 单个坐标点 [lng, lat]
      return transformCoord(coords[0], coords[1], from, to)
    } else {
      // 嵌套数组
      return coords.map(transformCoordinates)
    }
  }

  if (result.type === 'FeatureCollection') {
    result.features.forEach(feature => {
      if (feature.geometry && feature.geometry.coordinates) {
        feature.geometry.coordinates = transformCoordinates(feature.geometry.coordinates)
      }
    })
  } else if (result.type === 'Feature') {
    if (result.geometry && result.geometry.coordinates) {
      result.geometry.coordinates = transformCoordinates(result.geometry.coordinates)
    }
  } else if (result.coordinates) {
    result.coordinates = transformCoordinates(result.coordinates)
  }

  return result
}