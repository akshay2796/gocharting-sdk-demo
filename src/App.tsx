import ChartDemo from "./components/ChartDemo";

// Alternative components (uncomment to use)
// import CombineChart from "./pages/CombineChart";
import AdvancedTradingPage from "./pages/AdvancedTradingPage";

function App() {
	// Default: Use the simplified ChartDemo that matches chart-sdk-codepen.html
	// return <ChartDemo />;

	// Alternative: Use the advanced trading page with order management
	return <AdvancedTradingPage />;

	// Alternative: Use the combine chart example
	// return <CombineChart />;
}

export default App;
