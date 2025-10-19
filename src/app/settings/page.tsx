import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Cloud, Download, Upload } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </div>
  );
}
