/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Creates a demo datafeed for the GoCharting SDK
 * This datafeed supports both real Bybit data and generated demo data
 *
 * @returns Datafeed object compatible with GoCharting SDK with additional destroy() method
 *
 * @example
 * ```typescript
 * const datafeed = createChartDatafeed();
 *
 * const chart = createChart('#chart', {
 *   symbol: 'BYBIT:FUTURE:BTCUSDT',
 *   interval: '1D',
 *   datafeed: datafeed,
 *   licenseKey: 'your-key'
 * });
 *
 * // Cleanup when done
 * datafeed.destroy();
 * ```
 */
export const createChartDatafeed = () => {
	const datafeed = {
		symbolCache: new Map<string, any>(),
		searchSymbolController: null as AbortController | null,
		streamingIntervals: {} as Record<string, any>,
		channelToSubscription: null as Map<string, any> | null,
		demoSocket: null as WebSocket | any | null,

		// Cleanup method to prevent memory leaks
		destroy() {
			// Clear all streaming intervals
			Object.values(this.streamingIntervals).forEach((interval) => {
				clearInterval(interval);
			});
			this.streamingIntervals = {};
			// Abort any pending search requests
			if (this.searchSymbolController) {
				this.searchSymbolController.abort();
			}
			// Clear symbol cache
			this.symbolCache.clear();
		},

		async getBars(symbolInfo: any, resolution: any, periodParams: any) {
			const { from, to } = periodParams;
			console.log("🔍 [DemoDatafeed] getBars called with:", {
				symbolInfo,
				resolution,
				periodParams,
				exchange: symbolInfo.exchange,
				symbol: symbolInfo.symbol,
				isBybit: symbolInfo.exchange === "BYBIT",
			});
			try {
				let rawBars = [];
				// Try to use real Bybit API for BYBIT symbols, fallback to demo data
				if (symbolInfo.exchange === "BYBIT") {
					console.log(
						"🚀 [DemoDatafeed] Using real Bybit API for:",
						symbolInfo.symbol
					);
					rawBars = await this.getBybitBars(
						symbolInfo,
						resolution,
						periodParams
					);
				} else {
					console.log(
						"🎯 [DemoDatafeed] Using demo data for non-BYBIT symbol:",
						{
							exchange: symbolInfo.exchange,
							symbol: symbolInfo.symbol,
						}
					);
					// Generate demo data for other symbols or as fallback
					rawBars = this.generateDemoData(
						from,
						to,
						resolution,
						symbolInfo
					);
				}
				// Convert to UDF format
				const udfData = this.convertToUDFFormat(rawBars);
				return udfData;
			} catch (error) {
				console.error("❌ [DemoDatafeed] getBars failed:", error);
				// Fallback to demo data on error
				const rawBars = this.generateDemoData(
					from,
					to,
					resolution,
					symbolInfo
				);
				const udfData = this.convertToUDFFormat(rawBars);
				return udfData;
			}
		},

		// Convert raw bars to UDF format
		convertToUDFFormat(rawBars: any[]) {
			if (!rawBars || rawBars.length === 0) {
				return {
					s: "no_data" as const,
					nextTime: null,
				};
			}
			const t: number[] = []; // time
			const o: number[] = []; // open
			const h: number[] = []; // high
			const l: number[] = []; // low
			const c: number[] = []; // close
			const v: number[] = []; // volume
			rawBars.forEach((bar) => {
				// Handle different time formats
				let timestamp;
				if (bar.time) {
					timestamp =
						typeof bar.time === "number"
							? bar.time
							: Math.floor(new Date(bar.time).getTime() / 1000);
				} else if (bar.date) {
					timestamp = Math.floor(new Date(bar.date).getTime() / 1000);
				} else {
					console.warn("Bar missing time/date:", bar);
					return;
				}
				t.push(timestamp);
				o.push(Number(bar.open));
				h.push(Number(bar.high));
				l.push(Number(bar.low));
				c.push(Number(bar.close));
				v.push(Number(bar.volume || 0));
			});
			return {
				s: "ok" as const,
				t,
				o,
				h,
				l,
				c,
				v,
			};
		},

		async resolveSymbol(
			symbolName: string,
			onResolve: (symbolInfo: any) => void,
			onError: (error: string) => void
		) {
			try {
				// Check cache first
				if (this.symbolCache.has(symbolName)) {
					const cachedSymbolInfo = this.symbolCache.get(symbolName);
					onResolve(cachedSymbolInfo);
					return;
				}
				// Try to use real GoCharting API for symbol resolution
				try {
					const symbolInfo = await this.resolveSymbolFromAPI(
						symbolName
					);
					this.symbolCache.set(symbolName, symbolInfo);
					onResolve(symbolInfo);
					return;
				} catch (apiError) {
					console.log(
						"❌ [DemoDatafeed] GoCharting API failed, using fallback:",
						apiError
					);
				}
				// Fallback to local symbol resolution
				const symbolInfo = this.resolveSymbolLocally(symbolName);
				this.symbolCache.set(symbolName, symbolInfo);
				onResolve(symbolInfo);
			} catch (error) {
				console.error(
					"❌ [DemoDatafeed] Error resolving symbol:",
					error
				);
				onError("Failed to resolve symbol");
			}
		},

		async resolveSymbolFromAPI(symbolName: string) {
			const url = "https://gocharting.com/sdk/instruments/exactSearch";
			const params = {
				q: symbolName,
			};
			const urlWithParams = new URL(url);
			Object.keys(params).forEach((key) =>
				urlWithParams.searchParams.append(
					key,
					params[key as keyof typeof params]
				)
			);
			const res = await fetch(urlWithParams);
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			}
			const data = await res.json();
			if (data.status === 200 && data.payload?.results?.length > 0) {
				const result = data.payload.results[0];
				return {
					symbol: result.symbol,
					full_name: `${result.exchange}:${result.segment}:${result.symbol}`,
					description: result.name,
					exchange: result.exchange,
					type: result.asset_type.toLowerCase(),
					session: "24x7",
					session_label: "24x7",
					timezone: result.exchange_info?.zone || "UTC",
					ticker: result.symbol,
					minmov: 1,
					pricescale: Math.pow(10, result.max_tick_precision || 2),
					has_intraday: true,
					intraday_multipliers: [
						"1",
						"5",
						"15",
						"30",
						"60",
						"240",
						"1D",
					],
					supported_resolutions: result.exchange_info
						?.valid_intervals || [
						"1",
						"5",
						"15",
						"30",
						"60",
						"240",
						"1D",
						"1W",
						"1M",
					],
					volume_precision: result.max_volume_precision || 8,
					data_status: result.data_status || "streaming",
					contract_size: result.contract_size,
					tick_size: result.tick_size,
					quote_currency: result.quote_currency,
					future_type: result.future_type,
					tradeable: result.tradeable,
					delay_seconds: result.delay_seconds,
					symbol_logo_urls: result.symbol_logo_urls,
					segment: result.segment,
					asset_type: result.asset_type,
					exchange_info: {
						name:
							result.exchange_info?.name ||
							result.exchange.toLowerCase(),
						code: result.exchange_info?.code || result.exchange,
						country_cd: result.exchange_info?.country_cd || "US",
						zone: result.exchange_info?.zone || "UTC",
						has_unique_trade_id:
							result.exchange_info?.has_unique_trade_id || true,
						holidays: result.exchange_info?.holidays || null,
						hours: result.exchange_info?.hours || [
							{ open: true },
							{ open: true },
							{ open: true },
							{ open: true },
							{ open: true },
							{ open: true },
							{ open: true },
						],
						contains_ambiguous_symbols:
							result.exchange_info?.contains_ambiguous_symbols ||
							false,
						valid_intervals: result.exchange_info
							?.valid_intervals || [
							"1m",
							"3m",
							"5m",
							"10m",
							"15m",
							"30m",
							"1h",
							"2h",
							"4h",
							"12h",
							"1D",
							"1W",
							"1M",
						],
					},
				};
			}
			throw new Error(`No symbol found for: ${symbolName}`);
		},

		resolveSymbolLocally(symbolName: string) {
			// 🔍 Test case: Handle invalid symbol to trigger error
			if (symbolName === "INVALID:SYMBOL") {
				throw new Error(
					`Symbol not found: ${symbolName}. This symbol does not exist in our database.`
				);
			}
			// Check if this is a mock symbol (AAPL or TSLA)
			if (symbolName === "NASDAQ:AAPL" || symbolName === "NASDAQ:TSLA") {
				return this.createMockSymbolInfo(symbolName);
			}
			// Handle different symbol formats for other symbols
			const parts = symbolName.split(":");
			let exchange, ticker, instrumentType;
			if (parts.length === 3) {
				// Format: BYBIT:FUTURE:BTCUSDT
				[exchange, instrumentType, ticker] = parts;
			} else {
				// Format: NASDAQ:AAPL
				[exchange, ticker] = parts;
				instrumentType = null;
			}
			// Get proper timezone and session based on exchange
			const exchangeInfo = this.getExchangeInfo(exchange);
			return {
				name: symbolName,
				full_name: symbolName,
				description: this.getSymbolDescription(ticker, instrumentType),
				type: this.getSymbolType(exchange),
				session: exchangeInfo.session,
				session_label: exchangeInfo.session,
				timezone: exchangeInfo.timezone,
				ticker: ticker,
				exchange: exchange,
				minmov: 1,
				pricescale: this.getPriceScale(exchange, ticker),
				has_intraday: true,
				has_daily: true,
				has_weekly_and_monthly: true,
				supported_resolutions: [
					"1",
					"5",
					"15",
					"30",
					"60",
					"240",
					"1D",
					"1W",
					"1M",
				],
				volume_precision: this.getVolumePrecision(exchange),
				data_status: "streaming",
				listed_exchange: exchange,
				format: "price",
				currency_code: this.getCurrencyCode(exchange, ticker),
				instrument_type: instrumentType || "spot",
				exchange_info: {
					name: exchange.toLowerCase(),
					code: exchange,
					country_cd: exchangeInfo.country_cd || "US",
					zone: exchangeInfo.timezone,
					has_unique_trade_id: true,
					holidays: null,
					hours:
						exchangeInfo.session === "24x7"
							? [
									{ open: true },
									{ open: true },
									{ open: true },
									{ open: true },
									{ open: true },
									{ open: true },
									{ open: true },
							  ]
							: [
									{ open: false },
									{ open: true },
									{ open: true },
									{ open: true },
									{ open: true },
									{ open: true },
									{ open: false },
							  ],
					contains_ambiguous_symbols: false,
					valid_intervals: [
						"1",
						"5",
						"15",
						"30",
						"60",
						"240",
						"1D",
						"1W",
						"1M",
					],
				},
			};
		},

		getExchangeInfo(exchange: string) {
			const exchangeData: Record<
				string,
				{ timezone: string; session: string; country_cd?: string }
			> = {
				NASDAQ: {
					timezone: "America/New_York",
					session: "0930-1600",
					country_cd: "US",
				},
				NYSE: {
					timezone: "America/New_York",
					session: "0930-1600",
					country_cd: "US",
				},
				BYBIT: {
					timezone: "Etc/UTC",
					session: "24x7",
				},
				BINANCE: {
					timezone: "Etc/UTC",
					session: "24x7",
				},
				FOREX: {
					timezone: "Etc/UTC",
					session: "24x5",
				},
			};
			return (
				exchangeData[exchange] || {
					timezone: "Etc/UTC",
					session: "24x7",
				}
			);
		},

		getSymbolDescription(ticker: string, instrumentType: string | null) {
			const descriptions: Record<string, string> = {
				AAPL: "Apple Inc.",
				MSFT: "Microsoft Corporation",
				GOOGL: "Alphabet Inc.",
				TSLA: "Tesla Inc.",
				BTCUSDT: "Bitcoin / Tether",
				ETHUSDT: "Ethereum / Tether",
			};
			const baseDescription = descriptions[ticker] || ticker;
			if (instrumentType === "FUTURE") {
				return `${baseDescription} Future`;
			}
			return baseDescription;
		},

		getSymbolType(exchange: string) {
			const types: Record<string, string> = {
				NASDAQ: "stock",
				NYSE: "stock",
				BYBIT: "crypto",
				BINANCE: "crypto",
				FOREX: "forex",
			};
			return types[exchange] || "crypto";
		},

		getPriceScale(exchange: string, ticker: string) {
			// Crypto typically has more decimal places
			if (exchange === "BYBIT" || exchange === "BINANCE") {
				if (ticker.includes("USDT") || ticker.includes("USD")) {
					return 100; // 2 decimal places for USDT pairs
				}
				return 100000000; // 8 decimal places for BTC pairs
			}
			return 100; // 2 decimal places for stocks
		},

		getVolumePrecision(exchange: string) {
			if (exchange === "BYBIT" || exchange === "BINANCE") {
				return 8; // Crypto volume precision
			}
			return 0; // Stock volume precision
		},

		getCurrencyCode(exchange: string, ticker: string) {
			if (exchange === "BYBIT" || exchange === "BINANCE") {
				if (ticker.includes("USDT")) return "USDT";
				if (ticker.includes("USD")) return "USD";
				if (ticker.includes("BTC")) return "BTC";
			}
			return "USD";
		},

		async getBybitBars(
			symbolInfo: any,
			resolution: any,
			periodParams: any
		) {
			const { from, to, firstDataRequest, rows } = periodParams;
			// Use the same logic as real datafeed.js
			// Handle both string and object resolution formats
			let scale, units, interval;
			if (typeof resolution === "string") {
				// Convert string resolution to object format
				const resolutionObj =
					this.convertIntervalToResolution(resolution);
				scale = resolutionObj.scale;
				units = resolutionObj.units;
				interval = resolutionObj.label;
			} else if (resolution && typeof resolution === "object") {
				scale = resolution.units;
				units = resolution.scale;
				// Derive label from scale and units
				interval = this.deriveIntervalLabel(scale, units);
			} else {
				console.error("❌ Invalid resolution format:", resolution);
				throw new Error("Invalid resolution format");
			}
			console.log("📈 [DemoDatafeed] getBybitBars:", {
				symbolInfo,
				resolution,
				periodParams,
				scale,
				units,
				interval,
			});

			// Extract the correct symbol for Bybit API
			const bybitSymbol =
				symbolInfo.symbol || symbolInfo.ticker || symbolInfo.name;
			let url;
			if (firstDataRequest) {
				// Use current time to get recent data up to today
				const currentTime = Date.now();
				url = `https://api.bybit.com/v5/market/kline?symbol=${bybitSymbol}&interval=${interval}&end=${currentTime}&limit=${
					rows || 200
				}`;
			} else {
				const startDate = from.getTime();
				const endDate = to.getTime();
				url = `https://api.bybit.com/v5/market/kline?symbol=${bybitSymbol}&interval=${interval}&start=${startDate}&end=${endDate}&limit=${
					rows || 200
				}`;
			}
			const response = await fetch(url);
			const data = await response.json();
			if (data.result?.list) {
				const bars = [];
				const list = data.result.list;
				for (let k = 0; k < list.length; k++) {
					const [timestamp, open, high, low, close, volume] = list[k];
					const bar = {
						time: Math.floor(Number(timestamp) / 1000), // Convert to seconds
						open: Number(open),
						high: Number(high),
						low: Number(low),
						close: Number(close),
						volume: Number(volume),
					};
					bars.push(bar);
				}
				// Bybit returns newest first, we need oldest first
				const reversedBars = bars.reverse();
				return reversedBars;
			}
			throw new Error("No data from Bybit API");
		},

		convertIntervalToResolution(intervalString: string) {
			const intervalMap: Record<
				string,
				{ scale: number; units: string; label: string }
			> = {
				"1m": { scale: 1, units: "minutes", label: "1" },
				"5m": { scale: 5, units: "minutes", label: "5" },
				"15m": { scale: 15, units: "minutes", label: "15" },
				"30m": { scale: 30, units: "minutes", label: "30" },
				"1h": { scale: 1, units: "hours", label: "60" },
				"4h": { scale: 4, units: "hours", label: "240" },
				"1D": { scale: 1, units: "days", label: "D" },
				"1W": { scale: 1, units: "weeks", label: "W" },
				"1M": { scale: 1, units: "months", label: "M" },
			};
			const resolution = intervalMap[intervalString];
			if (!resolution) {
				console.warn(
					`Unknown interval: ${intervalString}, defaulting to 1D`
				);
				return {
					scale: 1,
					units: "days",
					label: "D",
				};
			}
			return resolution;
		},

		deriveIntervalLabel(scale: number, units: string) {
			switch (units) {
				case "minutes":
					return scale.toString();
				case "hours":
					return (scale * 60).toString();
				case "days":
					return scale === 1 ? "D" : `${scale}D`;
				case "weeks":
					return scale === 1 ? "W" : `${scale * 7}W`;
				case "months":
					return scale === 1 ? "M" : `${scale * 30}M`;
				default:
					console.warn(`Unknown units: ${units}, defaulting to D`);
					return "D";
			}
		},

		generateDemoData(
			from: Date,
			to: Date,
			resolution: any,
			_symbolInfo: any
		) {
			const bars = [];
			const startTime = from.getTime() / 1000;
			const endTime = to.getTime() / 1000;
			let interval = 86400; // 1 day in seconds

			if (typeof resolution === "string") {
				const resolutionNum = parseInt(resolution);
				if (!isNaN(resolutionNum)) {
					interval = resolutionNum * 60; // minutes to seconds
				}
			}

			let basePrice = 50000; // Starting price
			let currentTime = startTime;

			while (currentTime < endTime) {
				const randomChange = (Math.random() - 0.5) * 1000;
				const open = basePrice;
				const close = basePrice + randomChange;
				const high = Math.max(open, close) + Math.random() * 500;
				const low = Math.min(open, close) - Math.random() * 500;
				const volume = Math.random() * 1000000;

				bars.push({
					time: currentTime,
					open,
					high,
					low,
					close,
					volume,
				});

				basePrice = close;
				currentTime += interval;
			}

			return bars;
		},

		// Create mock symbol info for AAPL and TSLA based on the provided format
		createMockSymbolInfo(symbolName: string) {
			const symbolData: Record<
				string,
				{
					symbol: string;
					name: string;
					description: string;
					industry: string;
					logo_url: string;
				}
			> = {
				"NASDAQ:AAPL": {
					symbol: "AAPL",
					name: "APPLE INC",
					description: "Apple Inc. - Common Stock",
					industry: "technology",
					logo_url:
						"https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
				},
				"NASDAQ:TSLA": {
					symbol: "TSLA",
					name: "TESLA INC",
					description: "Tesla Inc. - Common Stock",
					industry: "automotive",
					logo_url:
						"https://upload.wikimedia.org/wikipedia/commons/b/bb/Tesla_T_symbol.svg",
				},
			};

			const data = symbolData[symbolName];
			if (!data) {
				throw new Error(
					`Mock symbol data not found for: ${symbolName}`
				);
			}

			// Return mock symbol info in the same format as the provided example
			return {
				exchange: "NASDAQ",
				segment: "SPOT",
				symbol: data.symbol,
				name: data.name,
				full_name: symbolName,
				description: data.description,
				type: "stock",
				asset_type: "EQUITY",
				source_id: data.symbol,
				tradeable: true,
				is_index: false,
				is_formula: false,
				delay_seconds: 0,
				data_status: "streaming",
				industry: data.industry,
				symbol_logo_urls: [data.logo_url],
				contract_size: 1,
				tick_size: 1,
				display_tick_size: 1,
				volume_size_increment: 1,
				max_tick_precision: 2,
				max_volume_precision: 0,
				quote_currency: "USD",
				data_source_location: "us-east-1",
				supports: {
					footprint: true,
				},
				exchange_info: {
					name: "nasdaq",
					code: "NASDAQ",
					country_cd: "US",
					zone: "America/New_York",
					has_unique_trade_id: true,
					logo_url:
						"https://upload.wikimedia.org/wikipedia/commons/4/48/Nasdaq_Logo.svg",
					holidays: null,
					hours: [
						{ open: false }, // Sunday
						{ open: true }, // Monday
						{ open: true }, // Tuesday
						{ open: true }, // Wednesday
						{ open: true }, // Thursday
						{ open: true }, // Friday
						{ open: false }, // Saturday
					],
					contains_ambiguous_symbols: false,
					valid_intervals: [
						"1",
						"5",
						"15",
						"30",
						"60",
						"240",
						"1D",
						"1W",
						"1M",
					],
				},
				session: "0930-1600",
				session_label: "0930-1600",
				timezone: "America/New_York",
				ticker: data.symbol,
				minmov: 1,
				pricescale: 100,
				has_intraday: true,
				has_daily: true,
				has_weekly_and_monthly: true,
				supported_resolutions: [
					"1",
					"5",
					"15",
					"30",
					"60",
					"240",
					"1D",
					"1W",
					"1M",
				],
				intraday_multipliers: ["1", "5", "15", "30", "60", "240", "1D"],
				volume_precision: 0,
				listed_exchange: "NASDAQ",
				format: "price",
				currency_code: "USD",
				instrument_type: "spot",
			};
		},

		onReady(callback: (config: any) => void) {
			setTimeout(
				() =>
					callback({
						supported_resolutions: [
							"1",
							"5",
							"15",
							"30",
							"60",
							"240",
							"1D",
							"1W",
							"1M",
						],
						supports_marks: false,
						supports_timescale_marks: false,
						supports_time: true,
					}),
				0
			);
		},

		searchSymbols(userInput: string, callback: (symbols: any[]) => void) {
			console.log("🔍 [DemoDatafeed] searchSymbols called:", {
				userInput,
				hasCallback: typeof callback === "function",
			});

			// Try to use real GoCharting API first
			this.searchSymbolsFromAPI(userInput, callback).catch((error) => {
				console.log(
					"🔍 [DemoDatafeed] GoCharting search API failed, using mock data:",
					error
				);
				// Fallback to mock data
				this.searchSymbolsMock(userInput, callback);
			});
		},

		searchSymbolsMock(
			userInput: string,
			callback: (symbols: any[]) => void
		) {
			// Mock API response with symbols from your dropdown
			const symbols = [
				{
					symbol: "BTCUSDT",
					full_name: "BYBIT:FUTURE:BTCUSDT",
					description: "Bitcoin Future (BTCUSDT)",
					exchange: "BYBIT",
					ticker: "BTCUSDT",
					type: "crypto",
					key: "BYBIT:FUTURE:BTCUSDT", // Added key property for compare functionality
				},
				{
					symbol: "ETHUSDT",
					full_name: "BYBIT:FUTURE:ETHUSDT",
					description: "Ethereum Future (ETHUSDT)",
					exchange: "BYBIT",
					ticker: "ETHUSDT",
					type: "crypto",
					key: "BYBIT:FUTURE:ETHUSDT", // Added key property for compare functionality
				},
				{
					symbol: "AAPL",
					full_name: "NASDAQ:AAPL",
					description: "Apple (AAPL)",
					exchange: "NASDAQ",
					ticker: "AAPL",
					type: "stock",
					key: "NASDAQ:AAPL", // Added key property for compare functionality
				},
				{
					symbol: "TSLA",
					full_name: "NASDAQ:TSLA",
					description: "Tesla (TSLA)",
					exchange: "NASDAQ",
					ticker: "TSLA",
					type: "stock",
					key: "NASDAQ:TSLA", // Added key property for compare functionality
				},
				{
					symbol: "BTC",
					full_name: "BINANCE:BTC",
					description: "Bitcoin Spot (BTC)",
					exchange: "BINANCE",
					ticker: "BTC",
					type: "crypto",
					key: "BINANCE:BTC", // Added key property for compare functionality
				},
				{
					symbol: "INVALID_TEST",
					full_name: "TEST:INVALID_TEST",
					description: "Invalid Symbol (Test Error)",
					exchange: "TEST",
					ticker: "INVALID_TEST",
					type: "test",
					key: "TEST:INVALID_TEST", // Added key property for compare functionality
				},
			];

			// Filter symbols based on user input
			const filteredSymbols = symbols.filter(
				(s) =>
					s.symbol.toLowerCase().includes(userInput.toLowerCase()) ||
					s.description
						.toLowerCase()
						.includes(userInput.toLowerCase())
			);

			console.log("🔍 [DemoDatafeed] Mock search results:", {
				userInput,
				totalSymbols: symbols.length,
				filteredCount: filteredSymbols.length,
				results: filteredSymbols.map(
					(s) => `${s.symbol} - ${s.description}`
				),
			});

			// Return filtered results in correct SDK format
			if (typeof callback === "function") {
				// The SDK expects an array of SearchResult objects
				callback(filteredSymbols);
			} else {
				console.error(
					"🔍 [DemoDatafeed] No valid callback provided to searchSymbols"
				);
			}
		},

		async searchSymbolsFromAPI(
			userInput: string,
			callback: ((result: any) => void) | undefined
		) {
			const url = "https://gocharting.com/sdk/instruments/search";
			const params = {
				q: userInput,
			};

			if (this.searchSymbolController) {
				this.searchSymbolController.abort();
			}

			this.searchSymbolController = new AbortController();

			const urlWithParams = new URL(url);
			Object.keys(params).forEach((key) =>
				urlWithParams.searchParams.append(
					key,
					params[key as keyof typeof params]
				)
			);

			const res = await fetch(urlWithParams, {
				signal: this.searchSymbolController.signal,
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			}

			const data = await res.json();

			if (data.status === 200 && data.payload?.results) {
				const transformedResults: any[] = [];

				data.payload.results.forEach((result: any) => {
					const item = result.item;

					if (item.is_group && item.members) {
						item.members.forEach((member: any) => {
							const memberItem = member.item;
							transformedResults.push({
								symbol: memberItem.symbol,
								full_name: memberItem.key,
								description: memberItem.name,
								exchange: memberItem.exchange,
								type: memberItem.asset_type.toLowerCase(),
							});
						});
					} else {
						transformedResults.push({
							symbol: item.symbol,
							full_name: item.key,
							description: item.name,
							exchange: item.exchange,
							type: item.asset_type.toLowerCase(),
						});
					}
				});

				if (callback) {
					// The SDK expects an object with searchInProgress and items properties
					callback({
						searchInProgress: false,
						items: transformedResults,
					});
				}
			} else {
				if (callback) {
					// The SDK expects an object with searchInProgress and items properties
					callback({
						searchInProgress: false,
						items: [],
					});
				}
			}
		},

		subscribeBars(
			symbolInfo: any,
			resolution: any,
			onRealtimeCallback: (bar: any) => void,
			subscriberUID: string,
			_onResetCacheNeededCallback?: () => void
		) {
			console.log("📊 [DemoDatafeed] subscribeBars:", subscriberUID);
			// For demo purposes, we'll simulate real-time updates
			// In production, this would connect to real WebSocket streams
			this.startDemoStreaming(
				symbolInfo,
				resolution,
				onRealtimeCallback,
				subscriberUID
			);
		},

		unsubscribeBars(subscriberUID: string) {
			console.log("📊 [DemoDatafeed] unsubscribeBars:", subscriberUID);
			// Stop the demo streaming for this subscriber
			if (
				this.streamingIntervals &&
				this.streamingIntervals[subscriberUID]
			) {
				clearInterval(this.streamingIntervals[subscriberUID]);
				delete this.streamingIntervals[subscriberUID];
			}
		},

		// Optional datafeed interface methods for real-time data
		subscribeTicks(
			symbolInfo: any,
			resolution: any,
			onRealtimeCallback: (bar: any) => void,
			subscriberUID: string,
			onResetCacheNeededCallback?: () => void
		) {
			// Use the same pattern as the real datafeed.js
			this.subscribeOnStream(
				symbolInfo,
				resolution,
				onRealtimeCallback,
				subscriberUID,
				onResetCacheNeededCallback,
				null // lastDailyBar - not used in demo
			);
		},

		unsubscribeTicks(subscriberUID: string) {
			// Use the same pattern as the real datafeed.js
			this.unsubscribeFromStream(subscriberUID);
		},

		// Start demo streaming for non-real-time symbols
		startDemoStreaming(
			_symbolInfo: any,
			_resolution: any,
			onRealtimeCallback: (bar: any) => void,
			subscriberUID: string
		) {
			// Initialize streaming intervals map if not exists
			if (!this.streamingIntervals) {
				this.streamingIntervals = {};
			}

			// Clear any existing interval for this subscriber
			if (this.streamingIntervals[subscriberUID]) {
				clearInterval(this.streamingIntervals[subscriberUID]);
			}

			// For demo purposes, simulate price updates every 2 seconds
			let lastPrice = 50000 + Math.random() * 10000; // Start with a random price around 50k-60k

			this.streamingIntervals[subscriberUID] = setInterval(() => {
				// Simulate realistic price movement
				const change = (Math.random() - 0.5) * 100; // +/- $50 change
				lastPrice = Math.max(1000, lastPrice + change); // Ensure price doesn't go below $1000

				const now = Date.now();
				const tick = {
					time: Math.floor(now / 1000), // Unix timestamp in seconds
					price: Math.round(lastPrice * 100) / 100, // Round to 2 decimal places
					volume: Math.floor(Math.random() * 1000) + 100, // Random volume
				};

				onRealtimeCallback(tick);
			}, 2000); // Update every 2 seconds
		},

		// Enhanced streaming implementation mirroring streaming.js capabilities
		subscribeOnStream(
			symbolInfo: any,
			resolution: any,
			onRealtimeCallback: (bar: any) => void,
			subscriberUID: string,
			onResetCacheNeededCallback?: (() => void) | null,
			lastDailyBar?: any
		) {
			// Initialize streaming infrastructure like streaming.js
			if (!this.channelToSubscription) {
				this.channelToSubscription = new Map();
			}

			if (!this.demoSocket) {
				this.initializeDemoSocket(symbolInfo);
			}

			// Create channel string similar to streaming.js format
			let channelString: string;
			if (symbolInfo.exchange === "BYBIT") {
				// Use real Bybit channel format
				const symbol =
					symbolInfo.symbol || symbolInfo.ticker || symbolInfo.name;
				channelString = `publicTrade.${symbol}`;
			} else {
				// Use demo format for other exchanges
				channelString = `demoTrade.${
					symbolInfo.symbol || symbolInfo.ticker || symbolInfo.name
				}`;
			}

			const handler = {
				id: subscriberUID,
				callback: onRealtimeCallback,
				resolution: resolution,
				lastDailyBar: lastDailyBar,
				onResetCacheNeededCallback: onResetCacheNeededCallback,
			};

			let subscriptionItem =
				this.channelToSubscription.get(channelString);

			if (subscriptionItem) {
				// Already subscribed to the channel, use the existing subscription
				subscriptionItem.handlers.push(handler);
				return;
			}

			// Create new subscription item like streaming.js
			subscriptionItem = {
				subscriberUID,
				resolution,
				lastDailyBar,
				handlers: [handler],
				symbolInfo: symbolInfo,
				channelString: channelString,
			};

			this.channelToSubscription.set(channelString, subscriptionItem);

			// Send subscription request (real Bybit format for BYBIT, demo for others)
			let subRequest: any;
			if (symbolInfo.exchange === "BYBIT") {
				// Real Bybit subscription format
				subRequest = {
					op: "subscribe",
					args: [channelString],
				};
			} else {
				// Demo subscription format
				subRequest = {
					op: "subscribe",
					args: [channelString],
					symbol:
						symbolInfo.symbol ||
						symbolInfo.ticker ||
						symbolInfo.name,
				};
			}

			this.sendDemoSubscription(subRequest, subscriptionItem);
		},

		unsubscribeFromStream(subscriberUID: string) {
			if (!this.channelToSubscription) {
				return;
			}

			// Find a subscription with id === subscriberUID (mirroring streaming.js logic)
			for (const channelString of this.channelToSubscription.keys()) {
				const subscriptionItem =
					this.channelToSubscription.get(channelString);
				if (!subscriptionItem) continue;

				const handlerIndex = subscriptionItem.handlers.findIndex(
					(handler: any) => handler.id === subscriberUID
				);

				if (handlerIndex !== -1) {
					// Remove from handlers
					subscriptionItem.handlers.splice(handlerIndex, 1);

					if (subscriptionItem.handlers.length === 0) {
						// Unsubscribe from the channel if it was the last handler
						const unsubRequest = {
							op: "unsubscribe",
							args: [channelString],
						};

						this.sendDemoUnsubscription(
							unsubRequest,
							channelString
						);
						this.channelToSubscription.delete(channelString);

						// Stop streaming intervals for this channel
						if (
							this.streamingIntervals &&
							this.streamingIntervals[channelString]
						) {
							clearInterval(
								this.streamingIntervals[channelString]
							);
							delete this.streamingIntervals[channelString];
						}
					}
					break;
				}
			}
		},

		// Initialize socket (mirroring streaming.js socket initialization)
		initializeDemoSocket(symbolInfo: any) {
			if (
				this.demoSocket &&
				this.demoSocket.readyState === WebSocket.OPEN
			) {
				return this.demoSocket;
			}

			// Create real Bybit WebSocket for BYBIT symbols, mock for others
			if (symbolInfo.exchange === "BYBIT") {
				const uri = this.getBybitWebSocketUrl(symbolInfo);
				this.demoSocket = new WebSocket(uri);

				this.demoSocket.addEventListener("open", () => {
					console.log(
						"🔌 [DemoDatafeed] Connected to Bybit WebSocket"
					);
				});

				this.demoSocket.addEventListener("close", (reason: any) => {
					console.log(
						"🔌 [DemoDatafeed] Bybit WebSocket disconnected:",
						reason
					);
				});

				this.demoSocket.addEventListener("error", (error: any) => {
					console.log(
						"🔌 [DemoDatafeed] Bybit WebSocket error:",
						error
					);
					console.error(
						"WebSocket connection failed. Please check network connectivity and URL."
					);
				});

				this.demoSocket.addEventListener("message", (event: any) => {
					this.handleBybitMessage(event);
				});
			} else {
				// Create mock socket for non-Bybit symbols
				this.demoSocket = {
					readyState: 1, // WebSocket.OPEN
					url: `wss://demo.gocharting.com/ws/${
						symbolInfo.exchange || "DEMO"
					}`,
					send: (message: string) => {
						console.log(
							"📤 [DemoSocket] Mock sending:",
							JSON.parse(message)
						);
					},
					close: () => {
						console.log("🔌 [DemoSocket] Mock connection closed");
						this.demoSocket.readyState = 3; // WebSocket.CLOSED
					},
					addEventListener: (event: string, _callback: any) => {
						console.log(
							`🔌 [DemoSocket] Mock event listener added for: ${event}`
						);
					},
				};
			}

			return this.demoSocket;
		},

		// Get Bybit WebSocket URL (mirroring streaming.js getWebSocketUrl)
		getBybitWebSocketUrl(_symbolInfo: any) {
			// Use Bybit's public WebSocket endpoint
			return "wss://stream.bybit.com/v5/public/linear";
		},

		// Handle Bybit WebSocket messages (mirroring streaming.js message handling)
		handleBybitMessage(event: any) {
			try {
				const feedMessage = JSON.parse(event.data);
				const { topic } = feedMessage;

				if (!topic || !topic.startsWith("publicTrade")) {
					// Skip all non-trading events
					return;
				}

				// Find the subscription for this topic
				const subscriptionItem = this.channelToSubscription?.get(topic);
				if (!subscriptionItem) {
					console.log(
						"❌ [DemoDatafeed] No subscription found for topic:",
						topic
					);
					return;
				}

				// Process real Bybit trade data
				this.processRealBybitData(topic, feedMessage);
			} catch (error) {
				console.error(
					"❌ [DemoDatafeed] Error parsing Bybit message:",
					error
				);
			}
		},

		// Process real Bybit trade data (mirroring streaming.js processing)
		processRealBybitData(topic: string, feedMessage: any) {
			const subscriptionItem = this.channelToSubscription?.get(topic);
			if (!subscriptionItem) {
				return;
			}

			const { data } = feedMessage;
			if (!data || data.length === 0) return;

			// Process each trade in the data array (matching streaming.js format exactly)
			data.forEach((each: any) => {
				const { T: timestamp, s, S: side, p: price, i, v: size } = each;

				const tradeMessage = {
					type: "trade",
					productId: `BYBIT:FUTURE:${s}`,
					symbol: s,
					exchange: "BYBIT",
					segment: "FUTURE",
					timeStamp: new Date(timestamp),
					tradeID: i,
					price: Number(price),
					quantity: Number(size),
					amount: Number(price) * Number(size),
					side: side.toUpperCase(),
				};

				// Call all handlers for this channel (matching streaming.js exactly)
				subscriptionItem.handlers.forEach((handler: any) => {
					try {
						handler.callback(tradeMessage);
					} catch (error) {
						console.error(
							`❌ [DemoDatafeed] Error in handler ${handler.id}:`,
							error
						);
					}
				});
			});
		},

		// Send subscription (real Bybit or demo, mirroring streaming.js subscription logic)
		sendDemoSubscription(subRequest: any, subscriptionItem: any) {
			const isRealBybit =
				subscriptionItem.symbolInfo.exchange === "BYBIT";

			if (
				this.demoSocket &&
				this.demoSocket.readyState === WebSocket.OPEN
			) {
				// Send real subscription request
				this.demoSocket.send(JSON.stringify(subRequest));

				// For non-Bybit symbols, start demo streaming
				// For Bybit symbols, real data will come through WebSocket messages
				if (!isRealBybit) {
					this.startChannelStreaming(subscriptionItem);
				}
			} else if (
				this.demoSocket &&
				this.demoSocket.readyState === WebSocket.CONNECTING
			) {
				// Socket is connecting, wait for it to open
				if (isRealBybit && this.demoSocket instanceof WebSocket) {
					this.demoSocket.addEventListener(
						"open",
						() => {
							console.log(
								"🔌 [DemoDatafeed] Bybit socket opened, sending subscription"
							);
							this.demoSocket.send(JSON.stringify(subRequest));
						},
						{ once: true }
					);
				} else {
					// For demo sockets, simulate connection
					setTimeout(() => {
						console.log(
							"🔌 [DemoDatafeed] Demo socket connected, sending subscription"
						);
						this.demoSocket.readyState = WebSocket.OPEN;
						this.demoSocket.send(JSON.stringify(subRequest));
						this.startChannelStreaming(subscriptionItem);
					}, 100);
				}
			} else {
				// Socket is closed or failed, need to reconnect
				console.error(
					"❌ [DemoDatafeed] Socket not connected. ReadyState:",
					this.demoSocket?.readyState
				);

				if (isRealBybit) {
					this.initializeDemoSocket(subscriptionItem.symbolInfo);
					// Wait for the new socket to connect
					if (this.demoSocket instanceof WebSocket) {
						this.demoSocket.addEventListener(
							"open",
							() => {
								console.log(
									"🔌 [DemoDatafeed] Bybit socket reconnected, sending subscription"
								);
								this.demoSocket.send(
									JSON.stringify(subRequest)
								);
							},
							{ once: true }
						);
					}
				} else {
					// For demo sockets, simulate connection
					setTimeout(() => {
						this.demoSocket.readyState = WebSocket.OPEN;
						this.demoSocket.send(JSON.stringify(subRequest));
						this.startChannelStreaming(subscriptionItem);
					}, 100);
				}
			}
		},

		// Send demo unsubscription (mirroring streaming.js unsubscription logic)
		sendDemoUnsubscription(unsubRequest: any, _channelString: string) {
			if (this.demoSocket && this.demoSocket.readyState === 1) {
				this.demoSocket.send(JSON.stringify(unsubRequest));
			}
		},

		// Start streaming for a specific channel (mirroring streaming.js message handling)
		startChannelStreaming(subscriptionItem: any) {
			const { channelString } = subscriptionItem;

			if (!this.streamingIntervals) {
				this.streamingIntervals = {};
			}

			// Clear any existing interval for this channel
			if (this.streamingIntervals[channelString]) {
				clearInterval(this.streamingIntervals[channelString]);
			}

			// Simulate real-time trade data similar to streaming.js message processing
			let lastPrice = 50000 + Math.random() * 10000;

			this.streamingIntervals[channelString] = setInterval(() => {
				// Simulate realistic price movement
				const change = (Math.random() - 0.5) * 100;
				lastPrice = Math.max(1000, lastPrice + change);

				// Create trade data similar to streaming.js format
				const tradeData = {
					topic: channelString,
					type: "snapshot",
					data: [
						{
							T: Date.now(),
							s: subscriptionItem.symbolInfo?.symbol || "DEMO",
							S: Math.random() > 0.5 ? "Buy" : "Sell",
							p: Math.round(lastPrice * 100) / 100,
							i: Math.random().toString(36).substring(2, 11),
							v: (Math.random() * 10 + 0.1).toFixed(3),
						},
					],
				};

				// Process the trade data for all handlers (mirroring streaming.js message handling)
				this.processDemoTradeData(channelString, tradeData);
			}, 2000);
		},

		// Process demo trade data (mirroring streaming.js message processing)
		processDemoTradeData(channelString: string, feedMessage: any) {
			const subscriptionItem =
				this.channelToSubscription?.get(channelString);
			if (!subscriptionItem) {
				console.log(
					"❌ [DemoDatafeed] No subscription found for channel:",
					channelString
				);
				return;
			}

			const { data } = feedMessage;
			if (!data || data.length === 0) return;

			// Process each trade in the data array (matching streaming.js format exactly)
			data.forEach((each: any) => {
				const { T: timestamp, S: side, p: price, v: size } = each;

				const symbol = subscriptionItem.symbolInfo?.symbol || "DEMO";
				const tradeMessage = {
					type: "trade",
					productId: `DEMO:FUTURE:${symbol}`,
					symbol: symbol,
					exchange: subscriptionItem.symbolInfo?.exchange || "DEMO",
					segment: "FUTURE",
					timeStamp: new Date(timestamp),
					tradeID: Math.random().toString(36).substring(2, 11),
					price: Number(price),
					quantity: Number(size),
					amount: Number(price) * Number(size),
					side: side.toUpperCase(),
				};

				// Call all handlers for this channel (matching streaming.js exactly)
				subscriptionItem.handlers.forEach((handler: any) => {
					try {
						handler.callback(tradeMessage);
					} catch (error) {
						console.error(
							`❌ [DemoDatafeed] Error in handler ${handler.id}:`,
							error
						);
					}
				});
			});
		},
	};

	return datafeed;
};
