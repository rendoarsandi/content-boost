'use client';

import { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from '@repo/ui';
import { Save, RefreshCw } from 'lucide-react';

interface PlatformSettings {
  platformFeeRate: number;
  botDetectionEnabled: boolean;
  botDetectionThresholds: {
    viewLikeRatio: number;
    viewCommentRatio: number;
    spikePercentage: number;
    spikeTimeWindow: number;
  };
  botDetectionConfidence: {
    ban: number;
    warning: number;
    monitor: number;
  };
  payoutSettings: {
    minimumPayout: number;
    payoutSchedule: string;
    autoProcessPayouts: boolean;
  };
  systemMaintenance: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    if (!settings) return;

    const keys = path.split('.');
    const newSettings = { ...settings };
    let current: any = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Failed to load settings. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="platform-fee">Platform Fee Rate (%)</Label>
            <Input
              id="platform-fee"
              type="number"
              value={settings.platformFeeRate}
              onChange={(e) => updateSettings('platformFeeRate', parseFloat(e.target.value))}
              min="0"
              max="100"
              step="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Percentage fee taken from each payout
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bot Detection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Detection Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.botDetectionEnabled}
              onCheckedChange={(checked) => updateSettings('botDetectionEnabled', checked)}
            />
            <Label>Enable Bot Detection</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="view-like-ratio">View:Like Ratio Threshold</Label>
              <Input
                id="view-like-ratio"
                type="number"
                value={settings.botDetectionThresholds.viewLikeRatio}
                onChange={(e) => updateSettings('botDetectionThresholds.viewLikeRatio', parseFloat(e.target.value))}
                min="1"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="view-comment-ratio">View:Comment Ratio Threshold</Label>
              <Input
                id="view-comment-ratio"
                type="number"
                value={settings.botDetectionThresholds.viewCommentRatio}
                onChange={(e) => updateSettings('botDetectionThresholds.viewCommentRatio', parseFloat(e.target.value))}
                min="1"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="spike-percentage">Spike Percentage (%)</Label>
              <Input
                id="spike-percentage"
                type="number"
                value={settings.botDetectionThresholds.spikePercentage}
                onChange={(e) => updateSettings('botDetectionThresholds.spikePercentage', parseFloat(e.target.value))}
                min="100"
                step="10"
              />
            </div>
            <div>
              <Label htmlFor="spike-time">Spike Time Window (minutes)</Label>
              <Input
                id="spike-time"
                type="number"
                value={settings.botDetectionThresholds.spikeTimeWindow}
                onChange={(e) => updateSettings('botDetectionThresholds.spikeTimeWindow', parseInt(e.target.value))}
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ban-confidence">Ban Confidence (%)</Label>
              <Input
                id="ban-confidence"
                type="number"
                value={settings.botDetectionConfidence.ban}
                onChange={(e) => updateSettings('botDetectionConfidence.ban', parseInt(e.target.value))}
                min="50"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="warning-confidence">Warning Confidence (%)</Label>
              <Input
                id="warning-confidence"
                type="number"
                value={settings.botDetectionConfidence.warning}
                onChange={(e) => updateSettings('botDetectionConfidence.warning', parseInt(e.target.value))}
                min="20"
                max="90"
              />
            </div>
            <div>
              <Label htmlFor="monitor-confidence">Monitor Confidence (%)</Label>
              <Input
                id="monitor-confidence"
                type="number"
                value={settings.botDetectionConfidence.monitor}
                onChange={(e) => updateSettings('botDetectionConfidence.monitor', parseInt(e.target.value))}
                min="10"
                max="50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="minimum-payout">Minimum Payout Amount (Rp)</Label>
            <Input
              id="minimum-payout"
              type="number"
              value={settings.payoutSettings.minimumPayout}
              onChange={(e) => updateSettings('payoutSettings.minimumPayout', parseFloat(e.target.value))}
              min="0"
              step="1000"
            />
          </div>
          <div>
            <Label htmlFor="payout-schedule">Payout Schedule</Label>
            <Input
              id="payout-schedule"
              value={settings.payoutSettings.payoutSchedule}
              onChange={(e) => updateSettings('payoutSettings.payoutSchedule', e.target.value)}
              placeholder="e.g., Daily at 00:00 WIB"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.payoutSettings.autoProcessPayouts}
              onCheckedChange={(checked) => updateSettings('payoutSettings.autoProcessPayouts', checked)}
            />
            <Label>Auto Process Payouts</Label>
          </div>
        </CardContent>
      </Card>

      {/* System Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>System Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.systemMaintenance.maintenanceMode}
              onCheckedChange={(checked) => updateSettings('systemMaintenance.maintenanceMode', checked)}
            />
            <Label>Maintenance Mode</Label>
          </div>
          <div>
            <Label htmlFor="maintenance-message">Maintenance Message</Label>
            <Textarea
              id="maintenance-message"
              value={settings.systemMaintenance.maintenanceMessage}
              onChange={(e) => updateSettings('systemMaintenance.maintenanceMessage', e.target.value)}
              placeholder="Message to display during maintenance"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={fetchSettings}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}