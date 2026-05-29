import { createContext, useContext, useReducer, useCallback } from 'react';

const StoreContext = createContext(null);

const initialState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  globalSearch: '',
  filters: {},
  theme: 'light',
};

function storeReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'TOGGLE_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_GLOBAL_SEARCH':
      return { ...state, globalSearch: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'CLEAR_FILTERS':
      return { ...state, filters: {} };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);
  const toggleSidebarCollapsed = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' }), []);
  const setGlobalSearch = useCallback((query) => dispatch({ type: 'SET_GLOBAL_SEARCH', payload: query }), []);
  const setFilters = useCallback((filters) => dispatch({ type: 'SET_FILTERS', payload: filters }), []);
  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);
  const setTheme = useCallback((theme) => dispatch({ type: 'SET_THEME', payload: theme }), []);

  const value = {
    ...state,
    toggleSidebar,
    toggleSidebarCollapsed,
    setGlobalSearch,
    setFilters,
    clearFilters,
    setTheme,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
