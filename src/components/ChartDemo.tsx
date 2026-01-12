/**
 * ChartDemo Component
 *
 * A simplified React component that matches the UI structure and logic
 * from chart-sdk-codepen.html reference implementation.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createChartDatafeed } from "../utils/chart-datafeed";
import * as GoChartingSDK from "@gocharting/chart-sdk";
import type { ChartInstance, ChartConfig } from "@gocharting/chart-sdk";
import "./ChartDemo.css";

// Type for the datafeed returned by createChartDatafeed
type ChartDatafeed = ReturnType<typeof createChartDatafeed>;

// Symbol options for the demo
const SYMBOLS = {
	BTC: "BYBIT:FUTURE:BTCUSDT",
	ETH: "BYBIT:FUTURE:ETHUSDT",
	OGN: "BYBIT:FUTURE:OGNUSDT",
} as const;

// Excluded indicators list from codepen reference
const EXCLUDED_INDICATORS = [
	"ACC",
	"CHAIKINMFI",
	"CHAIKINVOLATILITY",
	"COPPOCK",
	"EOM",
	"FORCEINDEX",
	"KLINGER",
	"KST",
	"MFI",
	"ONBALANCEVOLUME",
	"ROC",
	"SMA",
	"TWIGGSMONEYFLOW",
	"VOLUMEUNDERLAY",
	"VWAP",
	"VWMA",
	"WMFI",
	"OI",
	"SANBAND",
	"TRADEVOLUMEINDEX",
	"VOLUMEOSCILLATOR",
	"VOLUMEROC",
];

export const ChartDemo = () => {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	// Store the wrapper returned by createChart (has destroy method)
	const chartWrapperRef = useRef<ChartInstance | null>(null);
	const datafeedRef = useRef<ChartDatafeed | null>(null);
	const [status, setStatus] = useState("Ready to load chart...");
	const [currentSymbol, setCurrentSymbol] = useState<string>(SYMBOLS.BTC);
	const [isChartReady, setIsChartReady] = useState(false);

	const updateStatus = useCallback((message: string) => {
		setStatus(message);
	}, []);

	const createChart = useCallback(async () => {
		if (!chartContainerRef.current) {
			updateStatus("Chart container not available");
			return;
		}

		// Prevent double initialization
		if (chartWrapperRef.current) {
			console.log("Chart already exists, skipping creation");
			return;
		}

		try {
			// Create datafeed instance
			datafeedRef.current = createChartDatafeed();

			// Add ID to container
			chartContainerRef.current.id = "chart-container";

			const chartConfig: ChartConfig = {
				symbol: currentSymbol,
				interval: "1D",
				datafeed:
					datafeedRef.current as unknown as ChartConfig["datafeed"],
				debugLog: true,
				licenseKey: "demo-550e8400-e29b-41d4-a716-446655440000",
				// Note: exclude.indicators accepts string[] at runtime but types say boolean
				// This is a known type mismatch in the SDK
				exclude: {
					indicators: EXCLUDED_INDICATORS,
				} as unknown as ChartConfig["exclude"],
				theme: "dark",
				appCallback: (eventType, message) => {
					if (eventType === "CHART_SELECTED") {
						console.log("📊 CHART_SELECTED event:", message);
					}
				},
				onReady: () => {
					// Chart is now ready - the wrapper ref is already set
					setIsChartReady(true);
					updateStatus("Chart loaded with simplified API!");
				},
				onError: (error) => {
					const errorMessage =
						typeof error === "string" ? error : error.message;
					updateStatus(`❌ Error creating chart: ${errorMessage}`);
				},
			};

			// Store the wrapper object which has destroy(), setSymbol(), etc.
			const chartWrapper = GoChartingSDK.createChart(
				"#chart-container",
				chartConfig
			);
			chartWrapperRef.current = chartWrapper;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			updateStatus(`❌ Error creating chart: ${errorMessage}`);
		}
	}, [currentSymbol, updateStatus]);

	const changeSymbol = useCallback(
		async (newSymbol: string) => {
			if (!chartWrapperRef.current) {
				updateStatus("❌ Chart not ready");
				return;
			}

			if (currentSymbol === newSymbol) {
				updateStatus(`ℹ️ Already showing ${newSymbol}`);
				return;
			}

			try {
				updateStatus(`🔄 Switching to ${newSymbol}...`);
				chartWrapperRef.current.setSymbol(newSymbol);
				setCurrentSymbol(newSymbol);
				updateStatus(`✅ Switched to ${newSymbol}`);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				updateStatus(`❌ Error changing symbol: ${errorMessage}`);
			}
		},
		[currentSymbol, updateStatus]
	);

	// Initialize chart on mount
	useEffect(() => {
		let isMounted = true;
		let chartCreated = false;

		const initChart = async () => {
			// Small delay to ensure DOM is ready
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Only create chart if still mounted (prevents StrictMode double-mount issues)
			if (isMounted && chartContainerRef.current) {
				await createChart();
				chartCreated = true;
			}
		};

		initChart();

		return () => {
			isMounted = false;

			// Only cleanup if we actually created a chart
			if (chartCreated && chartWrapperRef.current) {
				// Cleanup chart wrapper (has destroy method)
				try {
					// Check if not already destroyed
					if (!chartWrapperRef.current.isDestroyed()) {
						chartWrapperRef.current.destroy();
					}
				} catch (e) {
					// Ignore removeChild errors from React StrictMode double-unmount
					if (
						!(e instanceof Error) ||
						!e.message.includes("removeChild")
					) {
						console.error("Error destroying chart:", e);
					}
				}
				chartWrapperRef.current = null;

				// Cleanup datafeed
				if (datafeedRef.current) {
					try {
						datafeedRef.current.destroy();
					} catch (e) {
						console.error("Error destroying datafeed:", e);
					}
					datafeedRef.current = null;
				}
			}

			setIsChartReady(false);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className='chart-demo-container'>
			<div className='chart-demo-header'>
				<h1>📈 GoCharting SDK Demo</h1>
				<p>Professional Financial Charts with Built-in AutoFit ✨</p>
			</div>

			<div className='chart-demo-controls'>
				<button
					className={`btn primary ${
						currentSymbol === SYMBOLS.BTC ? "active" : ""
					}`}
					onClick={() => changeSymbol(SYMBOLS.BTC)}
					disabled={!isChartReady}
				>
					₿ BTC/USDT
				</button>
				<button
					className={`btn primary ${
						currentSymbol === SYMBOLS.ETH ? "active" : ""
					}`}
					onClick={() => changeSymbol(SYMBOLS.ETH)}
					disabled={!isChartReady}
				>
					Ξ ETH/USDT
				</button>
				<button
					className={`btn primary ${
						currentSymbol === SYMBOLS.OGN ? "active" : ""
					}`}
					onClick={() => changeSymbol(SYMBOLS.OGN)}
					disabled={!isChartReady}
				>
					🌐 OGN/USDT
				</button>
			</div>

			<div className='chart-demo-wrapper'>
				<div ref={chartContainerRef} className='chart-demo-chart'>
					{!isChartReady && (
						<div className='chart-demo-loading'>
							Loading chart...
						</div>
					)}
				</div>
			</div>

			<div className='chart-demo-status'>{status}</div>
		</div>
	);
};

export default ChartDemo;
