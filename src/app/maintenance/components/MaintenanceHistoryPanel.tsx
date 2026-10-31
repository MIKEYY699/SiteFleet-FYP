'use client';
import React from 'react';
import { X, Clock, Wrench, User, Calendar } from 'lucide-react';
import { MaintenanceRecord } from '@/lib/maintenanceTypes';
import { useAppSettings } from '@/lib/AppSettingsContext';

interface Props {
  machineId: string;
  records: MaintenanceRecord[];
  onClose: () => void;
}

export default function MaintenanceHistoryPanel({ machineId, records, onClose }: Props) {
  const { money } = useAppSettings();
  const machineRecords = records
    .filter(r => r.machineId === machineId)
    .sort((a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime());

  const machineName = machineRecords[0]?.machineName ?? machineId;

  const STATUS_CLS: Record<string, string> = {
    Active: 'maint-good',
    Due: 'maint-due-soon',
    Overdue: 'maint-overdue',
  };

  const TYPE_CLS: Record<string, string> = {
    Routine: 'bg-primary/10 text-primary',
    Repair: 'bg-warning/10 text-idle',
    Emergency: 'bg-danger/10 text-danger',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card rounded-xl card-shadow-md border border-border scale-in max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-700 text-foreground">Maintenance History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{machineName} · {machineId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {machineRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No maintenance history found.</div>
          ) : (
            <div className="space-y-4">
              {machineRecords.map((r, idx) => (
                <div key={r.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-primary' : 'bg-muted border border-border'}`}>
                    <Wrench size={10} className={idx === 0 ? 'text-white' : 'text-muted-foreground'} />
                  </div>
                  {idx < machineRecords.length - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                  )}

                  <div className="bg-muted/40 rounded-lg border border-border p-4 mb-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${TYPE_CLS[r.maintenanceType]}`}>
                          {r.maintenanceType}
                        </span>
                        <span className="font-600 text-sm text-foreground">{r.partRepairedOrReplaced}</span>
                      </div>
                      <span className={`text-2xs font-600 px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_CLS[r.status]}`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">{r.descriptionOfWork}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar size={11} />
                        <span>{r.maintenanceDate}</span>
                      </div>
                      {r.technicianName && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User size={11} />
                          <span>{r.technicianName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock size={11} />
                        <span>Limit: <span className="font-600 text-foreground">{r.recommendedHoursUntilNext}h</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock size={11} />
                        <span>At: <span className="font-600 text-foreground">{r.hoursAtMaintenance}h</span></span>
                      </div>
                    </div>

                    {r.costOfMaintenance && (
                      <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                        Cost: <span className="font-600 text-foreground">{money(r.costOfMaintenance)}</span>
                        {r.remarks && <span className="ml-3">· {r.remarks}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
