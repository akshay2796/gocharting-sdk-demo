import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdvancedTradingPage from "./pages/AdvancedTradingPage";
import MultiBasicPage from "./pages/MultiBasicPage";

function App() {
	return (
		<Router>
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route
					path='/advanced-trading'
					element={<AdvancedTradingPage />}
				/>
				<Route path='/multi-basic' element={<MultiBasicPage />} />
			</Routes>
		</Router>
	);
}

export default App;
