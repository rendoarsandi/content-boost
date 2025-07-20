import AdminNav from '../components/admin-nav';
import BotDetectionMonitoring from './components/bot-detection-monitoring';

export default function BotDetectionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bot Detection Monitoring</h1>
            <p className="text-gray-600">Monitor bot detection system and review flagged activities</p>
          </div>
          <BotDetectionMonitoring />
        </div>
      </main>
    </div>
  );
}