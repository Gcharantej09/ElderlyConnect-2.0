import { ThemeProvider } from "../ThemeProvider";
import Dashboard from "../../pages/Dashboard";

export default function DashboardExample() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
