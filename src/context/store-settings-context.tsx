'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface StoreSettings {
  storeName: string;
  logo: string;
  ownerName: string;
  coOwnerName: string;
  email: string;
  address: string;
  contact1: string;
  contact2: string;
  contact3: string;
}

interface StoreSettingsContextType {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  saveSettings: (newSettings: StoreSettings) => void;
}

const defaultSettings: StoreSettings = {
  storeName: 'Data Autos',
  logo: '',
  ownerName: 'Ameer Hamza',
  coOwnerName: '',
  email: 'admin@dataautos.com',
  address: '',
  contact1: '0317-3890161',
  contact2: '',
  contact3: '',
};

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('storeSettings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('storeSettings', JSON.stringify(settings));
      } catch (error) {
        console.error("Failed to save settings to localStorage", error);
      }
    }
  }, [settings, isInitialized]);

  const saveSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
  };

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <StoreSettingsContext.Provider value={{ settings, setSettings, saveSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (context === undefined) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
}
