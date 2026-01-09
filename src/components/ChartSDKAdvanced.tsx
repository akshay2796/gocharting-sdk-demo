import { useEffect, useRef, useState } from "react";
import { Box } from "./Box";
import { Text } from "./Text";
import { useResponsive } from "../hooks/useResponsive";
import { createChartDatafeed } from "../utils/chart-datafeed";
import * as GoChartingSDK from "@gocharting/chart-sdk";
import type {
	ChartInstance,
	ChartConfig,
	Order,
	Trade,
	Position,
} from "@gocharting/chart-sdk";

// Extract the appCallback type from ChartConfig
type AppCallback = NonNullable<ChartConfig["appCallback"]>;

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

export const ChartSDKAdvanced = () => {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const widgetRef = useRef<ChartInstance | null>(null);
	const { isSmallDevice, isMediumDevice } = useResponsive();
	const isMobile = isSmallDevice || isMediumDevice;

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
	const currentAccountList = useRef<any[]>([
		{
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
			if (widgetRef.current) {
				try {
					widgetRef.current.destroy();
				} catch (e) {
					console.error("Error destroying chart:", e);
				}
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Helper methods
	const updateChartBrokerData = () => {
		if (!widgetRef.current) {
			console.warn("Chart instance not available");
			return;
		}

		const demoBrokerData = {
			accountList: currentAccountList.current,
			orderBook: currentOrderBook.current,
			tradeBook: currentTradeBook.current,
			positions: currentPositions.current,
		};

		try {
			widgetRef.current.setBrokerAccounts(demoBrokerData as any);
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
			chartInstance.setBrokerAccounts(demoBrokerData as any);
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

		try {
			const datafeed = createChartDatafeed();

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
					widgetRef.current = chartInstance;
					setStatus("Chart loaded with advanced trading features!");

					console.log("=== CHART READY - TRADING DIAGNOSTICS ===");
					console.log("Chart instance:", !!chartInstance);
					console.log("Trading enabled in config:", true);
					console.log(
						"setBrokerAccounts available:",
						typeof chartInstance.setBrokerAccounts
					);
					console.log(
						"Chart instance methods:",
						Object.getOwnPropertyNames(chartInstance)
					);
					console.log("==========================================");

					setupDemoBrokerData(chartInstance);
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

			const chart = GoChartingSDK.createChart(
				"#gocharting-chart-container-advanced",
				chartConfig
			);

			widgetRef.current = chart;
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

	const addOrderToOrderBook = (orderData: any) => {
		console.log("🔍 ===== ADD ORDER TO ORDER BOOK DEBUG =====");
		console.log(
			"📝 Raw order data received:",
			JSON.stringify(orderData, null, 2)
		);

		if (!widgetRef.current) {
			console.warn("Chart instance not available");
			return;
		}

		const order = orderData.order || orderData;
		const security = orderData.security || {};
		const ltp = orderData.ltp || getCurrentLTP();

		const orderId =
			order.orderId ||
			orderData.orderId ||
			`ORDER_${Date.now()}_${Math.random()
				.toString(36)
				.substring(2, 11)}`;

		const newOrder: Order = {
			orderId: orderId,
			datetime: new Date(),
			timeStamp: new Date().getTime(),
			lastTradeTimestamp: null,
			status: "open" as any,
			price: order.price || orderData.price || 0,
			size:
				order.size ||
				order.quantity ||
				orderData.quantity ||
				orderData.size ||
				0,
			productId:
				order.productId ||
				security.full_name ||
				orderData.symbol ||
				currentSymbol.current,
			remainingSize:
				order.size ||
				order.quantity ||
				orderData.quantity ||
				orderData.size ||
				0,
			orderType:
				order.orderType ||
				orderData.orderType ||
				orderData.type ||
				"limit",
			side: order.side || orderData.side || "buy",
			cost: null,
			trades: [],
			fee: {
				currency: "USDT",
				cost: 0.0,
				rate: 0.0,
			},
			info: {},
			fillPrice: null as any,
			avgFillPrice: null as any,
			filledSize: 0,
			modifiedAt: null as any,
			exchange: security.exchange || "BYBIT",
			symbol: (
				security.symbol ||
				order.symbol ||
				orderData.symbol ||
				currentSymbol.current
			).replace("BYBIT:FUTURE:", ""),
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
		order: any,
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
		const orderData = {
			side: "buy",
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
		const orderData = {
			side: "sell",
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
		<Box
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100vh",
				width: "100%",
				backgroundColor: "#1a1a1a",
			}}
		>
			{/* Header */}
			<Box
				style={{
					padding: "1rem",
					backgroundColor: "#2a2a2a",
					borderBottom: "1px solid #3a3a3a",
				}}
			>
				<Text
					style={{
						fontSize: "1.5rem",
						fontWeight: "bold",
						color: "#ffffff",
						marginBottom: "0.5rem",
					}}
				>
					GoCharting SDK - Advanced Trading Example
				</Text>
				<Text style={{ color: "#888", fontSize: "0.9rem" }}>
					{status}
				</Text>
			</Box>

			{/* Main Content */}
			<Box
				style={{
					display: "flex",
					flexDirection: isMobile ? "column" : "row",
					flex: 1,
					overflow: "hidden",
				}}
			>
				{/* Chart Container */}
				<Box
					style={{
						flex: 1,
						position: "relative",
						minHeight: isMobile ? "400px" : "auto",
					}}
				>
					<div
						ref={chartContainerRef}
						style={{
							width: "100%",
							height: "100%",
							position: "absolute",
							top: 0,
							left: 0,
						}}
					/>
				</Box>

				{/* Trading Panel */}
				<Box
					style={{
						width: isMobile ? "100%" : "350px",
						backgroundColor: "#2a2a2a",
						borderLeft: isMobile ? "none" : "1px solid #3a3a3a",
						borderTop: isMobile ? "1px solid #3a3a3a" : "none",
						padding: "1rem",
						overflowY: "auto",
						display: "flex",
						flexDirection: "column",
						gap: "1rem",
					}}
				>
					<Text
						style={{
							fontSize: "1.2rem",
							fontWeight: "bold",
							color: "#ffffff",
							marginBottom: "0.5rem",
						}}
					>
						Trading Panel
					</Text>

					{/* Order Type Selection */}
					<Box
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "0.5rem",
						}}
					>
						<Text style={{ color: "#aaa", fontSize: "0.9rem" }}>
							Order Type
						</Text>
						<Box style={{ display: "flex", gap: "0.5rem" }}>
							<button
								onClick={() => setOrderType("market")}
								style={{
									flex: 1,
									padding: "0.5rem",
									backgroundColor:
										orderType === "market"
											? "#4CAF50"
											: "#3a3a3a",
									color: "#fff",
									border: "none",
									borderRadius: "4px",
									cursor: "pointer",
									fontSize: "0.9rem",
								}}
							>
								Market
							</button>
							<button
								onClick={() => setOrderType("limit")}
								style={{
									flex: 1,
									padding: "0.5rem",
									backgroundColor:
										orderType === "limit"
											? "#4CAF50"
											: "#3a3a3a",
									color: "#fff",
									border: "none",
									borderRadius: "4px",
									cursor: "pointer",
									fontSize: "0.9rem",
								}}
							>
								Limit
							</button>
						</Box>
					</Box>

					{/* Quantity Input */}
					<Box
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "0.5rem",
						}}
					>
						<Text style={{ color: "#aaa", fontSize: "0.9rem" }}>
							Quantity
						</Text>
						<input
							type='number'
							value={quantity}
							onChange={(e) =>
								setQuantity(Number(e.target.value))
							}
							style={{
								padding: "0.5rem",
								backgroundColor: "#3a3a3a",
								color: "#fff",
								border: "1px solid #4a4a4a",
								borderRadius: "4px",
								fontSize: "0.9rem",
							}}
						/>
					</Box>

					{/* Limit Price Input (only for limit orders) */}
					{orderType === "limit" && (
						<Box
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "0.5rem",
							}}
						>
							<Text style={{ color: "#aaa", fontSize: "0.9rem" }}>
								Limit Price
							</Text>
							<input
								type='number'
								value={limitPrice}
								onChange={(e) => setLimitPrice(e.target.value)}
								placeholder='Enter limit price'
								style={{
									padding: "0.5rem",
									backgroundColor: "#3a3a3a",
									color: "#fff",
									border: "1px solid #4a4a4a",
									borderRadius: "4px",
									fontSize: "0.9rem",
								}}
							/>
						</Box>
					)}

					{/* Stop Loss Input */}
					<Box
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "0.5rem",
						}}
					>
						<Text style={{ color: "#aaa", fontSize: "0.9rem" }}>
							Stop Loss (Optional)
						</Text>
						<input
							type='number'
							value={stopLoss}
							onChange={(e) => setStopLoss(e.target.value)}
							placeholder='Enter stop loss price'
							style={{
								padding: "0.5rem",
								backgroundColor: "#3a3a3a",
								color: "#fff",
								border: "1px solid #4a4a4a",
								borderRadius: "4px",
								fontSize: "0.9rem",
							}}
						/>
					</Box>

					{/* Take Profit Input */}
					<Box
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "0.5rem",
						}}
					>
						<Text style={{ color: "#aaa", fontSize: "0.9rem" }}>
							Take Profit (Optional)
						</Text>
						<input
							type='number'
							value={takeProfit}
							onChange={(e) => setTakeProfit(e.target.value)}
							placeholder='Enter take profit price'
							style={{
								padding: "0.5rem",
								backgroundColor: "#3a3a3a",
								color: "#fff",
								border: "1px solid #4a4a4a",
								borderRadius: "4px",
								fontSize: "0.9rem",
							}}
						/>
					</Box>

					{/* Buy/Sell Buttons */}
					<Box
						style={{
							display: "flex",
							gap: "0.5rem",
							marginTop: "0.5rem",
						}}
					>
						<button
							onClick={handleBuyOrder}
							style={{
								flex: 1,
								padding: "0.75rem",
								backgroundColor: "#4CAF50",
								color: "#fff",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
								fontSize: "1rem",
								fontWeight: "bold",
							}}
						>
							BUY
						</button>
						<button
							onClick={handleSellOrder}
							style={{
								flex: 1,
								padding: "0.75rem",
								backgroundColor: "#f44336",
								color: "#fff",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
								fontSize: "1rem",
								fontWeight: "bold",
							}}
						>
							SELL
						</button>
					</Box>

					{/* Reset Button */}
					<button
						onClick={handleResetBrokerData}
						style={{
							padding: "0.5rem",
							backgroundColor: "#ff9800",
							color: "#fff",
							border: "none",
							borderRadius: "4px",
							cursor: "pointer",
							fontSize: "0.9rem",
							marginTop: "0.5rem",
						}}
					>
						Reset All Orders & Positions
					</button>

					{/* Order History */}
					<Box
						style={{
							marginTop: "1rem",
							borderTop: "1px solid #3a3a3a",
							paddingTop: "1rem",
						}}
					>
						<Text
							style={{
								fontSize: "1rem",
								fontWeight: "bold",
								color: "#ffffff",
								marginBottom: "0.5rem",
							}}
						>
							Order History (Last 10)
						</Text>
						<Box
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "0.5rem",
								maxHeight: "300px",
								overflowY: "auto",
							}}
						>
							{orderHistory.map((order, index) => (
								<Box
									key={index}
									style={{
										padding: "0.5rem",
										backgroundColor: "#3a3a3a",
										borderRadius: "4px",
										fontSize: "0.8rem",
									}}
								>
									<Box
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: "0.25rem",
										}}
									>
										<Text
											style={{
												color:
													order.side === "buy"
														? "#4CAF50"
														: order.side === "sell"
														? "#f44336"
														: "#fff",
												fontWeight: "bold",
											}}
										>
											{order.side.toUpperCase()}
										</Text>
										<Text style={{ color: "#888" }}>
											{order.timestamp}
										</Text>
									</Box>
									<Text style={{ color: "#ccc" }}>
										{order.quantity} {order.symbol} @{" "}
										{order.orderType}
										{order.limitPrice &&
											` - Price: ${order.limitPrice}`}
										{order.stopLoss &&
											` - SL: ${order.stopLoss}`}
										{order.takeProfit &&
											` - TP: ${order.takeProfit}`}
									</Text>
									<Text
										style={{
											color:
												order.status === "Filled"
													? "#4CAF50"
													: order.status ===
													  "Cancelled"
													? "#f44336"
													: order.status ===
													  "Modified"
													? "#ff9800"
													: "#2196F3",
											fontSize: "0.75rem",
											marginTop: "0.25rem",
										}}
									>
										{order.status}
									</Text>
								</Box>
							))}
						</Box>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};
