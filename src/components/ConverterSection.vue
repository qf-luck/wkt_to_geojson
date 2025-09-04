<template>
  <div class="converter-section">
    <!-- GeoJSON 输入 -->
    <div class="input-panel">
      <InputCard
        v-model="localGeojsonText"
        type="geojson"
        title="📄 GeoJSON"
        placeholder="请输入GeoJSON数据，或在地图上绘制图形"
        :error="geojsonError"
        :loading="drawingOnMap"
        @draw-on-map="$emit('draw-on-map', $event, 'geojson')"
      />
    </div>

    <!-- 转换按钮 -->
    <ConvertButtons
      :geojsonText="localGeojsonText"
      :wktText="localWktText"
      :geojsonError="geojsonError"
      :wktError="wktError"
      :converting="converting"
      @convert-geojson-to-wkt="$emit('convert-geojson-to-wkt')"
      @convert-wkt-to-geojson="$emit('convert-wkt-to-geojson')"
      @validate-geometry="$emit('validate-geometry')"
      @simplify-geometry="$emit('simplify-geometry')"
    />

    <!-- WKT 输入 -->
    <div class="input-panel">
      <InputCard
        v-model="localWktText"
        type="wkt"
        title="📐 WKT"
        placeholder="请输入WKT（Well-Known Text）格式数据"
        :error="wktError"
        :loading="drawingOnMap"
        @draw-on-map="$emit('draw-on-map', $event, 'wkt')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import InputCard from './InputCard.vue'
import ConvertButtons from './ConvertButtons.vue'

// Props
const props = defineProps({
  geojsonText: String,
  wktText: String,
  geojsonError: String,
  wktError: String,
  converting: Boolean,
  drawingOnMap: Boolean,
})

// Emits
const emit = defineEmits([
  'update:geojsonText',
  'update:wktText',
  'convert-geojson-to-wkt',
  'convert-wkt-to-geojson',
  'draw-on-map',
  'validate-geometry',
  'simplify-geometry',
])

// 双向绑定的本地计算属性
const localGeojsonText = computed({
  get: () => props.geojsonText,
  set: (value) => emit('update:geojsonText', value),
})

const localWktText = computed({
  get: () => props.wktText,
  set: (value) => emit('update:wktText', value),
})
</script>

<style scoped>
.converter-section {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.input-panel {
  min-width: 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .converter-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
