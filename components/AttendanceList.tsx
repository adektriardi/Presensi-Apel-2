import React from 'react';
import { Attendee } from '../types';
import { CheckCircleIcon, UserIcon, SearchIcon, TrashIcon } from './icons';

interface AttendanceListProps {
  attendees: Attendee[];
  totalAttendees: number;
  onDelete: (nik: string) => void;
}

const AttendanceList: React.FC<AttendanceListProps> = ({ attendees, totalAttendees, onDelete }) => {
  if (totalAttendees === 0) {
    return (
      <div className="text-center py-10 px-4">
        <UserIcon className="mx-auto w-12 h-12 text-slate-500" />
        <h3 className="mt-2 text-lg font-medium text-slate-400">No attendees yet</h3>
        <p className="mt-1 text-sm text-slate-500">Start scanning to add people to the list.</p>
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <SearchIcon className="mx-auto w-12 h-12 text-slate-500" />
        <h3 className="mt-2 text-lg font-medium text-slate-400">No Results Found</h3>
        <p className="mt-1 text-sm text-slate-500">Your search did not match any attendees.</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {attendees.map((attendee, attendeeIdx) => (
          <li key={attendee.NIK}>
            <div className="relative pb-8">
              {attendeeIdx !== attendees.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-700" aria-hidden="true" />
              ) : null}
              <div className="relative flex items-start space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-slate-800">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between items-center">
                    <div>
                        <p className="text-md text-slate-200">
                            {attendee.Nama} <span className="font-mono text-sm text-slate-400">(NIK: {attendee.NIK})</span>
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Checked in at {attendee.timestamp.toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={() => onDelete(attendee.NIK)}
                        className="p-2 rounded-full text-slate-400 hover:bg-red-900/50 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 transition-colors"
                        aria-label={`Delete ${attendee.Nama}`}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AttendanceList;