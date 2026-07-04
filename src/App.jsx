import { useState, useMemo } from "react";
import { mergeFixed } from "./utils/fixed";
import { useTheme } from "./theme/ThemeContext";
import Layout from "./components/Layout";
import Overview from "./tabs/Overview";
import Spending from "./tabs/Spending";
import Analysis from "./tabs/Analysis";
import Planning from "./tabs/Planning";
import Investments from "./tabs/Investments";
import Settings from "./tabs/Settings";
import { useSheetData } from "./hooks/useSheetData";

function LoadingState() {
  const { T } = useTheme();
  return (
    <div style={{ maxWidth: 800 }}>
      {[200, 120, 80, 160].map((w, i) => (
        <div key={i} style={{
          height: w === 200 ? 80 : 40,
          background: T.dim,
          borderRadius: T.radius,
          marginBottom: 12,
          width: `${w}%`.replace("200%", "100%"),
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  const { T } = useTheme();
  return (
    <div style={{ textAlign: "center", paddingTop: 80, fontFamily: T.font }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6 }}>Couldn't load data</div>
      <div style={{ fontSize: 13, color: T.sub, marginBottom: 24 }}>{error}</div>
      <button
        onClick={onRetry}
        style={{
          background: T.accent, color: "#fff", border: "none",
          borderRadius: T.radius, padding: "10px 24px",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        Retry
      </button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    transactions, budgets, assets, settings, goals, watchlists, netWorthHistory, fixed, investments,
    loading, error, refetch, saveSetting, saveBudgets, saveGoals, saveWatchlists, saveFixed, isMock,
  } = useSheetData();

  // Fixed expenses are synthesized into the card transaction stream once here
  const allTransactions = useMemo(() => mergeFixed(transactions, fixed), [transactions, fixed]);

  const tabProps = {
    transactions: allTransactions,
    budgets, assets, settings, goals, watchlists, netWorthHistory, fixed, investments,
    refetch, isMock,
  };

  const renderTab = () => {
    if (loading) return <LoadingState />;
    if (error)   return <ErrorState error={error} onRetry={refetch} />;
    switch (activeTab) {
      case "overview":  return <Overview  {...tabProps} />;
      case "spending":  return <Spending  {...tabProps} />;
      case "analysis":  return <Analysis  {...tabProps} />;
      case "planning":  return <Planning  {...tabProps} />;
      case "invest":    return <Investments {...tabProps} />;
      case "settings":  return (
        <Settings
          {...tabProps}
          saveSetting={saveSetting}
          saveBudgets={saveBudgets}
          saveGoals={saveGoals}
          saveWatchlists={saveWatchlists}
          saveFixed={saveFixed}
          isMock={isMock}
        />
      );
      default:          return <Overview  {...tabProps} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderTab()}
    </Layout>
  );
}
