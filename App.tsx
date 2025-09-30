import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Attendee, QrCodeData } from './types';
import Scanner from './components/Scanner';
import AttendanceList from './components/AttendanceList';
import { QrCodeIcon, CameraIcon, CheckCircleIcon, XCircleIcon, DownloadIcon, UserPlusIcon, TrashIcon, ExclamationTriangleIcon, SearchIcon, CloudUploadIcon, ArrowUpIcon, ArrowDownIcon, CameraOffIcon } from './components/icons';
import { initDB, addAttendee, getAllAttendees, deleteAttendee, clearAttendees } from './db';


const ConfirmationDialog: React.FC<{
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onConfirm, onCancel, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6 border border-slate-700">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-slate-100" id="modal-title">
                            {title}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-slate-400">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={onConfirm}
                    >
                        Confirm
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-slate-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

type SortKey = 'timestamp' | 'Nama' | 'NIK';

const App: React.FC = () => {
  const [attendanceList, setAttendanceList] = useState<Attendee[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [manualNIK, setManualNIK] = useState<string>('');
  const [manualNama, setManualNama] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isDbInitialized, setIsDbInitialized] = useState<boolean>(false);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [isScannerInitializing, setIsScannerInitializing] = useState<boolean>(false);
  const isProcessingScan = useRef(false);


  useEffect(() => {
    initDB().then(() => {
        setIsDbInitialized(true);
        getAllAttendees().then(attendees => {
            setAttendanceList(attendees.map(a => ({...a, timestamp: new Date(a.timestamp)})));
        }).catch(err => {
            console.error("Error loading data from DB:", err);
            showNotification("Could not load saved attendance data.", 'error');
        });
    }).catch(err => {
        console.error("Error initializing DB:", err);
        showNotification("Offline storage is not available.", 'error');
    });

    const handleOnline = () => {
        setIsOnline(true);
        showNotification("You are back online.", 'info');
    };
    const handleOffline = () => {
        setIsOnline(false);
        showNotification("You are offline. Data will be saved locally.", 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isScannerActive) {
      setIsScannerInitializing(true);
    } else {
      setIsScannerInitializing(false);
    }
  }, [isScannerActive]);


  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingScan.current) {
      return;
    }
    isProcessingScan.current = true;

    try {
      const data: QrCodeData = JSON.parse(decodedText);
      if (!data.NIK || !data.Nama) {
        throw new Error("Invalid QR code format. Missing 'NIK' or 'Nama'.");
      }

      if (attendanceList.some(attendee => attendee.NIK === data.NIK)) {
        showNotification(`${data.Nama} is already checked in.`, 'info');
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
        return;
      }

      const newAttendee: Attendee = {
        ...data,
        timestamp: new Date(),
      };

      await addAttendee(newAttendee);
      setAttendanceList(prevList => [newAttendee, ...prevList]);
      showNotification(`Welcome, ${data.Nama}!`, 'success');
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);


    } catch (error) {
      console.error("QR Code processing error:", error);
      showNotification("Failed to parse QR code. Please use a valid event QR code.", 'error');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } finally {
        setTimeout(() => {
            isProcessingScan.current = false;
        }, 3000);
    }
  }, [attendanceList, showNotification]);

  const handleScanError = useCallback((errorMessage: string) => {
    if (isScannerActive) { // Only show error if scanner is supposed to be active
        showNotification(errorMessage, 'error');
        setIsScannerActive(false); // Turn off scanner on critical error
    }
  }, [isScannerActive, showNotification]);
  
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNIK.trim() || !manualNama.trim()) {
      showNotification("Both NIK and Nama are required for manual entry.", 'error');
      return;
    }

    const trimmedNIK = manualNIK.trim();
    const trimmedNama = manualNama.trim();

    if (attendanceList.some(attendee => attendee.NIK === trimmedNIK)) {
      showNotification(`${trimmedNama} (NIK: ${trimmedNIK}) is already checked in.`, 'info');
      return;
    }

    const newAttendee: Attendee = {
      NIK: trimmedNIK,
      Nama: trimmedNama,
      timestamp: new Date(),
    };

    try {
        await addAttendee(newAttendee);
        setAttendanceList(prevList => [newAttendee, ...prevList]);
        showNotification(`Welcome, ${newAttendee.Nama}!`, 'success');
        setManualNIK('');
        setManualNama('');
    } catch (err) {
        showNotification("Failed to save attendee.", 'error');
    }
  };

  const handleExportCSV = () => {
    if (attendanceList.length === 0) {
      showNotification("No attendees to export.", 'info');
      return;
    }

    const headers = ['NIK', 'Nama', 'Timestamp'];
    const sortedAttendees = [...attendanceList].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const rows = sortedAttendees.map(attendee => [
      attendee.NIK,
      `"${attendee.Nama.replace(/"/g, '""')}"`,
      `"${attendee.timestamp.toLocaleString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `attendance_list_${date}.csv`);
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
    showNotification("Attendance list exported.", 'success');
  };

  const handleConfirmClear = async () => {
    try {
        await clearAttendees();
        setAttendanceList([]);
        setShowClearConfirm(false);
        showNotification("Attendance list has been cleared.", 'success');
    } catch(err) {
        showNotification("Failed to clear attendance list.", 'error');
    }
  };

  const handleDeleteRequest = (nik: string) => {
    setAttendeeToDelete(nik);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!attendeeToDelete) return;
    const attendeeToRemove = attendanceList.find(a => a.NIK === attendeeToDelete);
    try {
        await deleteAttendee(attendeeToDelete);
        setAttendanceList(prevList => prevList.filter(attendee => attendee.NIK !== attendeeToDelete));
        setShowDeleteConfirm(false);
        setAttendeeToDelete(null);
        showNotification(`${attendeeToRemove?.Nama || 'Attendee'} has been removed.`, 'success');
    } catch(err) {
        showNotification("Failed to remove attendee.", 'error');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setAttendeeToDelete(null);
  };

  const handleSyncData = () => {
      // In a real app, this would send attendanceList to a server
      console.log("Syncing data...", attendanceList);
      showNotification("Data synced successfully!", 'success');
  }
  
  const sortedAndFilteredAttendees = useMemo(() => {
    const filtered = attendanceList
        .filter(attendee =>
            attendee.Nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
            attendee.NIK.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return [...filtered].sort((a, b) => {
        let comparison = 0;
        switch (sortKey) {
            case 'Nama':
            case 'NIK':
                comparison = a[sortKey].localeCompare(b[sortKey]);
                break;
            case 'timestamp':
                comparison = a.timestamp.getTime() - b.timestamp.getTime();
                break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [attendanceList, searchQuery, sortKey, sortOrder]);

  const NotificationBanner: React.FC | null = () => {
    if (!notification) return null;
    
    const baseClasses = "fixed top-5 left-1/2 -translate-x-1/2 flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg z-50 animate-fade-in-down";
    const typeClasses = {
      success: "bg-green-800 text-green-200",
      error: "bg-red-800 text-red-200",
      info: "bg-blue-800 text-blue-200"
    };

    return (
        <div className={`${baseClasses} ${typeClasses[notification.type]}`} role="alert">
            {notification.type === 'success' && <CheckCircleIcon className="w-5 h-5 mr-3" />}
            {notification.type === 'error' && <XCircleIcon className="w-5 h-5 mr-3" />}
            {notification.type === 'info' && <QrCodeIcon className="w-5 h-5 mr-3" />}
            <span className="font-medium">{notification.message}</span>
        </div>
    );
  };

  const StatusIndicator = () => (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></span>
      <span className="text-sm font-medium text-slate-300">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translate(-50%, -20px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
        
        @keyframes scan-line-anim {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(calc(100% - 4px)); opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line-anim 3s ease-in-out infinite;
        }
      `}</style>
      <NotificationBanner />
       <ConfirmationDialog
        isOpen={showClearConfirm}
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear Attendance List"
        message="Are you sure you want to clear the entire attendance list? This action cannot be undone."
      />
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Attendee"
        message="Are you sure you want to remove this attendee from the list? This action cannot be undone."
      />
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <CameraIcon className="w-10 h-10 text-cyan-400"/>
            <h1 className="text-4xl font-bold tracking-tight text-slate-100">Attendance Scanner</h1>
          </div>
          <p className="mt-2 text-lg text-slate-400">Scan a QR code or enter details manually to check in attendees.</p>
          <div className="mt-4 flex justify-center">
            <StatusIndicator />
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700 h-fit">
            <div className="flex flex-col items-center gap-4">
                <button
                    type="button"
                    onClick={() => setIsScannerActive(prev => !prev)}
                    className={`w-full inline-flex items-center gap-3 justify-center px-4 py-3 text-md font-medium text-center text-white rounded-lg transition-colors focus:ring-4 ${
                        isScannerActive 
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-900' 
                        : 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-800'
                    }`}
                >
                    {isScannerActive ? <CameraOffIcon className="w-6 h-6"/> : <CameraIcon className="w-6 h-6"/>}
                    {isScannerActive ? 'Stop Scanner' : 'Start Scanner'}
                </button>

                <div className="w-full">
                    {isScannerActive ? (
                        <div className="text-center">
                            {isScannerInitializing ? (
                                <div className="w-full text-center border-2 border-dashed border-slate-600 rounded-lg p-8">
                                    <svg className="animate-spin h-12 w-12 text-slate-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <h3 className="mt-4 text-lg font-medium text-slate-400">Initializing Camera...</h3>
                                    <p className="mt-1 text-sm text-slate-500">Please grant camera permissions if prompted.</p>
                                </div>
                            ) : (
                                <p className="text-slate-400 mb-4">Position a QR code within the frame to check in.</p>
                            )}
                            <div className={isScannerInitializing ? 'hidden' : ''}>
                                <Scanner 
                                    onScanSuccess={handleScanSuccess} 
                                    onScanError={handleScanError}
                                    onReady={() => setIsScannerInitializing(false)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="w-full text-center border-2 border-dashed border-slate-600 rounded-lg p-8">
                            <CameraIcon className="mx-auto w-12 h-12 text-slate-500" />
                            <h3 className="mt-2 text-lg font-medium text-slate-400">Scanner is Off</h3>
                            <p className="mt-1 text-sm text-slate-500">Click "Start Scanner" to activate the camera.</p>
                        </div>
                    )}
                </div>

                <div className="relative my-2 w-full">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-600" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-slate-800 px-2 text-sm text-slate-400">Or Add Manually</span>
                    </div>
                </div>
                
                <form onSubmit={handleManualAdd} className="w-full space-y-4 sm:space-y-0 sm:flex sm:items-end sm:space-x-4">
                    <div className="flex-grow">
                        <label htmlFor="attendee-nik" className="block text-sm font-medium text-slate-300 text-left">
                            NIK
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="attendee-nik"
                                id="attendee-nik"
                                value={manualNIK}
                                onChange={(e) => setManualNIK(e.target.value)}
                                className="block w-full rounded-md bg-slate-700 border-slate-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-white px-3 py-2"
                                placeholder="e.g., 3171..."
                                aria-label="NIK"
                            />
                        </div>
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="attendee-nama" className="block text-sm font-medium text-slate-300 text-left">
                            Nama
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="attendee-nama"
                                id="attendee-nama"
                                value={manualNama}
                                onChange={(e) => setManualNama(e.target.value)}
                                className="block w-full rounded-md bg-slate-700 border-slate-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-white px-3 py-2"
                                placeholder="e.g., Jane Doe"
                                aria-label="Nama"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full sm:w-auto inline-flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-colors"
                    >
                        <UserPlusIcon className="w-5 h-5"/>
                        Add Attendee
                    </button>
                </form>
            </div>
          </div>
          
          <div className="lg:col-span-3 bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700">
             <div className="border-b border-slate-700 pb-4 mb-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-semibold text-slate-200">
                        Checked-in Attendees
                    </h2>
                    <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-2">
                        <button
                            onClick={handleSyncData}
                            disabled={!isOnline || attendanceList.length === 0}
                            className="inline-flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-center text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-900 disabled:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Sync attendance data"
                        >
                            <CloudUploadIcon className="w-5 h-5"/>
                            Sync Data
                        </button>
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            disabled={attendanceList.length === 0}
                            className="inline-flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:focus:ring-red-900 disabled:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Clear attendance list"
                        >
                            <TrashIcon className="w-5 h-5"/>
                            Clear List
                        </button>
                        <button
                            onClick={handleExportCSV}
                            disabled={attendanceList.length === 0}
                            className="inline-flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-center text-white bg-slate-600 rounded-lg hover:bg-slate-700 focus:ring-4 focus:ring-slate-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Export attendance list to CSV"
                        >
                            <DownloadIcon className="w-5 h-5"/>
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-slate-900/70 p-4 border border-slate-700">
                        <p className="text-sm font-medium text-slate-400">Total Checked-in</p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{attendanceList.length}</p>
                    </div>
                    {searchQuery && (
                    <div className="rounded-lg bg-slate-900/70 p-4 border border-slate-700">
                        <p className="text-sm font-medium text-slate-400">Matching Search</p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-cyan-400">{sortedAndFilteredAttendees.length}</p>
                    </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="sort-key" className="text-sm font-medium text-slate-400 whitespace-nowrap">
                            Sort by:
                        </label>
                        <select
                            id="sort-key"
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as SortKey)}
                            className="rounded-md bg-slate-700 border-slate-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-white px-3 py-2"
                        >
                            <option value="timestamp">Timestamp</option>
                            <option value="Nama">Name</option>
                            <option value="NIK">NIK</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="inline-flex items-center gap-1.5 justify-center px-4 py-2 text-sm font-medium text-center text-white bg-slate-600 rounded-lg hover:bg-slate-700 focus:ring-4 focus:ring-slate-500 transition-colors"
                            aria-label={`Sort in ${sortOrder === 'asc' ? 'descending' : 'ascending'} order`}
                        >
                            {sortOrder === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                            <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                        </button>
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            name="search"
                            id="search"
                            className="block w-full sm:max-w-xs rounded-md bg-slate-700 border-slate-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm text-white py-2 pl-10"
                            placeholder="Search by Nama or NIK..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search attendees"
                        />
                    </div>
                </div>
             </div>
            <AttendanceList attendees={sortedAndFilteredAttendees} totalAttendees={attendanceList.length} onDelete={handleDeleteRequest} />
          </div>
        </main>
        
        <footer className="text-center mt-12 text-slate-600">
            <p>&copy; {new Date().getFullYear()} QR Attendance App. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;