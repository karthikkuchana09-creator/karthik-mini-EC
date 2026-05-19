function Stepper({ steps, currentStep, className = '' }) {
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <div key={idx} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                isCompleted
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : isCurrent
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : idx + 1}
              </div>
              <span className={`text-sm font-medium ${
                isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-4 ${
                isCompleted ? 'bg-indigo-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Stepper;
