import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import { AuthProvider } from "./context/AuthContext";
import BlockchainView from "./context/BlockchainView"
import Inbox from "./components/Inbox";
import Listings from "./pages/Listings";
const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/blockchain" element={<BlockchainView />} />
          <Route path="/inbox" element={<Inbox/>}/>
          <Route path="/listings" element={<Listings />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
