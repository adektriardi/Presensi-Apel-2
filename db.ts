import { Attendee } from './types';

const DB_NAME = 'AttendanceDB';
const STORE_NAME = 'attendees';
const DB_VERSION = 1;

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(true);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', request.error);
      reject('Database error');
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'NIK' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const addAttendee = (attendee: Attendee): Promise<Attendee> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject('DB not initialized');
    }
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(attendee);

    request.onsuccess = () => {
      resolve(attendee);
    };

    request.onerror = () => {
      console.error('Error adding attendee:', request.error);
      reject('Error adding attendee');
    };
  });
};

export const getAllAttendees = (): Promise<Attendee[]> => {
  return new Promise((resolve, reject) => {
     if (!db) {
      return reject('DB not initialized');
    }
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by timestamp descending
      const sorted = request.result.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      resolve(sorted);
    };

    request.onerror = () => {
      console.error('Error getting all attendees:', request.error);
      reject('Error getting all attendees');
    };
  });
};

export const deleteAttendee = (nik: string): Promise<string> => {
  return new Promise((resolve, reject) => {
     if (!db) {
      return reject('DB not initialized');
    }
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(nik);

    request.onsuccess = () => {
      resolve(nik);
    };

    request.onerror = () => {
      console.error('Error deleting attendee:', request.error);
      reject('Error deleting attendee');
    };
  });
};

export const clearAttendees = (): Promise<void> => {
  return new Promise((resolve, reject) => {
     if (!db) {
      return reject('DB not initialized');
    }
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error clearing attendees:', request.error);
      reject('Error clearing attendees');
    };
  });
};
