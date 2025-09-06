
import React, { useState } from 'react';
import type { AnalysisResult } from '../types';
import AnalysisSummary from './AnalysisSummary';
import ClauseList from './ClauseList';
import ClauseDetail from './ClauseDetail';
import { downloadReport } from '../utils/reportGenerator';

interface AnalysisDisplayProps {
  results: AnalysisResult[];
  onReset: () => void;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ results, onReset }) => {
  const [selectedClauseIndex, setSelectedClauseIndex] = useState(0);

  const selectedClause = results[selectedClauseIndex];

  return (
    <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
                <h2 className="text-3xl font-bold text-white">Analysis Report</h2>
                <p className="text-brand-text-secondary mt-1">Select a clause to view its detailed analysis.</p>
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

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
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
    </div>
  );
};

export default AnalysisDisplay;
