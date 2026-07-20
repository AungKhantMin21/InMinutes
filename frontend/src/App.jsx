import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Meeting } from "@/pages/Meeting";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meetings/:id" element={<Meeting />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
