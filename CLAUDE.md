# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WKTToGeoJSON is a Vue 3 web application for bidirectional conversion between WKT (Well-Known Text) and GeoJSON formats, with interactive map visualization using Leaflet. The application provides geometric validation, simplification, and advanced map operations.

## Development Commands

```bash
# Development server (hot reload on port 5173)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Lint and fix code
npm run lint

# Format code with Prettier
npm run format
```

## Architecture

### Component Structure

The application follows Vue 3 Composition API patterns with a clear separation of concerns:

- **App.vue**: Root component that orchestrates all sections and manages global state
- **Components**: Organized into logical sections (Header, Converter, Map, Stats, Dialogs)
- **Composables**: Reusable business logic modules
  - `useGeometry.js`: Handles WKT/GeoJSON conversion, validation, and simplification
  - `useMapOperations.js`: Manages map interactions, selections, and spatial operations
  - `useValidation.js`: Validates GeoJSON and WKT input
  - `useHistory.js`: History/undo management
  - `useFileOperations.js`: File import/export operations

### Key Dependencies

- **Vue 3**: Core framework with Composition API
- **Element Plus**: UI component library (auto-imported via unplugin)
- **Leaflet**: Map rendering and interaction
- **Turf.js** (`@turf/turf`): Geospatial analysis (area, length, distance, bbox, centroid, etc.)
- **wellknown**: WKT parsing and stringification
- **Vite**: Build tool and dev server

### State Management

No centralized store - state is managed through:
1. Composables that return reactive refs
2. Props/events for component communication
3. Provide/inject pattern where needed

### Map Reference Architecture

The map component (`LeafletMap.vue`) exposes a ref that is accessed through `MapSection.vue` to `App.vue` via `mapSectionRef`. The `useMapOperations` composable manages this reference and provides map operations to parent components.

**Critical pattern**: Always use `setLeafletMapRef()` in `useMapOperations` to properly initialize the map reference. The reference is set after mount with retry logic (see App.vue:254-267).

### Auto-Import Configuration

Element Plus components and APIs are auto-imported via `unplugin-auto-import` and `unplugin-vue-components` (see vite.config.js). You don't need explicit imports for Element Plus components.

## Code Patterns

### Error Handling

Global error handling is configured in main.js with `errorHandler` and `warnHandler`. Components use try-catch blocks and display user-friendly messages via Element Plus message components.

### Geometry Operations

All geometric calculations use Turf.js functions. Common patterns:
- Always validate geometry type before calculating area/length
- Handle circular geometries separately (use `layer.getRadius()` for circles)
- Use `turf.area()` for area, `turf.length()` for distance in meters
- Convert to appropriate units (m², km², hectares)

### Conversion Flow

1. **WKT → GeoJSON**: Parse WKT with `wellknown.parse()`, wrap in Feature/FeatureCollection
2. **GeoJSON → WKT**: Extract geometry, use `wellknown.stringify()`
3. Multi-line WKT input is supported (lines starting with `--` are comments)

### Map Operations Pattern

Always check if map reference exists before operations:
```javascript
if (!leafletMapRef.value?.methodName) {
  ElMessage.warning('地图未准备好')
  return
}
```

### Stats Updates

Statistics are computed reactively using a `statsVersion` ref that increments to trigger recalculation. Call `updateStats()` after any geometry changes.

## Development Notes

- Node.js version requirement: `^20.19.0 || >=22.12.0`
- The app uses Element Plus Chinese locale by default
- All styling uses scoped styles with CSS variables for theming
- Responsive design breakpoint: 768px for mobile
- Leaflet map styles: 'osm' (OpenStreetMap), 'satellite', 'terrain'

## Testing Geometry

Example WKT formats supported:
- Point: `POINT(30 10)`
- LineString: `LINESTRING(30 10, 10 30, 40 40)`
- Polygon: `POLYGON((30 10, 40 40, 20 40, 10 20, 30 10))`

GeoJSON should follow RFC 7946 specification.