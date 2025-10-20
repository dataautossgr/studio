'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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

  return (
    <StoreSettingsContext.Provider value={{ settings, setSettings }}>
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
