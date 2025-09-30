// 中国地标和示例数据
export const chinaExamples = {
  // 北京天安门
  tiananmen: {
    name: '北京天安门广场',
    description: '中华人民共和国的象征',
    geojson: {
      type: 'Feature',
      properties: {
        name: '天安门广场',
        city: '北京',
        type: '地标建筑'
      },
      geometry: {
        type: 'Point',
        coordinates: [116.397128, 39.909187]
      }
    },
    wkt: 'POINT(116.397128 39.909187)'
  },

  // 上海东方明珠
  orientalPearl: {
    name: '上海东方明珠',
    description: '上海的标志性建筑',
    geojson: {
      type: 'Feature',
      properties: {
        name: '东方明珠',
        city: '上海',
        type: '地标建筑'
      },
      geometry: {
        type: 'Point',
        coordinates: [121.499763, 31.239666]
      }
    },
    wkt: 'POINT(121.499763 31.239666)'
  },

  // 杭州西湖
  westLake: {
    name: '杭州西湖',
    description: '世界文化遗产',
    geojson: {
      type: 'Feature',
      properties: {
        name: '西湖',
        city: '杭州',
        type: '风景名胜',
        area: '约6.5平方公里'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [120.135, 30.260],
          [120.145, 30.260],
          [120.155, 30.250],
          [120.155, 30.240],
          [120.145, 30.230],
          [120.135, 30.230],
          [120.125, 30.240],
          [120.125, 30.250],
          [120.135, 30.260]
        ]]
      }
    },
    wkt: 'POLYGON((120.135 30.260, 120.145 30.260, 120.155 30.250, 120.155 30.240, 120.145 30.230, 120.135 30.230, 120.125 30.240, 120.125 30.250, 120.135 30.260))'
  },

  // 长江主要河段
  yangtzeRiver: {
    name: '长江主要河段',
    description: '中国第一大河',
    geojson: {
      type: 'Feature',
      properties: {
        name: '长江',
        type: '河流',
        length: '约6300公里'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [91.18, 30.77],  // 源头（青海）
          [97.40, 33.02],  // 青海段
          [101.72, 36.62], // 四川段
          [104.07, 30.65], // 成都附近
          [106.55, 29.56], // 重庆
          [108.38, 30.86], // 三峡
          [111.28, 30.69], // 宜昌
          [114.30, 30.60], // 武汉
          [117.28, 31.86], // 安徽段
          [118.78, 32.06], // 南京
          [121.47, 31.23]  // 上海入海口
        ]
      }
    },
    wkt: 'LINESTRING(91.18 30.77, 97.40 33.02, 101.72 36.62, 104.07 30.65, 106.55 29.56, 108.38 30.86, 111.28 30.69, 114.30 30.60, 117.28 31.86, 118.78 32.06, 121.47 31.23)'
  },

  // 京津冀区域（简化）
  jingJinJi: {
    name: '京津冀区域',
    description: '中国重要的经济圈',
    geojson: {
      type: 'Feature',
      properties: {
        name: '京津冀',
        type: '经济区域',
        provinces: '北京、天津、河北'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [113.5, 36.0],
          [119.5, 36.0],
          [119.5, 42.0],
          [113.5, 42.0],
          [113.5, 36.0]
        ]]
      }
    },
    wkt: 'POLYGON((113.5 36.0, 119.5 36.0, 119.5 42.0, 113.5 42.0, 113.5 36.0))'
  },

  // 粤港澳大湾区主要城市
  bayArea: {
    name: '粤港澳大湾区城市群',
    description: '中国重要的城市群',
    geojson: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: '广州', population: '约1500万' },
          geometry: { type: 'Point', coordinates: [113.264385, 23.129110] }
        },
        {
          type: 'Feature',
          properties: { name: '深圳', population: '约1300万' },
          geometry: { type: 'Point', coordinates: [114.057868, 22.543099] }
        },
        {
          type: 'Feature',
          properties: { name: '香港', population: '约750万' },
          geometry: { type: 'Point', coordinates: [114.173355, 22.320048] }
        },
        {
          type: 'Feature',
          properties: { name: '澳门', population: '约68万' },
          geometry: { type: 'Point', coordinates: [113.543873, 22.198951] }
        },
        {
          type: 'Feature',
          properties: { name: '珠海', population: '约200万' },
          geometry: { type: 'Point', coordinates: [113.576726, 22.270715] }
        },
        {
          type: 'Feature',
          properties: { name: '佛山', population: '约800万' },
          geometry: { type: 'Point', coordinates: [113.121416, 23.021548] }
        },
        {
          type: 'Feature',
          properties: { name: '东莞', population: '约1000万' },
          geometry: { type: 'Point', coordinates: [113.751765, 23.020673] }
        }
      ]
    }
  },

  // 成都市区范围（简化）
  chengdu: {
    name: '成都市区范围',
    description: '四川省省会',
    geojson: {
      type: 'Feature',
      properties: {
        name: '成都市区',
        city: '成都',
        type: '城市范围'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [103.95, 30.75],
          [104.20, 30.75],
          [104.20, 30.55],
          [103.95, 30.55],
          [103.95, 30.75]
        ]]
      }
    },
    wkt: 'POLYGON((103.95 30.75, 104.20 30.75, 104.20 30.55, 103.95 30.55, 103.95 30.75))'
  },

  // 环形区域示例 - 鸟巢体育场
  birdNest: {
    name: '国家体育场（鸟巢）',
    description: '2008年北京奥运会主场馆',
    geojson: {
      type: 'Feature',
      properties: {
        name: '国家体育场',
        nickname: '鸟巢',
        city: '北京',
        type: '体育场馆'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.397, 39.993],
          [116.398, 39.993],
          [116.399, 39.992],
          [116.399, 39.991],
          [116.398, 39.990],
          [116.397, 39.990],
          [116.396, 39.991],
          [116.396, 39.992],
          [116.397, 39.993]
        ]]
      }
    }
  }
}

// 示例列表配置
export const examplesList = [
  {
    id: 'tiananmen',
    label: '🏛️ 北京天安门',
    category: '地标建筑',
    difficulty: '简单'
  },
  {
    id: 'orientalPearl',
    label: '🗼 上海东方明珠',
    category: '地标建筑',
    difficulty: '简单'
  },
  {
    id: 'westLake',
    label: '🏞️ 杭州西湖',
    category: '风景名胜',
    difficulty: '中等'
  },
  {
    id: 'yangtzeRiver',
    label: '🌊 长江主要河段',
    category: '河流',
    difficulty: '中等'
  },
  {
    id: 'jingJinJi',
    label: '🏙️ 京津冀区域',
    category: '经济区域',
    difficulty: '中等'
  },
  {
    id: 'bayArea',
    label: '🌆 粤港澳大湾区',
    category: '城市群',
    difficulty: '复杂'
  },
  {
    id: 'chengdu',
    label: '🐼 成都市区',
    category: '城市范围',
    difficulty: '简单'
  },
  {
    id: 'birdNest',
    label: '🏟️ 国家体育场（鸟巢）',
    category: '体育场馆',
    difficulty: '中等'
  }
]

// 获取示例数据
export function getExample(id) {
  return chinaExamples[id]
}

// 获取所有示例
export function getAllExamples() {
  return examplesList.map(item => ({
    ...item,
    data: chinaExamples[item.id]
  }))
}

// 按类别获取示例
export function getExamplesByCategory(category) {
  return examplesList
    .filter(item => item.category === category)
    .map(item => ({
      ...item,
      data: chinaExamples[item.id]
    }))
}