import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GamePage from "./pages/GamePage.tsx";
import TestLabPage from "./pages/TestLabPage.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/test-lab" element={<TestLabPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
