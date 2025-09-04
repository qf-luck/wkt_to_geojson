<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="几何信息"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="geometry-info">
      <div v-if="geometryInfo">
        <h4>基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="类型">
            {{ geometryInfo.type }}
          </el-descriptions-item>
          <el-descriptions-item label="坐标系">
            WGS84 (EPSG:4326)
          </el-descriptions-item>
          <el-descriptions-item label="坐标数量" v-if="geometryInfo.coordinates">
            {{ geometryInfo.coordinates }}
          </el-descriptions-item>
          <el-descriptions-item label="面积" v-if="geometryInfo.area">
            {{ geometryInfo.area }}
          </el-descriptions-item>
          <el-descriptions-item label="周长" v-if="geometryInfo.perimeter">
            {{ geometryInfo.perimeter }}
          </el-descriptions-item>
          <el-descriptions-item label="长度" v-if="geometryInfo.length">
            {{ geometryInfo.length }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px">边界框</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="西南角">
            {{ geometryInfo.bbox?.sw }}
          </el-descriptions-item>
          <el-descriptions-item label="东北角">
            {{ geometryInfo.bbox?.ne }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px">中心点</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="几何中心">
            {{ geometryInfo.centroid }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 坐标详情 -->
        <div v-if="geometryInfo.coordinateDetails && showCoordinateDetails">
          <h4 style="margin-top: 20px">坐标详情</h4>
          <div class="coordinate-details">
            <pre>{{ geometryInfo.coordinateDetails }}</pre>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('toggle-coordinate-details')" type="info">
          {{ showCoordinateDetails ? '隐藏' : '显示' }}坐标详情
        </el-button>
        <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
// Props
defineProps({
  modelValue: Boolean,
  geometryInfo: Object,
  showCoordinateDetails: Boolean
})

// Emits
defineEmits([
  'update:modelValue',
  'toggle-coordinate-details'
])
</script>

<style scoped>
.geometry-info h4 {
  margin: 20px 0 12px 0;
  color: #2c3e50;
  border-bottom: 2px solid #e3f2fd;
  padding-bottom: 8px;
  font-weight: 600;
}

.geometry-info h4:first-child {
  margin-top: 0;
}

.coordinate-details {
  max-height: 200px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e9ecef;
}

.coordinate-details pre {
  margin: 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #495057;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 滚动条样式 */
.coordinate-details::-webkit-scrollbar {
  width: 8px;
}

.coordinate-details::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.coordinate-details::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #c1c1c1 0%, #a1a1a1 100%);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.coordinate-details::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #a1a1a1 0%, #8a8a8a 100%);
}
</style>
