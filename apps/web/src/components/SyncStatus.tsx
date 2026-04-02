"use client";

interface SyncStatusProps {
  status: string;
  lastSyncedAt: string | null;
  isCurrentlySyncing: boolean;
  onTriggerSync: () => void;
}

export function SyncStatus({ status, lastSyncedAt, isCurrentlySyncing, onTriggerSync }: SyncStatusProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "READY": return "bg-green-100 text-green-700";
      case "SYNCING": return "bg-blue-100 text-blue-700";
      case "PENDING": return "bg-yellow-100 text-yellow-700";
      case "ERROR": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Sync Status</h3>
        <button
          onClick={onTriggerSync}
          disabled={isCurrentlySyncing}
          className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 disabled:opacity-50"
        >
          {isCurrentlySyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-text-secondary mb-1">Status</p>
          <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-text-secondary mb-1">Last Synced</p>
          <p className="text-sm font-semibold text-text-primary">
            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : "Never"}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-text-secondary mb-1">Next Sync</p>
          <p className="text-sm font-semibold text-text-primary">Weekly (Sun 2:00 UTC)</p>
        </div>
      </div>
    </div>
  );
}
