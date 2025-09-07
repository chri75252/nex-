
import React, { useState } from 'react';
import type { AnalysisResult } from '../types';
import AnalysisSummary from './AnalysisSummary';
import ClauseList from './ClauseList';
import ClauseDetail from './ClauseDetail';
import NegotiationChecklist from './NegotiationChecklist';
import MissingClausesReport from './MissingClausesReport';
import { downloadReport } from '../utils/reportGenerator';

interface AnalysisDisplayProps {
  results: AnalysisResult[];
  missingClausesReport: string | null;
  onReset: () => void;
}

type Tab = 'analysis' | 'negotiation' | 'missing';

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ results, missingClausesReport, onReset }) => {
  const [selectedClauseIndex, setSelectedClauseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('analysis');

  const selectedClause = results[selectedClauseIndex];
  
  const TabButton: React.FC<{tabName: Tab, children: React.ReactNode}> = ({ tabName, children }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none ${
        activeTab === tabName
          ? 'bg-brand-secondary text-white'
          : 'bg-transparent text-brand-text-secondary hover:bg-brand-light/20'
      }`}
      aria-current={activeTab === tabName ? 'page' : undefined}
    >
      {children}
    </button>
  );

  return (
    <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
                <h2 className="text-3xl font-bold text-white">Analysis Report</h2>
                <p className="text-brand-text-secondary mt-1">A comprehensive review based on the NEEX Blueprint.</p>
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
                <button
                    onClick={() => downloadReport(results, 'md')}
                    className="bg-brand-light hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                    Download MD
                </button>
                 <button
                    onClick={() => downloadReport(results, 'json')}
                    className="bg-brand-light hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                    Download JSON
                </button>
                <button
                    onClick={onReset}
                    className="bg-brand-accent hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                    Analyze New Contract
                </button>
            </div>
      </div>

      <AnalysisSummary results={results} />

      <div className="mt-8">
        <div className="border-b border-brand-light">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <TabButton tabName="analysis">Clause Analysis</TabButton>
            <TabButton tabName="negotiation">Negotiation Checklist</TabButton>
            <TabButton tabName="missing">Missing Clauses Report</TabButton>
          </nav>
        </div>

        <div className="mt-6">
            {activeTab === 'analysis' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                    <ClauseList
                        results={results}
                        selectedIndex={selectedClauseIndex}
                        onSelectClause={setSelectedClauseIndex}
                    />
                    </div>
                    <div className="lg:col-span-2">
                    {selectedClause && <ClauseDetail result={selectedClause} />}
                    </div>
                </div>
            )}
            {activeTab === 'negotiation' && (
                <NegotiationChecklist results={results} />
            )}
            {activeTab === 'missing' && (
                <MissingClausesReport report={missingClausesReport} />
            )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
