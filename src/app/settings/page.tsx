'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Cloud, Download, Upload, Save, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useStoreSettings } from '@/context/store-settings-context';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';


export default function SettingsPage() {
  const { settings: initialSettings, saveSettings } = useStoreSettings();
  const [settings, setSettings] = useState(initialSettings);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setSettings(prev => ({ ...prev, [id]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveChanges = () => {
    saveSettings(settings);
    toast({
        title: "Settings Saved",
        description: "Your store information has been updated successfully.",
    });
  };

  const handleResetData = () => {
    // This is a placeholder. In a real app, this would trigger
    // a global state reset or clear local storage.
    console.log("Resetting all local data...");
    localStorage.clear(); // This will clear all local storage for the domain.
    toast({
      title: "Local Data Reset",
      description: "All application data has been reset. The app will now reload.",
    });
    // For now, we can just reload the page to simulate a reset with mock data
    setTimeout(() => {
        window.location.reload();
    }, 1500)
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>
              Update your store's public details and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-6">
                <div className="space-y-2">
                    <Label>Store Logo</Label>
                    <div className="relative w-24 h-24 rounded-md border flex items-center justify-center bg-muted">
                        {settings.logo ? (
                            <Image src={settings.logo} alt="Store Logo" layout="fill" className="object-contain rounded-md" />
                        ) : (
                            <span className="text-xs text-muted-foreground">No Logo</span>
                        )}
                    </div>
                    <Input id="logo-upload" type="file" accept="image/*" className="text-xs" onChange={handleLogoChange}/>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 flex-1">
                    <div className="space-y-2">
                        <Label htmlFor="storeName">Store Name</Label>
                        <Input id="storeName" value={settings.storeName} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={settings.email} onChange={handleInputChange} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input id="ownerName" value={settings.ownerName} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coOwnerName">Co-Owner Name (Optional)</Label>
                <Input id="coOwnerName" value={settings.coOwnerName} onChange={handleInputChange} placeholder="Enter co-owner name" />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="address">Store Address</Label>
                <Textarea id="address" value={settings.address} onChange={handleInputChange} placeholder="Enter your full store address" />
              </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contact1">Contact Number 1</Label>
                <Input id="contact1" value={settings.contact1} onChange={handleInputChange}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact2">Contact Number 2</Label>
                <Input id="contact2" value={settings.contact2} onChange={handleInputChange} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact3">Contact Number 3</Label>
                <Input id="contact3" value={settings.contact3} onChange={handleInputChange} placeholder="Optional" />
              </div>
            </div>
             <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-mode">Theme</Label>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="language-mode">Language</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>English</Button>
                <Button variant="secondary" size="sm">اردو</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data &amp; Sync</CardTitle>
            <CardDescription>
              Manage data synchronization with the cloud.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center space-x-2">
              <Switch id="auto-sync" defaultChecked />
              <Label htmlFor="auto-sync">Enable Auto-Sync</Label>
            </div>
            <div className='flex flex-col space-y-2'>
                <p className="text-sm text-muted-foreground">
                    Status: <span className='text-green-500 font-medium'>Synced a few seconds ago</span>
                </p>
                <Button variant="outline">
                    <Cloud className="mr-2 h-4 w-4" />
                    Sync Now
                </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Backup &amp; Restore</CardTitle>
            <CardDescription>
              Create backups and restore your data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground">
                Last backup: Today at 2:00 AM
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Create Backup
                </Button>
                <Button variant="outline" className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Restore Data
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              These actions are permanent and cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                <div>
                    <h3 className="font-semibold">Reset All Local Data</h3>
                    <p className="text-sm text-muted-foreground">Erase all sales, inventory, and customer data from this device.</p>
                </div>
                <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reset Data
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete all local application data, including sales, inventory, customers, and settings. This action cannot be undone and will not affect your cloud backup.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetData}>Yes, Reset Everything</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
