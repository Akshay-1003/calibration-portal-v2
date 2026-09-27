
import './App.css'
import { Basic} from './app/features/dashboard/page.tsx'

import { Button } from "@heroui/react";

function App() {
  return (
    <div className="min-h-screen bg-background p-10">
      <h1 className="mb-6 text-2xl font-bold">
        Calibration Portal V2
      </h1>

      <div className="flex gap-4">
        <Button variant="primary">
          Primary Button
        </Button>

        <Button variant="secondary">
          Secondary Button
        </Button>
      </div>
      <Basic />
    </div>
  );
}

export default App;
