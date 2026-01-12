import { useEffect, useRef, useState } from "react";
import { createChartDatafeed } from "../utils/chart-datafeed";
import * as GoChartingSDK from "@gocharting/chart-sdk";
import type {
	ChartInstance,
	ChartConfig,
	Order,
	Trade,
	Position,
	OrderSide,
	OrderType as SDKOrderType,
	OrderStatus,
} from "@gocharting/chart-sdk";
import "./ChartSDKAdvanced.css";

// Extract the appCallback type from ChartConfig
type AppCallback = NonNullable<ChartConfig["appCallback"]>;

// Type for the datafeed returned by createChartDatafeed
type ChartDatafeed = ReturnType<typeof createChartDatafeed>;

interface OrderHistoryItem {
	timestamp: string;
	side: string;
	quantity: number;
	symbol: string;
	orderType: string;
	limitPrice?: string;
	stopLoss?: string;
	takeProfit?: string;
	status: string;
}

/**
 * Security information from SDK
 */
interface SecurityData {
	exchange?: string;
	symbol?: string;
	full_name?: string;
	productType?: string;
	segment?: string;
}

/**
 * Order details from UI or SDK callbacks
 */
interface OrderDetails {
	orderId?: string;
	price?: number;
	size?: number;
	quantity?: number;
	productId?: string;
	orderType?: string;
	side?: OrderSide;
	takeProfit?: number | string | null;
	stopLoss?: number | string | null;
	stopPrice?: number | null;
	symbol?: string;
}

/**
 * Input data for creating/modifying orders from UI or SDK callbacks
 */
interface OrderInputData {
	order?: OrderDetails;
	security?: SecurityData;
	orderId?: string;
	price?: number;
	size?: number;
	quantity?: number;
	symbol?: string;
	orderType?: string;
	type?: string;
	side?: OrderSide;
	takeProfit?: number | string | null;
	stopLoss?: number | string | null;
	stopPrice?: number | null;
	ltp?: number;
}

/**
 * Demo account structure for trading
 * Extends SDK Account with additional demo-specific fields
 */
interface DemoAccount {
	id: string;
	name: string;
	balance: number;
	currency: string;
	broker?: string;
	leverage?: number;
	marginUsed?: number;
	marginAvailable?: number;
	// Additional demo-specific fields
	account_id?: string;
	AccountID?: string;
	AccountType?: string;
	label?: string;
	equity?: number;
	margin?: number;
	freeMargin?: number;
}

export const ChartSDKAdvanced = () => {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const chartWrapperRef = useRef<ChartInstance | null>(null);
	const datafeedRef = useRef<ChartDatafeed | null>(null);

	// Trading state
	const [quantity, setQuantity] = useState(100);
	const [stopLoss, setStopLoss] = useState("");
	const [takeProfit, setTakeProfit] = useState("");
	const [orderType, setOrderType] = useState<"market" | "limit">("market");
	const [limitPrice, setLimitPrice] = useState("");
	const [status, setStatus] = useState("Loading chart...");
	const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([
		{
			timestamp: new Date().toLocaleTimeString(),
			side: "buy",
			quantity: 100,
			symbol: "BTCUSDT",
			orderType: "market",
			status: "Filled",
		},
	]);

	// Broker data state
	const currentSymbol = useRef("BYBIT:FUTURE:BTCUSDT");
	const currentOrderBook = useRef<Order[]>([]);
	const currentTradeBook = useRef<Trade[]>([]);
	const currentPositions = useRef<Position[]>([]);
	const currentAccountList = useRef<DemoAccount[]>([
		{
			id: "DEMO_001",
			name: "Demo Account (Trading)",
			account_id: "DEMO_001",
			AccountID: "DEMO_001",
			AccountType: "Demo Trading",
			label: "Demo Account (Trading)",
			currency: "USD",
			balance: 100000,
			equity: 100000,
			margin: 0,
			freeMargin: 100000,
		},
	]);

	useEffect(() => {
		// Initialize chart when component mounts
		const timer = setTimeout(() => {
			initializeChart();
		}, 100);

		return () => {
			clearTimeout(timer);
			// Cleanup chart on unmount
			if (chartWrapperRef.current) {
				try {
					if (!chartWrapperRef.current.isDestroyed()) {
						chartWrapperRef.current.destroy();
					}
				} catch (e) {
					if (
						!(e instanceof Error) ||
						!e.message.includes("removeChild")
					) {
						console.error("Error destroying chart:", e);
					}
				}
				chartWrapperRef.current = null;
			}
			// Cleanup datafeed
			if (datafeedRef.current) {
				try {
					datafeedRef.current.destroy();
				} catch (e) {
					console.error("Error destroying datafeed:", e);
				}
				datafeedRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Helper methods
	const updateChartBrokerData = () => {
		if (!chartWrapperRef.current) {
			console.warn("Chart instance not available");
			return;
		}

		const demoBrokerData: GoChartingSDK.BrokerAccountData = {
			accountList: currentAccountList.current,
			orderBook: currentOrderBook.current,
			tradeBook: currentTradeBook.current,
			positions: currentPositions.current,
		};

		try {
			chartWrapperRef.current.setBrokerAccounts(demoBrokerData);
			console.log("✅ Broker data updated successfully");
		} catch (error) {
			console.error("❌ Failed to update chart broker data:", error);
		}
	};

	const setupDemoBrokerData = (chartInstance: ChartInstance) => {
		console.log("🏦 Setting up demo broker data for trading...");

		const demoBrokerData: GoChartingSDK.BrokerAccountData = {
			accountList: currentAccountList.current,
			orderBook: currentOrderBook.current,
			tradeBook: currentTradeBook.current,
			positions: currentPositions.current,
		};

		try {
			chartInstance.setBrokerAccounts(demoBrokerData);
			console.log("✅ Demo broker data set successfully");
			setStatus("🏦 Demo trading data loaded");
		} catch (error) {
			console.error("❌ Failed to set broker data:", error);
			setStatus("❌ Failed to load trading data");
		}
	};

	const getCurrentLTP = () => {
		// Placeholder - in real implementation, get from chart
		return 110000;
	};

	const handleAppCallback: AppCallback = (eventType, message, onClose) => {
		console.log("*** APP CALLBACK TRIGGERED ***");
		console.log("Event Type:", eventType);
		console.log("Message:", message);
		console.log("onClose callback:", onClose);
		handleTradingEvent(eventType, message);
	};

	const initializeChart = () => {
		if (!GoChartingSDK) {
			setStatus("GoCharting SDK not available");
			return;
		}

		if (!chartContainerRef.current) {
			setStatus("Chart container not available");
			return;
		}

		// Prevent double initialization
		if (chartWrapperRef.current) {
			console.log("Chart already exists, skipping creation");
			return;
		}

		try {
			const datafeed = createChartDatafeed();
			datafeedRef.current = datafeed;

			// Add an ID to the container for the SDK
			if (chartContainerRef.current) {
				chartContainerRef.current.id =
					"gocharting-chart-container-advanced";
			}

			const chartConfig = {
				symbol: "BYBIT:FUTURE:BTCUSDT",
				interval: "1D",
				datafeed: datafeed as any,
				debugLog: true,
				licenseKey: "demo-550e8400-e29b-41d4-a716-446655440000",
				theme: "dark",
				enableTrading: true,
				appCallback: handleAppCallback,
				onReady: (chartInstance) => {
					// Chart is now ready - the wrapper ref is already set
					setStatus("Chart loaded with advanced trading features!");

					console.log("=== CHART READY - TRADING DIAGNOSTICS ===");
					console.log("Chart instance:", !!chartInstance);
					console.log("Trading enabled in config:", true);
					console.log(
						"setBrokerAccounts available:",
						typeof chartInstance.setBrokerAccounts
					);
					console.log("==========================================");

					setupDemoBrokerData(chartInstance);

					chartWrapperRef.current = chartInstance;
				},
				onError: (error) => {
					console.error("Chart creation error:", error);
					if (typeof error === "string") {
						setStatus(`❌ Error creating chart: ${error}`);
					} else {
						setStatus(`❌ Error creating chart: ${error.message}`);
					}
				},
			} satisfies ChartConfig;

			// Store the wrapper object which has destroy(), setSymbol(), etc.
			const chartWrapper = GoChartingSDK.createChart(
				"#gocharting-chart-container-advanced",
				chartConfig
			);
		} catch (error) {
			console.error("Error initializing chart:", error);
			setStatus("Failed to initialize chart");
		}
	};

	const handleTradingEvent = (eventType: string, message: any) => {
		console.log("===== TRADING EVENT RECEIVED =====");
		console.log("Event Type:", eventType);
		console.log("Event Message:", JSON.stringify(message, null, 2));
		console.log("Timestamp:", new Date().toISOString());
		console.log("=====================================");

		switch (eventType) {
			case "CREATE_ORDER":
				console.log("📝 Order creation requested from chart:", message);
				setStatus(
					`📝 Order creation: ${message.side} ${
						message.quantity || "N/A"
					} @ ${message.price || "Market"}`
				);
				break;
			case "PLACE_ORDER":
				console.log("Order placed from chart:", message);
				console.log("Calling addOrderToOrderBook...");
				addOrderToOrderBook(message);
				setStatus(
					`✅ Order placed: ${message.order?.side || message.side} ${
						message.order?.size || message.quantity || "N/A"
					} @ ${message.order?.price || message.price || "Market"}`
				);
				break;
			case "CANCEL_ORDER":
				console.log(
					"❌ Order cancelled from chart:",
					JSON.stringify(message, null, 2)
				);
				const orderId =
					message.orderId ||
					message.order?.orderId ||
					message.id ||
					message.order?.id;
				console.log("📝 Extracted orderId for cancellation:", orderId);

				if (orderId) {
					removeOrderFromOrderBook(orderId);
					setStatus(`🗑️ Order cancelled: ${orderId}`);
				} else {
					console.error(
						"❌ No orderId found in cancel order message:",
						message
					);
					setStatus("❌ Failed to cancel order: No order ID found");
				}
				break;
			case "MODIFY_ORDER":
				console.log("✏️ Order modified from chart:", message);
				modifyOrderInOrderBook(message);
				setStatus(`✏️ Order modified: ${message.orderId}`);
				break;
			case "OPEN_TRADING_WIDGET":
				console.log("🎛️ Trading widget opened from chart");
				setStatus(`🎛️ Trading widget opened`);
				break;
			default:
				console.log(`🔔 Chart event: ${eventType}`, message);
				break;
		}
	};

	const addOrderToOrderBook = (orderData: OrderInputData) => {
		console.log("🔍 ===== ADD ORDER TO ORDER BOOK DEBUG =====");
		console.log(
			"📝 Raw order data received:",
			JSON.stringify(orderData, null, 2)
		);

		if (!chartWrapperRef.current) {
			console.warn("Chart instance not available");
			return;
		}

		// Extract order details - prefer nested order object if present
		const order: OrderDetails = orderData.order || {};
		const security: SecurityData = orderData.security || {};
		const ltp = orderData.ltp || getCurrentLTP();

		const orderId =
			order.orderId ||
			orderData.orderId ||
			`ORDER_${Date.now()}_${Math.random()
				.toString(36)
				.substring(2, 11)}`;

		const orderSize =
			order.size ||
			order.quantity ||
			orderData.quantity ||
			orderData.size ||
			0;

		const symbolName = (
			security.symbol ||
			order.symbol ||
			orderData.symbol ||
			currentSymbol.current
		).replace("BYBIT:FUTURE:", "");

		const productId =
			order.productId ||
			security.full_name ||
			orderData.symbol ||
			currentSymbol.current;

		const newOrder: Order = {
			orderId: orderId,
			datetime: new Date(),
			timeStamp: new Date().getTime(),
			lastTradeTimestamp: null,
			status: "open" as OrderStatus,
			price: order.price || orderData.price || 0,
			size: orderSize,
			productId: productId,
			remainingSize: orderSize,
			orderType: (order.orderType ||
				orderData.orderType ||
				orderData.type ||
				"limit") as SDKOrderType,
			side: (order.side || orderData.side || "buy") as OrderSide,
			cost: null,
			trades: [],
			fee: {
				currency: "USDT",
				cost: 0.0,
				rate: 0.0,
			},
			info: {},
			fillPrice: null,
			avgFillPrice: null,
			filledSize: 0,
			modifiedAt: null,
			exchange: security.exchange || "BYBIT",
			symbol: symbolName,
			takeProfit: order.takeProfit || orderData.takeProfit || null,
			stopLoss: order.stopLoss || orderData.stopLoss || null,
			isGC: true,
			paperTraderKey: null,
			key: `demo-${
				order.productId ||
				security.full_name ||
				orderData.symbol ||
				currentSymbol.current
			}-${orderId}`,
			validity: "DAY",
			commissions: 0,
			broker: "demo",
			stopPrice: order.stopPrice || orderData.stopPrice || null,
			productType: "FUTURE",
			rejReason: null,
			security: {
				symbol: (orderData.symbol || currentSymbol.current).replace(
					"BYBIT:FUTURE:",
					""
				),
				exchange: "BYBIT",
				segment: "FUTURE",
				tick_size: 0.01,
				lot_size: 0.001,
			},
			userTag: null,
			segment: "FUTURE",
			currency: "USDT",
		};

		currentOrderBook.current.push(newOrder);

		// Check if this is a market order - if so, create position and trade
		const isMarketOrder =
			(order.orderType || orderData.orderType || "").toLowerCase() ===
			"market";

		if (isMarketOrder) {
			console.log(
				"🚀 Market order detected - creating position and trade..."
			);
			createPositionAndTrade(newOrder, order, security, ltp);

			// Check if market order has take profit and/or stop loss
			handleMarketOrderWithTPSL(newOrder, order, security, ltp);
		}

		// Add to order history
		addOrderToHistory({
			timestamp: new Date().toLocaleTimeString(),
			side: newOrder.side,
			quantity: newOrder.size,
			symbol: newOrder.symbol,
			orderType: newOrder.orderType,
			limitPrice:
				newOrder.price > 0 ? newOrder.price.toString() : undefined,
			stopLoss: newOrder.stopLoss?.toString() || undefined,
			takeProfit: newOrder.takeProfit?.toString() || undefined,
			status: isMarketOrder ? "Filled" : "Open",
		});

		updateChartBrokerData();
		console.log("✅ Order added to order book successfully");
	};

	const createPositionAndTrade = (
		newOrder: Order,
		_order: any, // Kept for API consistency with handleMarketOrderWithTPSL
		security: any,
		ltp: number
	) => {
		console.log("🔍 ===== CREATE POSITION AND TRADE DEBUG =====");

		const tradeId = `TRADE_${Date.now()}_${Math.random()
			.toString(36)
			.substring(2, 9)}`;
		const executionPrice = ltp;

		const newTrade: Trade = {
			tradeId: tradeId,
			orderId: newOrder.orderId,
			symbol: newOrder.symbol,
			side: newOrder.side,
			price: executionPrice,
			size: newOrder.size,
			value: executionPrice * newOrder.size,
			commission: executionPrice * newOrder.size * 0.001,
			timestamp: new Date().toISOString(),
		};

		currentTradeBook.current.push(newTrade);

		// Create or update position
		const existingPositionIndex = currentPositions.current.findIndex(
			(pos) =>
				pos.productId === newOrder.productId &&
				pos.symbol === newOrder.symbol
		);

		// Position size: positive = long, negative = short
		const orderSizeWithSign =
			newOrder.side === "sell" ? -newOrder.size : newOrder.size;

		if (existingPositionIndex !== -1) {
			const existingPosition =
				currentPositions.current[existingPositionIndex];
			const oldSize = existingPosition.size;
			const oldPrice = existingPosition.price;

			// Same direction: add to position
			const isSameDirection =
				(oldSize > 0 && orderSizeWithSign > 0) ||
				(oldSize < 0 && orderSizeWithSign < 0);

			if (isSameDirection) {
				const totalSize = oldSize + orderSizeWithSign;
				const avgPrice =
					(Math.abs(oldPrice * oldSize) +
						Math.abs(executionPrice * orderSizeWithSign)) /
					Math.abs(totalSize);
				existingPosition.size = totalSize;
				existingPosition.price = avgPrice;
				existingPosition.amount = avgPrice * Math.abs(totalSize);
				existingPosition.size_currency = Math.abs(totalSize);
			} else {
				// Opposite direction: reduce or close position
				existingPosition.size = oldSize + orderSizeWithSign;
				if (Math.abs(existingPosition.size) < 0.0001) {
					// Position closed
					currentPositions.current.splice(existingPositionIndex, 1);
				} else {
					existingPosition.amount =
						existingPosition.price *
						Math.abs(existingPosition.size);
					existingPosition.size_currency = Math.abs(
						existingPosition.size
					);
				}
			}
		} else {
			const positionId = `POS_${Date.now()}_${Math.random()
				.toString(36)
				.substring(2, 9)}`;
			const newPosition: Position = {
				id: positionId,
				productId: newOrder.productId,
				symbol: newOrder.symbol,
				size: orderSizeWithSign,
				size_currency: Math.abs(newOrder.size),
				price: executionPrice,
				amount: executionPrice * newOrder.size,
				pnl: 0,
				unPnl: 0,
				rPnl: 0,
				exchange: newOrder.exchange,
				broker: "demo",
				productType: "FUTURE",
				underlying: newOrder.symbol,
				security: {
					symbol: newOrder.symbol,
					exchange: newOrder.exchange,
					segment: "FUTURE",
					tick_size: security.tick_size || 0.01,
					lot_size: security.contract_size || 1,
				},
				key: `demo-${newOrder.productId}-${positionId}`,
				currency: "USDT",
				segment: "FUTURE",
				isGC: true,
			};

			currentPositions.current.push(newPosition);
		}

		// Update order status to filled
		newOrder.status = "filled";
		newOrder.filledSize = newOrder.size;
		newOrder.remainingSize = 0;
		newOrder.fillPrice = executionPrice;
		newOrder.avgFillPrice = executionPrice;
	};

	const handleMarketOrderWithTPSL = (
		newOrder: Order,
		order: any,
		security: any,
		ltp: number
	) => {
		const hasTP = order.takeProfit && parseFloat(order.takeProfit) > 0;
		const hasSL = order.stopLoss && parseFloat(order.stopLoss) > 0;

		if (!hasTP && !hasSL) {
			return;
		}

		if (hasTP) {
			placeTPSLOrder(newOrder, order, security, ltp, "takeProfit");
		}

		if (hasSL) {
			placeTPSLOrder(newOrder, order, security, ltp, "stopLoss");
		}
	};

	const placeTPSLOrder = (
		originalOrder: Order,
		order: any,
		_security: any,
		_ltp: number,
		type: "takeProfit" | "stopLoss"
	) => {
		const isTP = type === "takeProfit";
		const price = parseFloat(isTP ? order.takeProfit : order.stopLoss);
		const orderType = isTP ? "limit" : "stop";
		const oppositeSide = originalOrder.side === "buy" ? "sell" : "buy";

		const tpslOrderId = `${type.toUpperCase()}_${Date.now()}_${Math.random()
			.toString(36)
			.substring(2, 9)}`;

		const tpslOrder: Order = {
			orderId: tpslOrderId,
			datetime: new Date(),
			timeStamp: new Date().getTime(),
			lastTradeTimestamp: null,
			status: "open",
			price: isTP ? price : 0,
			stopPrice: isTP ? null : price,
			size: originalOrder.size,
			productId: originalOrder.productId,
			remainingSize: originalOrder.size,
			orderType: orderType,
			side: oppositeSide,
			cost: null,
			trades: [],
			fee: {
				currency: "USDT",
				cost: 0.0,
				rate: 0.0,
			},
			info: {},
			fillPrice: null,
			avgFillPrice: null,
			filledSize: 0,
			modifiedAt: null,
			exchange: originalOrder.exchange,
			symbol: originalOrder.symbol,
			takeProfit: null,
			stopLoss: null,
			isGC: true,
			paperTraderKey: null,
			key: `demo-${originalOrder.productId}-${tpslOrderId}`,
			validity: "DAY",
			commissions: 0,
			broker: "demo",
			productType: "FUTURE",
			rejReason: null,
			security: originalOrder.security,
			userTag: `${type}_for_${originalOrder.orderId}`,
			segment: "FUTURE",
			currency: "USDT",
		};

		currentOrderBook.current.push(tpslOrder);

		// Add to order history
		addOrderToHistory({
			timestamp: new Date().toLocaleTimeString(),
			side: tpslOrder.side,
			quantity: tpslOrder.size,
			symbol: tpslOrder.symbol,
			orderType: tpslOrder.orderType,
			limitPrice: isTP ? price.toString() : undefined,
			stopLoss: !isTP ? price.toString() : undefined,
			status: "Open",
		});
	};

	const removeOrderFromOrderBook = (orderId: string) => {
		console.log("🗑️ Removing order from order book:", orderId);

		const orderIndex = currentOrderBook.current.findIndex(
			(order) => order.orderId === orderId
		);

		if (orderIndex !== -1) {
			const removedOrder = currentOrderBook.current.splice(
				orderIndex,
				1
			)[0];
			console.log("✅ Order removed:", removedOrder);

			// Add to order history
			addOrderToHistory({
				timestamp: new Date().toLocaleTimeString(),
				side: removedOrder.side,
				quantity: removedOrder.size,
				symbol: removedOrder.symbol,
				orderType: removedOrder.orderType,
				limitPrice:
					removedOrder.price > 0
						? removedOrder.price.toString()
						: undefined,
				status: "Cancelled",
			});

			updateChartBrokerData();
		} else {
			console.warn("❌ Order not found in order book:", orderId);
		}
	};

	const modifyOrderInOrderBook = (modifyData: any) => {
		console.log("✏️ Modifying order in order book:", modifyData);

		const orderId =
			modifyData.orderId || modifyData.order?.orderId || modifyData.id;
		const orderIndex = currentOrderBook.current.findIndex(
			(order) => order.orderId === orderId
		);

		if (orderIndex !== -1) {
			const order = currentOrderBook.current[orderIndex];
			const oldPrice = order.price;
			const oldSize = order.size;

			if (modifyData.price !== undefined) {
				order.price = modifyData.price;
			}
			if (
				modifyData.size !== undefined ||
				modifyData.quantity !== undefined
			) {
				const newSize = modifyData.size || modifyData.quantity;
				order.size = newSize;
				order.remainingSize = newSize - (order.filledSize || 0);
			}
			if (modifyData.stopLoss !== undefined) {
				order.stopLoss = modifyData.stopLoss;
			}
			if (modifyData.takeProfit !== undefined) {
				order.takeProfit = modifyData.takeProfit;
			}

			order.modifiedAt = new Date().getTime();

			console.log(
				`✅ Order modified: ${orderId} - Price: ${oldPrice} → ${order.price}, Size: ${oldSize} → ${order.size}`
			);

			// Add to order history
			addOrderToHistory({
				timestamp: new Date().toLocaleTimeString(),
				side: order.side,
				quantity: order.size,
				symbol: order.symbol,
				orderType: order.orderType,
				limitPrice:
					order.price > 0 ? order.price.toString() : undefined,
				stopLoss: order.stopLoss?.toString() || undefined,
				takeProfit: order.takeProfit?.toString() || undefined,
				status: "Modified",
			});

			updateChartBrokerData();
		} else {
			console.warn("❌ Order not found for modification:", orderId);
		}
	};

	const addOrderToHistory = (orderItem: OrderHistoryItem) => {
		setOrderHistory((prev) => [orderItem, ...prev].slice(0, 10));
	};

	// UI Handlers
	const handleBuyOrder = () => {
		const orderData: OrderInputData = {
			side: "buy" as OrderSide,
			quantity: quantity,
			orderType: orderType,
			price: orderType === "limit" ? parseFloat(limitPrice) || 0 : 0,
			stopLoss: stopLoss ? parseFloat(stopLoss) : null,
			takeProfit: takeProfit ? parseFloat(takeProfit) : null,
			symbol: currentSymbol.current,
		};

		console.log("📝 Placing BUY order:", orderData);
		addOrderToOrderBook(orderData);
		setStatus(`✅ BUY order placed: ${quantity} @ ${orderType}`);
	};

	const handleSellOrder = () => {
		const orderData: OrderInputData = {
			side: "sell" as OrderSide,
			quantity: quantity,
			orderType: orderType,
			price: orderType === "limit" ? parseFloat(limitPrice) || 0 : 0,
			stopLoss: stopLoss ? parseFloat(stopLoss) : null,
			takeProfit: takeProfit ? parseFloat(takeProfit) : null,
			symbol: currentSymbol.current,
		};

		console.log("📝 Placing SELL order:", orderData);
		addOrderToOrderBook(orderData);
		setStatus(`✅ SELL order placed: ${quantity} @ ${orderType}`);
	};

	const handleResetBrokerData = () => {
		currentOrderBook.current = [];
		currentTradeBook.current = [];
		currentPositions.current = [];
		setOrderHistory([]);
		updateChartBrokerData();
		setStatus("🔄 Broker data reset");
		console.log("🔄 All broker data has been reset");
	};

	return (
		<div className='advanced-trading-container'>
			<div className='container'>
				{/* Header */}
				<div className='header'>
					<h1>📈 GoCharting SDK - Advanced Trading</h1>
					<p>
						Professional Financial Charts with Integrated Trading
						Interface ⚡
					</p>
				</div>

				{/* Trading Panel */}
				<div className='trading-panel'>
					<div className='trading-group'>
						<label htmlFor='quantity'>Quantity</label>
						<input
							type='number'
							id='quantity'
							placeholder='100'
							value={quantity}
							onChange={(e) =>
								setQuantity(Number(e.target.value))
							}
							min='1'
							step='1'
						/>
					</div>

					<div className='trading-group'>
						<label htmlFor='stop-loss'>Stop Loss</label>
						<input
							type='number'
							id='stop-loss'
							placeholder='45000'
							value={stopLoss}
							onChange={(e) => setStopLoss(e.target.value)}
							step='0.01'
						/>
					</div>

					<div className='trading-group'>
						<label htmlFor='take-profit'>Take Profit</label>
						<input
							type='number'
							id='take-profit'
							placeholder='55000'
							value={takeProfit}
							onChange={(e) => setTakeProfit(e.target.value)}
							step='0.01'
						/>
					</div>

					<div className='trading-group'>
						<label htmlFor='order-type'>Order Type</label>
						<select
							id='order-type'
							value={orderType}
							onChange={(e) =>
								setOrderType(
									e.target.value as "market" | "limit"
								)
							}
						>
							<option value='market'>Market</option>
							<option value='limit'>Limit</option>
						</select>
					</div>

					<div className='trading-group'>
						<label htmlFor='limit-price'>Limit Price</label>
						<input
							type='number'
							id='limit-price'
							placeholder='50000'
							value={limitPrice}
							onChange={(e) => setLimitPrice(e.target.value)}
							step='0.01'
							disabled={orderType !== "limit"}
						/>
					</div>

					<div className='trading-buttons'>
						<button className='btn buy' onClick={handleBuyOrder}>
							🚀 BUY
						</button>
						<button className='btn sell' onClick={handleSellOrder}>
							📉 SELL
						</button>
						<button
							className='btn secondary'
							onClick={handleResetBrokerData}
						>
							🔄 Reset Broker
						</button>
					</div>
				</div>

				{/* Chart Container */}
				<div
					ref={chartContainerRef}
					id='gocharting-chart-container-advanced'
				>
					<div className='loading'>
						Loading advanced trading chart...
					</div>
				</div>

				{/* Order Status Display */}
				<div className='order-status'>
					<h3>📋 Order History</h3>
					<div className='order-list'>
						{orderHistory.map((order, index) => (
							<div
								key={index}
								className={`order-item ${
									order.side
								} ${order.status.toLowerCase()}`}
							>
								<strong>
									{order.side.toUpperCase()} {order.quantity}{" "}
									{order.symbol}
								</strong>{" "}
								@ {order.orderType}
								{order.limitPrice &&
									` - Price: ${order.limitPrice}`}
								{order.stopLoss && ` - SL: ${order.stopLoss}`}
								{order.takeProfit &&
									` - TP: ${order.takeProfit}`}
								{" - "}
								<span
									style={{
										color:
											order.status === "Filled"
												? "#28a745"
												: order.status === "Cancelled"
												? "#dc3545"
												: order.status === "Modified"
												? "#ff9800"
												: "#4a90e2",
									}}
								>
									{order.status}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Status Bar */}
				<div className='status'>{status}</div>
			</div>
		</div>
	);
};
