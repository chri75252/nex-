import React, { useState, useCallback } from 'react';
import type { AnalysisResult } from './types';
import { performFullAnalysis, generateMissingClauseReport } from './services/aiService';
import Header from './components/Header';
import ContractInput from './components/ContractInput';
import AnalysisDisplay from './components/AnalysisDisplay';
import { sampleContract } from './constants';

const App: React.FC = () => {
  const [contractText, setContractText] = useState<string>(sampleContract);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [missingClausesReport, setMissingClausesReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!contractText.trim()) {
      setError('Contract text cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResults([]);
    setMissingClausesReport(null);
    setProgress({ current: 0, total: 0});

    try {
      const results = await performFullAnalysis(contractText, (update) => {
          setProgress(update);
      });
      setAnalysisResults(results);

      if (results.length > 0) {
        const clauseTags = results.map(r => r.clauseTag);
        // Remove duplicates for a cleaner prompt
        const uniqueClauseTags = [...new Set(clauseTags)];
        const report = await generateMissingClauseReport(uniqueClauseTags);
        setMissingClausesReport(report);
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [contractText]);

  const resetApp = useCallback(() => {
    setAnalysisResults([]);
    setMissingClausesReport(null);
    setContractText(sampleContract);
    setError(null);
    setProgress(null);
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {analysisResults.length === 0 ? (
          <ContractInput
            contractText={contractText}
            setContractText={setContractText}
            handleAnalyze={handleAnalyze}
            isLoading={isLoading}
            progress={progress}
            error={error}
            setError={setError}
          />
        ) : (
          <AnalysisDisplay 
            results={analysisResults} 
            missingClausesReport={missingClausesReport}
            onReset={resetApp}
          />
        )}
      </main>
    </div>
  );
};

export default App;