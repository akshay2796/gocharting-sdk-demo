# GoCharting SDK - Advanced Trading Example

This document describes the advanced trading example implementation in the GoCharting SDK demo application.

## Overview

The `ChartSDKAdvanced` component demonstrates a comprehensive trading interface with the following features:

- **Full Trading Panel**: Place buy/sell orders with market or limit order types
- **Stop Loss & Take Profit**: Set SL/TP levels for risk management
- **Order Management**: View, modify, and cancel orders
- **Order History**: Track the last 10 orders with detailed information
- **Broker Data Integration**: Manage order book, trade book, positions, and account data
- **Real-time Updates**: All trading actions update the chart in real-time

## Features

### 1. Trading Panel

The trading panel provides a user-friendly interface for placing orders:

- **Order Type Selection**: Toggle between Market and Limit orders
- **Quantity Input**: Specify the order quantity
- **Limit Price**: Set limit price for limit orders
- **Stop Loss**: Optional stop loss price
- **Take Profit**: Optional take profit price
- **Buy/Sell Buttons**: Execute orders with a single click

### 2. Order Management

The component handles various order operations:

- **Place Orders**: Create new buy/sell orders
- **Cancel Orders**: Remove pending orders
- **Modify Orders**: Update order parameters
- **Market Orders with TP/SL**: Automatically creates TP/SL orders when market orders are placed

### 3. Broker Data Management

The component maintains comprehensive broker data:

- **Order Book**: All pending and filled orders
- **Trade Book**: Executed trades
- **Positions**: Current open positions
- **Account List**: Demo account information

### 4. Order History

Displays the last 10 orders with:

- Timestamp
- Side (Buy/Sell)
- Quantity
- Symbol
- Order Type
- Limit Price (if applicable)
- Stop Loss (if set)
- Take Profit (if set)
- Status (Filled, Open, Cancelled, Modified)

## Implementation Details

### Key Components

1. **ChartSDKAdvanced.tsx**: Main component with trading logic
2. **AdvancedTradingPage.tsx**: Page wrapper for the component
3. **App.tsx**: Updated to use the advanced trading page

### State Management

The component uses React hooks for state management:

- `useState` for UI state (quantity, prices, order history)
- `useRef` for broker data (orders, trades, positions, accounts)
- `useEffect` for chart initialization and cleanup

### Trading Flow

1. User configures order parameters in the trading panel
2. User clicks Buy or Sell button
3. `handleBuyOrder` or `handleSellOrder` creates order data
4. `addOrderToOrderBook` processes the order:
   - Creates Order object with all required fields
   - For market orders: Creates position and trade immediately
   - For market orders with TP/SL: Creates additional TP/SL orders
   - Updates order history
5. `updateChartBrokerData` syncs data with the chart
6. Chart displays updated orders, positions, and trades

### Event Handling

The component handles chart events through `appCallback`:

- `CREATE_ORDER`: Order creation initiated from chart
- `PLACE_ORDER`: Order placement from chart
- `CANCEL_ORDER`: Order cancellation from chart
- `MODIFY_ORDER`: Order modification from chart
- `OPEN_TRADING_WIDGET`: Trading widget opened

## Usage

### Running the Example

1. The example is currently set as the default in `App.tsx`
2. Start the development server: `npm start`
3. The chart will load with the trading panel on the right (desktop) or bottom (mobile)

### Switching Between Examples

To switch back to the basic example, edit `src/App.tsx`:

```typescript
// Uncomment this line and comment out AdvancedTradingPage
import CombineChart from "./pages/CombineChart";
// import AdvancedTradingPage from "./pages/AdvancedTradingPage";

function App() {
	return <CombineChart />;
	// return <AdvancedTradingPage />;
}
```

### Placing Orders

1. **Market Order**:
   - Select "Market" order type
   - Enter quantity
   - Optionally set Stop Loss and/or Take Profit
   - Click Buy or Sell

2. **Limit Order**:
   - Select "Limit" order type
   - Enter quantity
   - Enter limit price
   - Optionally set Stop Loss and/or Take Profit
   - Click Buy or Sell

### Managing Orders

- **View Orders**: Check the order history panel
- **Cancel Orders**: Use the chart's order management interface
- **Reset All**: Click "Reset All Orders & Positions" to clear all data

## Technical Notes

### Type Safety

The component uses TypeScript with proper type definitions for:
- Order objects
- Trade objects
- Position objects
- Order history items

### Error Handling

All trading operations include error handling with console logging for debugging.

### Responsive Design

The layout adapts to different screen sizes:
- Desktop: Trading panel on the right
- Mobile: Trading panel at the bottom

## Future Enhancements

Potential improvements for this example:

1. Real-time price updates for positions
2. P&L calculations
3. Order validation (e.g., sufficient balance)
4. Advanced order types (OCO, trailing stop)
5. Trade analytics and statistics
6. Export order history
7. Multiple account support

## Support

For questions or issues, please refer to the GoCharting SDK documentation or contact support.

