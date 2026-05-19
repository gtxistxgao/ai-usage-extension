import './styles/global.css';

export const App = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 max-w-sm">
        <h1 className="text-xl font-bold text-neutral-900 mb-2">Extension Template</h1>
        <p className="text-sm text-neutral-500 mb-6">
          A clean foundation for your next Chrome extension. Start editing in <code>src/sidepanel/App.tsx</code>.
        </p>
        <button
          onClick={() => window.open('https://developer.chrome.com/docs/extensions')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          View Documentation
        </button>
      </div>
    </div>
  );
};
