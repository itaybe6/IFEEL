import React, { createContext, useContext, useState } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setIsLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm z-50 transition-opacity duration-300">
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-gray-300 border-t-gray-600 animate-spin"></div>
            </div>
          </div>
        </div>
      )}
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {children}
      </div>
    </LoadingContext.Provider>
  );
}