import { Metadata } from 'next';
import MonitoringDashboard from './components/monitoring-dashboard';

export const metadata: Metadata = {
  title: 'System Monitoring | Admin Dashboard',
  description: 'Monitor system health, performance, and alerts',
};

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">System Monitoring</h1>
      <MonitoringDashboard />
    </div>
  );
}