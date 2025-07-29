'use client';

import { useState, useEffect } from 'react';
import { AlertCategory, AlertSeverity } from '@repo/utils/alerting';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui';
import AlertsPanel from './alerts-panel';
import PerformancePanel from './performance-panel';
import SystemHealthPanel from './system-health-panel';
import BotDetectionPanel from './bot-detection-panel';

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    // Fetch initial data
    fetchAlerts();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data.alerts);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setIsLoading(false);
    }
  };
  
  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      fetchAlerts(); // Refresh alerts after resolving
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="bot">Bot Detection</TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts" className="mt-6">
          <AlertsPanel 
            alerts={alerts} 
            isLoading={isLoading} 
            onResolve={handleResolveAlert} 
          />
        </TabsContent>
        
        <TabsContent value="performance" className="mt-6">
          <PerformancePanel />
        </TabsContent>
        
        <TabsContent value="health" className="mt-6">
          <SystemHealthPanel />
        </TabsContent>
        
        <TabsContent value="bot" className="mt-6">
          <BotDetectionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}