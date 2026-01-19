# GoCharting SDK Demo - Navigation System

## Overview

This React application demonstrates the GoCharting SDK with a multi-page navigation system built using React Router DOM v6.

## Routes

### 1. Home Page (`/`)
- **Component**: `HomePage`
- **Description**: Landing page with navigation cards to different chart examples
- **Features**:
  - Beautiful gradient background
  - Animated cards with hover effects
  - Clear descriptions of each example
  - Responsive design

### 2. Advanced Trading Page (`/advanced-trading`)
- **Component**: `AdvancedTradingPage` → `ChartSDKAdvanced`
- **Description**: Full-featured trading interface
- **Features**:
  - Order Book & Trade Book
  - Position Management
  - Real-time Bybit WebSocket data
  - Interactive trading panel with BUY/SELL buttons
  - Order history tracking
  - Stop Loss & Take Profit controls

### 3. Multi-Basic Chart (`/multi-basic`)
- **Component**: `MultiBasicPage` → `MultiBasicChart`
- **Description**: Simple chart with symbol switching
- **Features**:
  - Symbol switching buttons (BTC, ETH, OGN)
  - Real-time Bybit WebSocket streaming
  - Resubscribe All functionality
  - Clean and simple UI
  - Matches the original `multi-basic.html` example

## File Structure

```
src/
├── App.tsx                          # Main app with routing configuration
├── pages/
│   ├── HomePage.tsx                 # Landing/navigation page
│   ├── HomePage.css                 # Styles for home page
│   ├── AdvancedTradingPage.tsx      # Advanced trading wrapper
│   └── MultiBasicPage.tsx           # Multi-basic chart wrapper
├── components/
│   ├── ChartSDKAdvanced.tsx         # Advanced trading component
│   ├── ChartSDKAdvanced.css         # Advanced trading styles
│   ├── MultiBasicChart.tsx          # Multi-basic chart component
│   └── MultiBasicChart.css          # Multi-basic chart styles
└── utils/
    └── chart-datafeed.ts            # Shared datafeed utility
```

## Technical Details

### React Router Setup

The app uses React Router DOM v6 with the following configuration:

```typescript
<Router>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/advanced-trading" element={<AdvancedTradingPage />} />
    <Route path="/multi-basic" element={<MultiBasicPage />} />
  </Routes>
</Router>
```

### TypeScript Types

All components use strict TypeScript typing:
- Chart wrapper interfaces
- SDK types from `@gocharting/chart-sdk`
- Proper state typing with `useState<T>`
- Ref typing with `useRef<T>`

### Datafeed Reuse

Both chart examples use the same `createChartDatafeed()` utility from `chart-datafeed.ts`:
- Bybit WebSocket integration
- Symbol resolution
- Historical data fetching
- Real-time streaming

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The app will open at `http://localhost:3000` showing the home page with navigation cards.

## Navigation Flow

1. User lands on **Home Page** (`/`)
2. Clicks on a card to navigate to:
   - **Advanced Trading** (`/advanced-trading`)
   - **Multi-Basic Chart** (`/multi-basic`)
3. Each page has its own chart instance with proper cleanup on unmount

## Key Features

### Home Page
- Gradient background matching the SDK theme
- Animated cards with glassmorphism effect
- Feature lists for each example
- Responsive grid layout
- Footer with tech stack information

### Chart Pages
- Proper chart initialization and cleanup
- Real-time data streaming
- Symbol switching
- Status updates
- Error handling
- Responsive design

## Dependencies

- `react`: ^19.2.0
- `react-dom`: ^19.2.0
- `react-router-dom`: ^6.28.0
- `@gocharting/chart-sdk`: 1.0.23
- `typescript`: ^4.4.2

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- React StrictMode is disabled to prevent conflicts with the SDK's legacy ReactDOM usage
- The datafeed uses `as any` type assertion due to minor type incompatibilities between the custom implementation and SDK interface
- All chart instances are properly cleaned up on component unmount to prevent memory leaks

